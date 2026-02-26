package controllers

import (
	"brolink-server/app"
	"brolink-server/services"
	"context"
	"crypto/sha1"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

type MetadataController struct {
	State *app.State
}

type metadataPayload struct {
	URL string `json:"url"`
}

func (mc *MetadataController) FetchMetadata(c *fiber.Ctx) error {
	var payload metadataPayload
	if err := c.BodyParser(&payload); err != nil {
		return respondError(c, fiber.StatusBadRequest, "Invalid payload")
	}
	payload.URL = strings.TrimSpace(payload.URL)
	if payload.URL == "" {
		return respondError(c, fiber.StatusBadRequest, "URL is required")
	}

	cacheKey := fmt.Sprintf("metadata:%x", sha1.Sum([]byte(payload.URL)))
	if mc.State != nil && mc.State.Redis != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
		defer cancel()
		var cached services.Metadata
		if ok, _ := mc.State.Redis.GetJSON(ctx, cacheKey, &cached); ok {
			return c.JSON(cached)
		}
	}

	data, err := services.FetchMetadata(payload.URL)
	if err != nil {
		return respondError(c, fiber.StatusInternalServerError, "Failed to fetch metadata")
	}
	if mc.State != nil && mc.State.Redis != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
		defer cancel()
		_ = mc.State.Redis.SetJSON(ctx, cacheKey, data, 6*time.Hour)
	}
	return c.JSON(data)
}
