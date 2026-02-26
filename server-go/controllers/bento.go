package controllers

import (
	"brolink-server/app"
	"brolink-server/middleware"
	"brolink-server/models"
	"context"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type BentoController struct {
	State *app.State
}

type syncPayload struct {
	Widgets []models.Widget        `json:"widgets"`
	Layouts map[string]interface{} `json:"layouts"`
}

func (bc *BentoController) GetBento(c *fiber.Ctx) error {
	username := c.Params("username")
	if username == "" {
		return respondError(c, fiber.StatusBadRequest, "Username is required")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user models.User
	err := bc.State.Mongo.Users().FindOne(ctx, bson.M{"username": username}).Decode(&user)
	if err == mongo.ErrNoDocuments {
		return respondError(c, fiber.StatusNotFound, "User not found")
	}
	if err != nil {
		return respondError(c, fiber.StatusInternalServerError, "Fetch failed")
	}

	if user.IsBlocked {
		return respondError(c, fiber.StatusForbidden, "User is blocked")
	}

	cacheKey := fmt.Sprintf("bento:%s", username)
	if bc.State.Redis != nil {
		var cached models.BentoConfig
		if ok, _ := bc.State.Redis.GetJSON(ctx, cacheKey, &cached); ok {
			return c.JSON(cached)
		}
	}

	var config models.BentoConfig
	err = bc.State.Mongo.BentoConfigs().FindOne(ctx, bson.M{"username": username}).Decode(&config)
	if err == mongo.ErrNoDocuments {
		config = models.BentoConfig{
			User:     user.ID,
			Username: username,
			Widgets:  []models.Widget{},
			Layouts:  map[string]interface{}{},
		}
	} else if err != nil {
		return respondError(c, fiber.StatusInternalServerError, "Fetch failed")
	}

	if bc.State.Redis != nil {
		_ = bc.State.Redis.SetJSON(ctx, cacheKey, &config, 60*time.Second)
	}

	return c.JSON(config)
}

func (bc *BentoController) SyncBento(c *fiber.Ctx) error {
	userCtx, ok := middleware.CurrentUser(c)
	if !ok {
		return respondError(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	var payload syncPayload
	if err := c.BodyParser(&payload); err != nil {
		return respondError(c, fiber.StatusBadRequest, "Invalid payload")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var dbUser models.User
	err := bc.State.Mongo.Users().FindOne(ctx, bson.M{"_id": userCtx.ID}).Decode(&dbUser)
	if err == mongo.ErrNoDocuments {
		return respondError(c, fiber.StatusNotFound, "User not found")
	}
	if err != nil {
		return respondError(c, fiber.StatusInternalServerError, "Fetch failed")
	}

	now := time.Now()
	update := bson.M{
		"$set": bson.M{
			"username":  dbUser.Username,
			"widgets":   payload.Widgets,
			"layouts":   payload.Layouts,
			"updatedAt": primitive.NewDateTimeFromTime(now),
		},
		"$setOnInsert": bson.M{
			"user":      userCtx.ID,
			"createdAt": primitive.NewDateTimeFromTime(now),
		},
	}

	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)
	var updated models.BentoConfig
	err = bc.State.Mongo.BentoConfigs().FindOneAndUpdate(ctx, bson.M{"user": userCtx.ID}, update, opts).Decode(&updated)
	if err != nil {
		return respondError(c, fiber.StatusInternalServerError, "Sync failed")
	}

	if bc.State.Redis != nil {
		_ = bc.State.Redis.Del(ctx, fmt.Sprintf("bento:%s", dbUser.Username))
	}

	return c.JSON(updated)
}
