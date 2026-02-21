package middleware

import (
	"brolink-server/config"
	"net/http"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AuthUser struct {
	ID   primitive.ObjectID
	Role string
}

type Claims struct {
	ID   string `json:"id"`
	Role string `json:"role"`
	jwt.RegisteredClaims
}

func RequireAuth(cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"message": "Unauthorized"})
		}

		tokenString := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
		if tokenString == "" {
			return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"message": "Unauthorized"})
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(cfg.JWTSecret), nil
		})
		if err != nil || !token.Valid {
			return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"message": "Unauthorized"})
		}

		objID, err := primitive.ObjectIDFromHex(claims.ID)
		if err != nil {
			return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"message": "Unauthorized"})
		}

		c.Locals("user", &AuthUser{ID: objID, Role: claims.Role})
		return c.Next()
	}
}

func CurrentUser(c *fiber.Ctx) (*AuthUser, bool) {
	user, ok := c.Locals("user").(*AuthUser)
	return user, ok
}
