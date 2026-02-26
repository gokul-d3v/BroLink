package routes

import (
	"brolink-server/app"
	"brolink-server/controllers"
	"brolink-server/middleware"

	"github.com/gofiber/fiber/v2"
)

func RegisterAnalytics(router fiber.Router, state *app.State) {
	ac := &controllers.AnalyticsController{State: state}

	// Public — records a click event
	router.Post("/clicks", ac.RecordClick)

	// Auth-protected analytics endpoints
	router.Get("/analytics", middleware.RequireAuth(state.Config), ac.GetAnalytics)
	router.Get("/analytics/timeline", middleware.RequireAuth(state.Config), ac.GetTimeline)
	router.Get("/analytics/referrers", middleware.RequireAuth(state.Config), ac.GetReferrers)
	router.Get("/analytics/devices", middleware.RequireAuth(state.Config), ac.GetDevices)
	router.Get("/analytics/geo", middleware.RequireAuth(state.Config), ac.GetGeo)
	router.Get("/analytics/logs", middleware.RequireAuth(state.Config), ac.GetClickLogs)
	router.Get("/analytics/locations", middleware.RequireAuth(state.Config), ac.GetLocations)
}
