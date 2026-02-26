package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ClickEvent is stored for every widget link click.
type ClickEvent struct {
	ID             primitive.ObjectID `bson:"_id,omitempty"        json:"id"`
	WidgetID       string             `bson:"widget_id"            json:"widget_id"`
	OwnerUsername  string             `bson:"owner_username"       json:"owner_username"`
	URL            string             `bson:"url"                  json:"url"`
	CustomTitle    string             `bson:"custom_title,omitempty"  json:"custom_title,omitempty"`
	CustomImage    string             `bson:"custom_image,omitempty"  json:"custom_image,omitempty"`
	IPHash         string             `bson:"ip_hash"              json:"ip_hash"`
	ReferrerDomain string             `bson:"referrer_domain"      json:"referrer_domain"`
	DeviceType     string             `bson:"device_type"          json:"device_type"` // mobile | tablet | desktop | bot
	Country        string             `bson:"country,omitempty"    json:"country,omitempty"`
	CountryCode    string             `bson:"country_code,omitempty" json:"country_code,omitempty"`
	Region         string             `bson:"region,omitempty"     json:"region,omitempty"`
	City           string             `bson:"city,omitempty"       json:"city,omitempty"`
	ClickedAt      time.Time          `bson:"clicked_at"           json:"clicked_at"`
}

// WidgetClickStat is the per-widget aggregation result.
type WidgetClickStat struct {
	WidgetID    string `bson:"_id"          json:"widget_id"`
	URL         string `bson:"url"          json:"url"`
	CustomTitle string `bson:"custom_title" json:"custom_title"`
	CustomImage string `bson:"custom_image" json:"custom_image"`
	Total       int64  `bson:"total"        json:"total"`
	Unique      int64  `bson:"unique"       json:"unique"`
}

// TimelinePoint is one day's click total.
type TimelinePoint struct {
	Date  string `bson:"_id"   json:"date"` // "2024-02-25"
	Total int64  `bson:"total" json:"total"`
}

// ReferrerStat groups clicks by referrer domain.
type ReferrerStat struct {
	Domain string `bson:"_id"   json:"domain"`
	Count  int64  `bson:"count" json:"count"`
}

// DeviceStat groups clicks by device type.
type DeviceStat struct {
	DeviceType string `bson:"_id"   json:"device_type"`
	Count      int64  `bson:"count" json:"count"`
}

// GeoStat groups clicks by location.
type GeoStat struct {
	ID struct {
		City    string `bson:"city"`
		Region  string `bson:"region"`
		Country string `bson:"country"`
	} `bson:"_id" json:"-"`
	Location    string `bson:"-"            json:"location"`
	CountryCode string `bson:"country_code" json:"country_code"`
	Count       int64  `bson:"count"        json:"count"`
}
