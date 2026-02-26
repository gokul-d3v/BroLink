package controllers

import (
	"brolink-server/app"
	"brolink-server/middleware"
	"brolink-server/models"
	"brolink-server/services"
	"context"
	"crypto/sha256"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type AnalyticsController struct {
	State *app.State
}

type clickPayload struct {
	WidgetID      string `json:"widget_id"`
	OwnerUsername string `json:"owner_username"`
	URL           string `json:"url"`
	CustomTitle   string `json:"custom_title"`
	CustomImage   string `json:"custom_image"`
	Referrer      string `json:"referrer"`
}

// classifyDevice returns "mobile", "tablet", "bot", or "desktop".
func classifyDevice(ua string) string {
	lower := strings.ToLower(ua)
	bots := []string{"bot", "crawler", "spider", "slurp", "curl", "wget", "python", "go-http"}
	for _, b := range bots {
		if strings.Contains(lower, b) {
			return "bot"
		}
	}
	if strings.Contains(lower, "ipad") || strings.Contains(lower, "tablet") || strings.Contains(lower, "kindle") {
		return "tablet"
	}
	if strings.Contains(lower, "mobile") || strings.Contains(lower, "android") ||
		strings.Contains(lower, "iphone") || strings.Contains(lower, "ipod") ||
		strings.Contains(lower, "windows phone") {
		return "mobile"
	}
	return "desktop"
}

// referrerDomain extracts the domain from a referrer URL, or returns "Direct".
func referrerDomain(ref string) string {
	ref = strings.TrimSpace(ref)
	if ref == "" {
		return "Direct"
	}
	u, err := url.Parse(ref)
	if err != nil {
		return "Direct"
	}
	host := strings.TrimPrefix(u.Hostname(), "www.")
	if host == "" {
		return "Direct"
	}
	return host
}

func (ac *AnalyticsController) RecordClick(c *fiber.Ctx) error {
	var payload clickPayload
	if err := c.BodyParser(&payload); err != nil {
		return respondError(c, fiber.StatusBadRequest, "Invalid payload")
	}
	payload.WidgetID = strings.TrimSpace(payload.WidgetID)
	payload.OwnerUsername = strings.TrimSpace(payload.OwnerUsername)
	if payload.WidgetID == "" || payload.OwnerUsername == "" {
		return respondError(c, fiber.StatusBadRequest, "widget_id and owner_username are required")
	}

	// Capture request metadata
	ip := c.IP()
	ipHash := fmt.Sprintf("%x", sha256.Sum256([]byte(ip)))
	ua := c.Get("User-Agent")
	device := classifyDevice(ua)
	refDomain := referrerDomain(payload.Referrer)

	event := models.ClickEvent{
		WidgetID:       payload.WidgetID,
		OwnerUsername:  payload.OwnerUsername,
		URL:            payload.URL,
		CustomTitle:    payload.CustomTitle,
		CustomImage:    payload.CustomImage,
		IPHash:         ipHash,
		ReferrerDomain: refDomain,
		DeviceType:     device,
		ClickedAt:      time.Now(),
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	res, err := ac.State.Mongo.Clicks().InsertOne(ctx, event)
	if err != nil {
		return respondError(c, fiber.StatusInternalServerError, "Failed to record click")
	}

	// Async geo lookup — update the document after insertion
	insertedID := res.InsertedID
	go func() {
		geo := services.LookupGeo(ip)
		if geo.Country == "" {
			return
		}
		bgCtx, bgCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer bgCancel()
		_, _ = ac.State.Mongo.Clicks().UpdateByID(bgCtx, insertedID, bson.M{
			"$set": bson.M{
				"country":      geo.Country,
				"country_code": geo.CountryCode,
				"region":       geo.RegionName,
				"city":         geo.City,
			},
		})
	}()

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "Click recorded"})
}

