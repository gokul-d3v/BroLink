package controllers

import (
	"brolink-server/app"
	"brolink-server/middleware"
	"brolink-server/models"
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type AdminController struct {
	State *app.State
}

type blockPayload struct {
	IsBlocked bool `json:"is_blocked"`
}

func (ac *AdminController) GetUsers(c *fiber.Ctx) error {
	userCtx, ok := middleware.CurrentUser(c)
	if !ok || userCtx.Role != "super-admin" {
		return respondError(c, fiber.StatusForbidden, "Admin access required")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := ac.State.Mongo.Users().Find(ctx, bson.M{})
	if err != nil {
		return respondError(c, fiber.StatusInternalServerError, "Fetch failed")
	}
	defer cursor.Close(ctx)

	users := make([]models.AdminUser, 0)
	for cursor.Next(ctx) {
		var user models.User
		if err := cursor.Decode(&user); err != nil {
			return respondError(c, fiber.StatusInternalServerError, "Fetch failed")
		}
		users = append(users, user.Admin())
	}
	if err := cursor.Err(); err != nil {
		return respondError(c, fiber.StatusInternalServerError, "Fetch failed")
	}

	return c.JSON(users)
}

func (ac *AdminController) BlockUser(c *fiber.Ctx) error {
	userCtx, ok := middleware.CurrentUser(c)
	if !ok || userCtx.Role != "super-admin" {
		return respondError(c, fiber.StatusForbidden, "Admin access required")
	}

	id := c.Params("id")
	if id == "" {
		return respondError(c, fiber.StatusBadRequest, "Invalid id")
	}
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return respondError(c, fiber.StatusBadRequest, "Invalid id")
	}

	var payload blockPayload
	if err := c.BodyParser(&payload); err != nil {
		return respondError(c, fiber.StatusBadRequest, "Invalid payload")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var updated models.User
	err = ac.State.Mongo.Users().FindOneAndUpdate(
		ctx,
		bson.M{"_id": objID},
		bson.M{"$set": bson.M{"is_blocked": payload.IsBlocked}},
		opts,
	).Decode(&updated)
	if err == mongo.ErrNoDocuments {
		return respondError(c, fiber.StatusNotFound, "User not found")
	}
	if err != nil {
		return respondError(c, fiber.StatusInternalServerError, "Update failed")
	}

	return c.JSON(updated.Admin())
}
