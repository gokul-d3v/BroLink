package routes

import (
	"brolink-server/app"
	"brolink-server/controllers"
	"brolink-server/middleware"

	"github.com/gofiber/fiber/v2"
)

func RegisterAdmin(router fiber.Router, state *app.State) {
	adminController := &controllers.AdminController{State: state}

	router.Get("/admin/users", middleware.RequireAuth(state.Config), adminController.GetUsers)
	router.Post("/admin/users/:id/block", middleware.RequireAuth(state.Config), adminController.BlockUser)
}