// ownerUsername resolves the logged-in user's username.
func (ac *AnalyticsController) ownerUsername(c *fiber.Ctx) (string, error) {
	userCtx, ok := middleware.CurrentUser(c)
	if !ok {
		return "", fmt.Errorf("unauthorized")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var u struct {
		Username string `bson:"username"`
	}
	if err := ac.State.Mongo.Users().FindOne(ctx, bson.M{"_id": userCtx.ID}).Decode(&u); err != nil {
		return "", fmt.Errorf("user not found")
	}
	return u.Username, nil
}

func (ac *AnalyticsController) buildFilters(c *fiber.Ctx, username string) bson.M {
	match := bson.M{"owner_username": username}

	// Date Filtering
	startStr := c.Query("start")
	endStr := c.Query("end")
	if startStr != "" || endStr != "" {
		dateQ := bson.M{}
		if startStr != "" && startStr != "null" {
			if t, err := time.Parse(time.RFC3339, startStr); err == nil {
				dateQ["$gte"] = t
			}
		}
		if endStr != "" && endStr != "null" {
			if t, err := time.Parse(time.RFC3339, endStr); err == nil {
				dateQ["$lte"] = t
			}
		}
		if len(dateQ) > 0 {
			match["clicked_at"] = dateQ
		}
	}

	// Location Filtering
	country := c.Query("country")
	if country != "" && country != "null" {
		match["country"] = country
	}
	region := c.Query("region")
	if region != "" && region != "null" {
		match["region"] = region
	}

	return match
}

// GetAnalytics returns per-widget total and unique click counts.
func (ac *AnalyticsController) GetAnalytics(c *fiber.Ctx) error {
	username, err := ac.ownerUsername(c)
	if err != nil {
		return respondError(c, fiber.StatusUnauthorized, err.Error())
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	match := ac.buildFilters(c, username)

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: match}},
		{{Key: "$group", Value: bson.M{
			"_id":          "$widget_id",
			"url":          bson.M{"$first": "$url"},
			"custom_title": bson.M{"$first": "$custom_title"},
			"custom_image": bson.M{"$first": "$custom_image"},
			"total":        bson.M{"$sum": 1},
			"unique_ips":   bson.M{"$addToSet": "$ip_hash"},
		}}},
		{{Key: "$addFields", Value: bson.M{"unique": bson.M{"$size": "$unique_ips"}}}},
		{{Key: "$project", Value: bson.M{"unique_ips": 0}}},
		{{Key: "$sort", Value: bson.M{"total": -1}}},
	}

	cursor, err := ac.State.Mongo.Clicks().Aggregate(ctx, pipeline)
	if err != nil {
		return respondError(c, fiber.StatusInternalServerError, "Failed to fetch analytics")
	}
	defer cursor.Close(ctx)

	stats := make([]models.WidgetClickStat, 0)
	if err := cursor.All(ctx, &stats); err != nil {
		return respondError(c, fiber.StatusInternalServerError, "Failed to decode analytics")
	}
	return c.JSON(stats)
}

// GetTimeline returns click counts per time bucket.
// ?mode=hourly → last 24 h, grouped by "HH:00"
// ?days=7|30   → last N days, grouped by "YYYY-MM-DD" (default 7)
func (ac *AnalyticsController) GetTimeline(c *fiber.Ctx) error {
	username, err := ac.ownerUsername(c)
	if err != nil {
		return respondError(c, fiber.StatusUnauthorized, err.Error())
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	match := ac.buildFilters(c, username)
	var dateFormat string

	startStr := c.Query("start")
	endStr := c.Query("end")

	if startStr != "" && endStr != "" && startStr != "null" && endStr != "null" {
		st, _ := time.Parse(time.RFC3339, startStr)
		en, _ := time.Parse(time.RFC3339, endStr)
		if en.Sub(st) <= 48*time.Hour {
			dateFormat = "%Y-%m-%d %H:00"
		} else {
			dateFormat = "%Y-%m-%d"
		}
	} else if c.Query("mode") == "hourly" {
		since := time.Now().UTC().Add(-24 * time.Hour)
		match["clicked_at"] = bson.M{"$gte": since}
		dateFormat = "%Y-%m-%d %H:00"
	} else {
		days := 7
		if c.Query("days") == "30" {
			days = 30
		}
		since := time.Now().UTC().AddDate(0, 0, -days)
		match["clicked_at"] = bson.M{"$gte": since}
		dateFormat = "%Y-%m-%d"
	}

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: match}},
		{{Key: "$group", Value: bson.M{
			"_id": bson.M{
				"$dateToString": bson.M{
					"format": dateFormat,
					"date":   "$clicked_at",
				},
			},
			"total": bson.M{"$sum": 1},
		}}},
		{{Key: "$sort", Value: bson.M{"_id": 1}}},
	}

	cursor, err := ac.State.Mongo.Clicks().Aggregate(ctx, pipeline)
	if err != nil {
		return respondError(c, fiber.StatusInternalServerError, "Failed to fetch timeline")
	}
	defer cursor.Close(ctx)

	points := make([]models.TimelinePoint, 0)
	if err := cursor.All(ctx, &points); err != nil {
		return respondError(c, fiber.StatusInternalServerError, "Failed to decode timeline")
	}
	return c.JSON(points)
}

