package middleware

import (
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

func Timing() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()
		err := c.Next()
		duration := time.Since(start)

		if strings.HasPrefix(c.Path(), "/uploads/") && c.Response().StatusCode() < 400 {
			c.Set("Cache-Control", "public, max-age=31536000, immutable")
		}

		fmt.Printf("[%s] %s %s -> %d (%.2f ms)\n",
			time.Now().UTC().Format(time.RFC3339),
			c.Method(),
			c.OriginalURL(),
			c.Response().StatusCode(),
			float64(duration.Microseconds())/1000.0,
		)

		return err
	}
}
