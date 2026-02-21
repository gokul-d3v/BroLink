package routes

import (
	"brolink-server/app"
	"brolink-server/middleware"
	"brolink-server/models"
	"context"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

type authPayload struct {
	Username *string `json:"username"`
	Email    *string `json:"email"`
	Password string  `json:"password"`
}

type authUserResponse struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Role     string `json:"role"`
}

type authResponse struct {
	Token string           `json:"token"`
	User  authUserResponse `json:"user"`
}

func RegisterAuth(router fiber.Router, state *app.State) {
	router.Post("/auth/signup", func(c *fiber.Ctx) error {
		var payload authPayload
		if err := c.BodyParser(&payload); err != nil {
			return respondError(c, fiber.StatusBadRequest, "Invalid payload")
		}

		username := strings.TrimSpace(getString(payload.Username))
		email := strings.TrimSpace(getString(payload.Email))
		password := payload.Password

		if username == "" {
			return respondError(c, fiber.StatusBadRequest, "username is required")
		}
		if email == "" {
			return respondError(c, fiber.StatusBadRequest, "email is required")
		}
		if strings.TrimSpace(password) == "" {
			return respondError(c, fiber.StatusBadRequest, "password is required")
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		users := state.Mongo.Users()
		var existing models.User
		err := users.FindOne(ctx, bson.M{"$or": []bson.M{{"email": email}, {"username": username}}}).Decode(&existing)
		if err == nil {
			return respondError(c, fiber.StatusBadRequest, "User already exists")
		}
		if err != mongo.ErrNoDocuments {
			return respondError(c, fiber.StatusInternalServerError, "Signup failed")
		}

		hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			return respondError(c, fiber.StatusInternalServerError, "Hash failed")
		}

		now := primitive.NewDateTimeFromTime(time.Now())
		fullName := username
		avatar := ""
		user := models.User{
			ID:        primitive.NewObjectID(),
			Username:  username,
			Email:     email,
			Password:  string(hashed),
			FullName:  &fullName,
			AvatarURL: &avatar,
			Role:      "user",
			IsBlocked: false,
			CreatedAt: &now,
			UpdatedAt: &now,
		}

		if _, err := users.InsertOne(ctx, user); err != nil {
			return respondError(c, fiber.StatusInternalServerError, "Signup failed")
		}

		configs := state.Mongo.BentoConfigs()
		configDoc := models.BentoConfig{
			User:      user.ID,
			Username:  username,
			Widgets:   []models.Widget{},
			Layouts:   map[string]interface{}{},
			CreatedAt: &now,
			UpdatedAt: &now,
		}
		_, _ = configs.InsertOne(ctx, configDoc)

		token, err := signToken(state.Config.JWTSecret, user.ID, user.Role)
		if err != nil {
			return respondError(c, fiber.StatusInternalServerError, "Signup failed")
		}

		resp := authResponse{
			Token: token,
			User: authUserResponse{
				ID:       user.ID.Hex(),
				Username: user.Username,
				Email:    user.Email,
				Role:     user.Role,
			},
		}
		return c.Status(fiber.StatusCreated).JSON(resp)
	})

	router.Post("/auth/login", func(c *fiber.Ctx) error {
		var payload authPayload
		if err := c.BodyParser(&payload); err != nil {
			return respondError(c, fiber.StatusBadRequest, "Invalid payload")
		}

		email := strings.TrimSpace(getString(payload.Email))
		password := payload.Password
		if email == "" {
			return respondError(c, fiber.StatusBadRequest, "email is required")
		}
		if strings.TrimSpace(password) == "" {
			return respondError(c, fiber.StatusBadRequest, "password is required")
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		var user models.User
		err := state.Mongo.Users().FindOne(ctx, bson.M{"email": email}).Decode(&user)
		if err == mongo.ErrNoDocuments {
			return respondError(c, fiber.StatusBadRequest, "Invalid credentials")
		}
		if err != nil {
			return respondError(c, fiber.StatusInternalServerError, "Login failed")
		}

		if user.IsBlocked {
			return respondError(c, fiber.StatusForbidden, "Account is blocked")
		}

		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
			return respondError(c, fiber.StatusBadRequest, "Invalid credentials")
		}

		token, err := signToken(state.Config.JWTSecret, user.ID, user.Role)
		if err != nil {
			return respondError(c, fiber.StatusInternalServerError, "Login failed")
		}

		resp := authResponse{
			Token: token,
			User: authUserResponse{
				ID:       user.ID.Hex(),
				Username: user.Username,
				Email:    user.Email,
				Role:     user.Role,
			},
		}
		return c.JSON(resp)
	})

	router.Get("/auth/me", middleware.RequireAuth(state.Config), func(c *fiber.Ctx) error {
		userCtx, ok := middleware.CurrentUser(c)
		if !ok {
			return respondError(c, fiber.StatusUnauthorized, "Unauthorized")
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		var user models.User
		err := state.Mongo.Users().FindOne(ctx, bson.M{"_id": userCtx.ID}).Decode(&user)
		if err == mongo.ErrNoDocuments {
			return respondError(c, fiber.StatusNotFound, "User not found")
		}
		if err != nil {
			return respondError(c, fiber.StatusInternalServerError, "Fetch failed")
		}

		return c.JSON(user.Public())
	})
}

func signToken(secret string, id primitive.ObjectID, role string) (string, error) {
	exp := time.Now().Add(7 * 24 * time.Hour)
	claims := middleware.Claims{
		ID:   id.Hex(),
		Role: role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(exp),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func getString(val *string) string {
	if val == nil {
		return ""
	}
	return *val
}