// GetReferrers returns click counts grouped by referrer domain.
func (ac *AnalyticsController) GetReferrers(c *fiber.Ctx) error {
	username, err := ac.ownerUsername(c)
	if err != nil {
		return respondError(c, fiber.StatusUnauthorized, err.Error())
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	match := ac.buildFilters(c, username)

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: match}},
		{{Key: "$group", Value: bson.M{
			"_id":   "$referrer_domain",
			"count": bson.M{"$sum": 1},
		}}},
		{{Key: "$sort", Value: bson.M{"count": -1}}},
		{{Key: "$limit", Value: 20}},
	}

	cursor, err := ac.State.Mongo.Clicks().Aggregate(ctx, pipeline)
	if err != nil {
		return respondError(c, fiber.StatusInternalServerError, "Failed to fetch referrers")
	}
	defer cursor.Close(ctx)

	stats := make([]models.ReferrerStat, 0)
	if err := cursor.All(ctx, &stats); err != nil {
		return respondError(c, fiber.StatusInternalServerError, "Failed to decode referrers")
	}
	return c.JSON(stats)
}

// GetDevices returns click counts grouped by device type.
func (ac *AnalyticsController) GetDevices(c *fiber.Ctx) error {
	username, err := ac.ownerUsername(c)
	if err != nil {
		return respondError(c, fiber.StatusUnauthorized, err.Error())
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	match := ac.buildFilters(c, username)

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: match}},
		{{Key: "$group", Value: bson.M{
			"_id":   "$device_type",
			"count": bson.M{"$sum": 1},
		}}},
		{{Key: "$sort", Value: bson.M{"count": -1}}},
	}

	cursor, err := ac.State.Mongo.Clicks().Aggregate(ctx, pipeline)
	if err != nil {
		return respondError(c, fiber.StatusInternalServerError, "Failed to fetch devices")
	}
	defer cursor.Close(ctx)

	stats := make([]models.DeviceStat, 0)
	if err := cursor.All(ctx, &stats); err != nil {
		return respondError(c, fiber.StatusInternalServerError, "Failed to decode devices")
	}
	return c.JSON(stats)
}

// GetGeo returns click counts grouped by country.
func (ac *AnalyticsController) GetGeo(c *fiber.Ctx) error {
	username, err := ac.ownerUsername(c)
	if err != nil {
		return respondError(c, fiber.StatusUnauthorized, err.Error())
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	match := ac.buildFilters(c, username)
	if _, ok := match["country"]; !ok {
		match["country"] = bson.M{"$type": "string", "$ne": ""}
	}

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: match}},
		{{Key: "$group", Value: bson.M{
			"_id": bson.M{
				"city":    "$city",
				"region":  "$region",
				"country": "$country",
			},
			"country_code": bson.M{"$first": "$country_code"},
			"count":        bson.M{"$sum": 1},
		}}},
		{{Key: "$sort", Value: bson.M{"count": -1}}},
		{{Key: "$limit", Value: 30}},
	}

	cursor, err := ac.State.Mongo.Clicks().Aggregate(ctx, pipeline)
	if err != nil {
		return respondError(c, fiber.StatusInternalServerError, "Failed to fetch geo")
	}
	defer cursor.Close(ctx)

	stats := make([]models.GeoStat, 0)
	if err := cursor.All(ctx, &stats); err != nil {
		return respondError(c, fiber.StatusInternalServerError, "Failed to decode geo")
	}

	for i := range stats {
		if stats[i].ID.City != "" && stats[i].ID.Region != "" {
			stats[i].Location = stats[i].ID.City + ", " + stats[i].ID.Region
		} else if stats[i].ID.City != "" {
			stats[i].Location = stats[i].ID.City + ", " + stats[i].ID.Country
		} else if stats[i].ID.Region != "" {
			stats[i].Location = stats[i].ID.Region + ", " + stats[i].ID.Country
		} else if stats[i].ID.Country != "" {
			stats[i].Location = stats[i].ID.Country
		} else {
			stats[i].Location = "Unknown Location"
		}
	}

	return c.JSON(stats)
}

type ClickLogItem struct {
	ID             string    `json:"id"`
	URL            string    `json:"url"`
	DeviceType     string    `json:"device_type"`
	ReferrerDomain string    `json:"referrer_domain"`
	CountryCode    string    `json:"country_code"`
	Location       string    `json:"location"`
	ClickedAt      time.Time `json:"clicked_at"`
	Count          int       `json:"count"`
}

