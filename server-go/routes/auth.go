package routes

import (
	"brolink-server/app"
	"brolink-server/controllers"
	"brolink-server/middleware"

	"github.com/gofiber/fiber/v2"
)

func RegisterAuth(router fiber.Router, state *app.State) {
	authController := &controllers.AuthController{State: state}

	router.Post("/auth/signup", authController.Signup)
	router.Post("/auth/login", authController.Login)
	router.Get("/auth/me", middleware.RequireAuth(state.Config), authController.GetMe)
}
