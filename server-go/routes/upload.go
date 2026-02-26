package routes

import (
	"brolink-server/app"
	"brolink-server/controllers"
	"brolink-server/middleware"

	"github.com/gofiber/fiber/v2"
)

func RegisterUpload(router fiber.Router, state *app.State, uploadsDir string) {
	uploadController := &controllers.UploadController{
		State:      state,
		UploadsDir: uploadsDir,
	}

	router.Post("/upload", middleware.RequireAuth(state.Config), uploadController.UploadImage)
	router.Post("/upload/delete", middleware.RequireAuth(state.Config), uploadController.DeleteImage)
}
