package config

import (
	"os"
	"sort"
	"strings"
)

type Config struct {
	MongoDBURI          string
	RedisURL            string
	JWTSecret           string
	CloudinaryCloudName string
	CloudinaryAPIKey    string
	CloudinaryAPISecret string
	AllowedOrigins      []string
	Port                string
}

func Load() *Config {
	mongoURI := getenv("MONGODB_URI", "mongodb://localhost:27017/bento")
	redisURL := getenv("REDIS_URL", "redis://127.0.0.1/")
	jwtSecret := getenv("JWT_SECRET", "secret_key")
	cloudName := os.Getenv("CLOUDINARY_CLOUD_NAME")
	cloudKey := os.Getenv("CLOUDINARY_API_KEY")
	cloudSecret := os.Getenv("CLOUDINARY_API_SECRET")

	allowed := []string{
		"https://bro-links.vercel.app",
		"https://bro-links.vercel.app/",
		"https://link.brototype.com",
		"https://link.brototype.com/",
		"http://localhost:5173",
	}
	if clientURL := strings.TrimSpace(os.Getenv("CLIENT_URL")); clientURL != "" {
		allowed = append(allowed, clientURL)
	}
	allowed = uniqueSorted(allowed)

	port := strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		port = strings.TrimSpace(os.Getenv("ROCKET_PORT"))
	}
	if port == "" {
		port = "5000"
	}

	return &Config{
		MongoDBURI:          mongoURI,
		RedisURL:            redisURL,
		JWTSecret:           jwtSecret,
		CloudinaryCloudName: cloudName,
		CloudinaryAPIKey:    cloudKey,
		CloudinaryAPISecret: cloudSecret,
		AllowedOrigins:      allowed,
		Port:                port,
	}
}

func (c *Config) CloudinaryConfigured() bool {
	return c.CloudinaryCloudName != "" && c.CloudinaryAPIKey != "" && c.CloudinaryAPISecret != ""
}

func getenv(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func uniqueSorted(values []string) []string {
	seen := map[string]struct{}{}
	unique := make([]string, 0, len(values))
	for _, v := range values {
		v = strings.TrimSpace(v)
		if v == "" {
			continue
		}
		if _, ok := seen[v]; ok {
			continue
		}
		seen[v] = struct{}{}
		unique = append(unique, v)
	}
	sort.Strings(unique)
	return unique
}