// GetClickLogs returns individual click events for a localized real-time feed.
func (ac *AnalyticsController) GetClickLogs(c *fiber.Ctx) error {
	username, err := ac.ownerUsername(c)
	if err != nil {
		return respondError(c, fiber.StatusUnauthorized, err.Error())
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	match := ac.buildFilters(c, username)

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: match}},
		{{Key: "$group", Value: bson.M{
			"_id": bson.M{
				"url":             "$url",
				"device_type":     "$device_type",
				"referrer_domain": "$referrer_domain",
				"country_code":    "$country_code",
				"city":            "$city",
				"region":          "$region",
				"country":         "$country",
				"date": bson.M{"$dateToString": bson.M{
					"format": "%Y-%m-%d",
					"date":   "$clicked_at",
				}},
			},
			"count":           bson.M{"$sum": 1},
			"last_clicked_at": bson.M{"$max": "$clicked_at"},
		}}},
		{{Key: "$sort", Value: bson.M{"last_clicked_at": -1}}},
		{{Key: "$limit", Value: 200}}, // Cap the feed
	}

	cursor, err := ac.State.Mongo.Clicks().Aggregate(ctx, pipeline)
	if err != nil {
		return respondError(c, fiber.StatusInternalServerError, "Failed to fetch click logs")
	}
	defer cursor.Close(ctx)

	type aggregatedClick struct {
		ID struct {
			URL            string `bson:"url"`
			DeviceType     string `bson:"device_type"`
			ReferrerDomain string `bson:"referrer_domain"`
			CountryCode    string `bson:"country_code"`
			City           string `bson:"city"`
			Region         string `bson:"region"`
			Country        string `bson:"country"`
			Date           string `bson:"date"`
		} `bson:"_id"`
		Count         int       `bson:"count"`
		LastClickedAt time.Time `bson:"last_clicked_at"`
	}

	var events []aggregatedClick
	if err := cursor.All(ctx, &events); err != nil {
		return respondError(c, fiber.StatusInternalServerError, "Failed to decode click logs")
	}

	var logs []ClickLogItem
	for i, ev := range events {
		loc := "Unknown"
		if ev.ID.City != "" && ev.ID.Region != "" {
			loc = ev.ID.City + ", " + ev.ID.Region
		} else if ev.ID.City != "" {
			loc = ev.ID.City + ", " + ev.ID.Country
		} else if ev.ID.Region != "" {
			loc = ev.ID.Region + ", " + ev.ID.Country
		} else if ev.ID.Country != "" {
			loc = ev.ID.Country
		}

		logs = append(logs, ClickLogItem{
			ID:             fmt.Sprintf("agg-%d", i),
			URL:            ev.ID.URL,
			DeviceType:     ev.ID.DeviceType,
			ReferrerDomain: ev.ID.ReferrerDomain,
			CountryCode:    ev.ID.CountryCode,
			Location:       loc,
			ClickedAt:      ev.LastClickedAt,
			Count:          ev.Count,
		})
	}

	if logs == nil {
		logs = []ClickLogItem{}
	}
	return c.JSON(logs)
}

type LocationItem struct {
	Country string   `json:"country"`
	Regions []string `json:"regions"`
}

// GetLocations returns unique countries and regions for dropdown filters.
func (ac *AnalyticsController) GetLocations(c *fiber.Ctx) error {
	username, err := ac.ownerUsername(c)
	if err != nil {
		return respondError(c, fiber.StatusUnauthorized, err.Error())
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"owner_username": username,
			"country":        bson.M{"$type": "string", "$ne": ""},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id": bson.M{
				"country": "$country",
				"region":  "$region",
			},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id": "$_id.country",
			"regions": bson.M{
				"$addToSet": "$_id.region",
			},
		}}},
		{{Key: "$sort", Value: bson.M{"_id": 1}}},
	}

	cursor, err := ac.State.Mongo.Clicks().Aggregate(ctx, pipeline)
	if err != nil {
		return respondError(c, fiber.StatusInternalServerError, "Failed to fetch locations")
	}
	defer cursor.Close(ctx)

	type locationResult struct {
		Country string   `bson:"_id"`
		Regions []string `bson:"regions"`
	}

	var results []locationResult
	if err := cursor.All(ctx, &results); err != nil {
		return respondError(c, fiber.StatusInternalServerError, "Failed to decode locations")
	}

	var parsed []LocationItem
	for _, r := range results {
		var cleanRegions []string
		for _, reg := range r.Regions {
			if reg != "" {
				cleanRegions = append(cleanRegions, reg)
			}
		}
		parsed = append(parsed, LocationItem{
			Country: r.Country,
			Regions: cleanRegions,
		})
	}

	if parsed == nil {
		parsed = []LocationItem{}
	}
	return c.JSON(parsed)
}
