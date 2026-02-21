package routes

import (
	"brolink-server/app"
	"brolink-server/middleware"
	"brolink-server/services"
	"context"
	"fmt"
	"io"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/utils"
)

type deletePayload struct {
	URL string `json:"url"`
}

type uploadResponse struct {
	Message  string `json:"message"`
	URL      string `json:"url"`
	Filename string `json:"filename"`
}

func RegisterUpload(router fiber.Router, state *app.State, uploadsDir string) {
	router.Post("/upload", middleware.RequireAuth(state.Config), func(c *fiber.Ctx) error {
		_, ok := middleware.CurrentUser(c)
		if !ok {
			return respondError(c, fiber.StatusUnauthorized, "Unauthorized")
		}

		fileHeader, err := c.FormFile("file")
		if err != nil {
			return respondError(c, fiber.StatusBadRequest, "No file uploaded")
		}
		if fileHeader.Size > 15*1024*1024 {
			return respondError(c, fiber.StatusBadRequest, "File too large")
		}

		if state.Config.CloudinaryConfigured() {
			file, err := fileHeader.Open()
			if err != nil {
				return respondError(c, fiber.StatusBadRequest, "No file uploaded")
			}
			defer file.Close()

			limited := io.LimitReader(file, 15*1024*1024+1)
			buffer, err := io.ReadAll(limited)
			if err != nil {
				return respondError(c, fiber.StatusInternalServerError, "Failed to read file")
			}
			if int64(len(buffer)) > 15*1024*1024 {
				return respondError(c, fiber.StatusBadRequest, "File too large")
			}

			mime := fileHeader.Header.Get("Content-Type")
			client, err := services.NewCloudinaryClient(state.Config)
			if err == nil {
				ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
				defer cancel()
				if upload, err := client.UploadImage(ctx, buffer, mime); err == nil {
					return c.JSON(uploadResponse{
						Message:  "File uploaded successfully",
						URL:      upload.SecureURL,
						Filename: upload.PublicID,
					})
				}
			}
		}

		if err := os.MkdirAll(uploadsDir, 0o755); err != nil {
			return respondError(c, fiber.StatusInternalServerError, "Failed to prepare uploads directory")
		}

		filename := localFilename(fileHeader.Filename)
		savePath := filepath.Join(uploadsDir, filename)
		if err := c.SaveFile(fileHeader, savePath); err != nil {
			return respondError(c, fiber.StatusInternalServerError, "Failed to write file")
		}

		host := c.Get("Host")
		if host == "" {
			host = c.Hostname()
		}
		url := fmt.Sprintf("%s://%s/uploads/%s", c.Protocol(), host, filename)

		return c.JSON(uploadResponse{
			Message:  "File uploaded successfully",
			URL:      url,
			Filename: filename,
		})
	})

	router.Post("/upload/delete", middleware.RequireAuth(state.Config), func(c *fiber.Ctx) error {
		_, ok := middleware.CurrentUser(c)
		if !ok {
			return respondError(c, fiber.StatusUnauthorized, "Unauthorized")
		}

		var payload deletePayload
		if err := c.BodyParser(&payload); err != nil {
			return respondError(c, fiber.StatusBadRequest, "Invalid payload")
		}
		if payload.URL == "" {
			return respondError(c, fiber.StatusBadRequest, "No URL provided")
		}

		parsed, err := url.Parse(payload.URL)
		if err != nil {
			return respondError(c, fiber.StatusBadRequest, "Invalid URL format")
		}

		if state.Config.CloudinaryConfigured() {
			client, err := services.NewCloudinaryClient(state.Config)
			if err == nil {
				publicID := cloudinaryPublicID(parsed)
				if publicID == "" {
					return respondError(c, fiber.StatusBadRequest, "Invalid URL format")
				}
				ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
				defer cancel()
				if err := client.DeleteImage(ctx, publicID); err != nil {
					return respondError(c, fiber.StatusInternalServerError, "Failed to delete image")
				}
				return c.JSON(fiber.Map{"message": "Image deleted successfully"})
			}
		}

		filename := filepath.Base(parsed.Path)
		if filename != "" {
			_ = os.Remove(filepath.Join(uploadsDir, filename))
		}

		return c.JSON(fiber.Map{"message": "Image deleted successfully"})
	})
}

func localFilename(original string) string {
	ext := filepath.Ext(original)
	name := strings.TrimSuffix(filepath.Base(original), ext)
	random := utils.UUIDv4()
	if ext == "" {
		ext = ".bin"
	}
	timestamp := time.Now().UnixMilli()
	return fmt.Sprintf("%d_%s_%s%s", timestamp, strings.ReplaceAll(name, " ", "_"), random, ext)
}

func cloudinaryPublicID(parsed *url.URL) string {
	parts := strings.Split(strings.Trim(parsed.Path, "/"), "/")
	if len(parts) < 2 {
		return ""
	}
	filename := parts[len(parts)-1]
	folder := parts[len(parts)-2]
	name := strings.TrimSuffix(filename, filepath.Ext(filename))
	if name == "" {
		return ""
	}
	return fmt.Sprintf("%s/%s", folder, name)
}
