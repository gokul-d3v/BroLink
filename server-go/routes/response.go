package routes

import "github.com/gofiber/fiber/v2"

func respondError(c *fiber.Ctx, status int, message string) error {
	return c.Status(status).JSON(fiber.Map{"message": message})
}
