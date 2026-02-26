package routes

import (
	"brolink-server/app"
	"brolink-server/controllers"
	"brolink-server/middleware"

	"github.com/gofiber/fiber/v2"
)

func RegisterBento(router fiber.Router, state *app.State) {
	bentoController := &controllers.BentoController{State: state}

	router.Get("/bento/:username", bentoController.GetBento)
	router.Post("/bento/sync", middleware.RequireAuth(state.Config), bentoController.SyncBento)
}
