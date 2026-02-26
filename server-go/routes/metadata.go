package routes

import (
	"brolink-server/app"
	"brolink-server/controllers"

	"github.com/gofiber/fiber/v2"
)

func RegisterMetadata(router fiber.Router, state *app.State) {
	metadataController := &controllers.MetadataController{State: state}

	router.Post("/metadata", metadataController.FetchMetadata)
}
