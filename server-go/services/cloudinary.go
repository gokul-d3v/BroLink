package services

import (
	"bytes"
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"time"

	"brolink-server/config"
)

type CloudinaryClient struct {
	CloudName string
	APIKey    string
	APISecret string
	HTTP      *http.Client
}

type CloudinaryUploadResponse struct {
	SecureURL string `json:"secure_url"`
	PublicID  string `json:"public_id"`
}

type CloudinaryError struct {
	Message string
}

func (e CloudinaryError) Error() string {
	return e.Message
}

func NewCloudinaryClient(cfg *config.Config) (*CloudinaryClient, error) {
	if !cfg.CloudinaryConfigured() {
		return nil, CloudinaryError{Message: "missing cloudinary configuration"}
	}
	return &CloudinaryClient{
		CloudName: cfg.CloudinaryCloudName,
		APIKey:    cfg.CloudinaryAPIKey,
		APISecret: cfg.CloudinaryAPISecret,
		HTTP: &http.Client{Timeout: 10 * time.Second},
	}, nil
}

func (c *CloudinaryClient) UploadImage(ctx context.Context, bytesData []byte, mime string) (*CloudinaryUploadResponse, error) {
	ts := time.Now().Unix()
	folder := "bento-widgets"
	transformation := "w_1000,c_limit"
	stringToSign := fmt.Sprintf("folder=%s&timestamp=%d&transformation=%s", folder, ts, transformation)
	signature := c.sign(stringToSign)

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	part, err := writer.CreateFormFile("file", "upload")
	if err != nil {
		return nil, err
	}
	if _, err := part.Write(bytesData); err != nil {
		return nil, err
	}

	if err := writer.WriteField("api_key", c.APIKey); err != nil {
		return nil, err
	}
	if err := writer.WriteField("timestamp", fmt.Sprintf("%d", ts)); err != nil {
		return nil, err
	}
	if err := writer.WriteField("signature", signature); err != nil {
		return nil, err
	}
	if err := writer.WriteField("folder", folder); err != nil {
		return nil, err
	}
	if err := writer.WriteField("transformation", transformation); err != nil {
		return nil, err
	}
	if err := writer.Close(); err != nil {
		return nil, err
	}

	url := fmt.Sprintf("https://api.cloudinary.com/v1_1/%s/image/upload", c.CloudName)
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, url, &body)
	if err != nil {
		return nil, err
	}
	request.Header.Set("Content-Type", writer.FormDataContentType())
	request.Header.Set("Accept", "application/json")
	if mime != "" {
		request.Header.Set("X-Upload-Content-Type", mime)
	}

	response, err := c.HTTP.Do(request)
	if err != nil {
		return nil, CloudinaryError{Message: fmt.Sprintf("request failed: %v", err)}
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, CloudinaryError{Message: fmt.Sprintf("status %d", response.StatusCode)}
	}

	var payload CloudinaryUploadResponse
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return nil, CloudinaryError{Message: fmt.Sprintf("decode failed: %v", err)}
	}

	return &payload, nil
}

func (c *CloudinaryClient) DeleteImage(ctx context.Context, publicID string) error {
	ts := time.Now().Unix()
	stringToSign := fmt.Sprintf("public_id=%s&timestamp=%d", publicID, ts)
	signature := c.sign(stringToSign)

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	if err := writer.WriteField("api_key", c.APIKey); err != nil {
		return err
	}
	if err := writer.WriteField("timestamp", fmt.Sprintf("%d", ts)); err != nil {
		return err
	}
	if err := writer.WriteField("signature", signature); err != nil {
		return err
	}
	if err := writer.WriteField("public_id", publicID); err != nil {
		return err
	}
	if err := writer.Close(); err != nil {
		return err
	}

	url := fmt.Sprintf("https://api.cloudinary.com/v1_1/%s/image/destroy", c.CloudName)
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, url, &body)
	if err != nil {
		return err
	}
	request.Header.Set("Content-Type", writer.FormDataContentType())
	request.Header.Set("Accept", "application/json")

	response, err := c.HTTP.Do(request)
	if err != nil {
		return CloudinaryError{Message: fmt.Sprintf("request failed: %v", err)}
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return CloudinaryError{Message: fmt.Sprintf("status %d", response.StatusCode)}
	}
	return nil
}

func (c *CloudinaryClient) sign(payload string) string {
	hasher := sha1.New()
	hasher.Write([]byte(payload + c.APISecret))
	digest := hasher.Sum(nil)
	return hex.EncodeToString(digest)
}
