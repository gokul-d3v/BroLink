package main

import (
	"brolink-server/app"
	"brolink-server/config"
	"brolink-server/db"
	"brolink-server/middleware"
	"brolink-server/routes"
	"context"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/compress"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()
	cfg := config.Load()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	mongo, err := db.Connect(ctx, cfg.MongoDBURI)
	if err != nil {
		log.Fatalf("MongoDB init failed: %v", err)
	}
	if err := mongo.EnsureIndexes(ctx); err != nil {
		log.Fatalf("MongoDB index init failed: %v", err)
	}

	redisClient, err := db.ConnectRedis(cfg.RedisURL)
	if err != nil {
		log.Fatalf("Redis init failed: %v", err)
	}

	state := &app.State{
		Config: cfg,
		Mongo:  mongo,
		Redis:  redisClient,
	}

	app := fiber.New(fiber.Config{
		BodyLimit:   20 * 1024 * 1024,
		ProxyHeader: fiber.HeaderXForwardedFor,
	})

	app.Use(compress.New(compress.Config{
		Level: compress.LevelBestSpeed,
	}))
	app.Use(middleware.Timing())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     strings.Join(cfg.AllowedOrigins, ","),
		AllowCredentials: true,
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Content-Type, Authorization",
	}))

	uploadsDir := filepath.Join(".", "uploads")
	if err := os.MkdirAll(uploadsDir, 0o755); err != nil {
		log.Fatalf("Failed to prepare uploads directory: %v", err)
	}

	app.Use("/uploads", filesystem.New(filesystem.Config{
		Root:   http.Dir(uploadsDir),
		Browse: false,
	}))

	api := app.Group("/api")
	routes.Register(api, state, uploadsDir)

	log.Printf("Server listening on :%s", cfg.Port)
	log.Fatal(app.Listen(":" + cfg.Port))
}
