package routes

import (
	"brolink-server/app"

	"github.com/gofiber/fiber/v2"
)

func Register(api fiber.Router, state *app.State, uploadsDir string) {
	RegisterAuth(api, state)
	RegisterBento(api, state)
	RegisterMetadata(api, state)
	RegisterUpload(api, state, uploadsDir)
	RegisterAdmin(api, state)
	RegisterAnalytics(api, state)
}
