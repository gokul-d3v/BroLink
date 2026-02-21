package services

import (
	"errors"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
)

type Metadata struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Image       string `json:"image"`
	Favicon     string `json:"favicon"`
	URL         string `json:"url"`
	Domain      string `json:"domain"`
}

type MetadataError struct {
	Message string
}

func (e MetadataError) Error() string {
	return e.Message
}

var metadataClient = &http.Client{
	Timeout: 4 * time.Second,
	Transport: &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:   3 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		MaxIdleConns:          100,
		MaxIdleConnsPerHost:   10,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   5 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
	},
}

func FetchMetadata(target string) (*Metadata, error) {
	parsed, err := url.Parse(target)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return nil, MetadataError{Message: "invalid url"}
	}

	request, err := http.NewRequest(http.MethodGet, target, nil)
	if err != nil {
		return nil, MetadataError{Message: "request failed"}
	}
	request.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

	response, err := metadataClient.Do(request)
	if err != nil {
		return nil, MetadataError{Message: "request failed"}
	}
	defer response.Body.Close()

	doc, err := goquery.NewDocumentFromReader(response.Body)
	if err != nil {
		return nil, MetadataError{Message: "request failed"}
	}

	meta := &Metadata{URL: target, Domain: parsed.Host}

	doc.Find("meta").Each(func(_ int, s *goquery.Selection) {
		if meta.Title == "" {
			if property, _ := s.Attr("property"); strings.EqualFold(property, "og:title") {
				if content, ok := s.Attr("content"); ok {
					meta.Title = content
				}
			}
		}
		if meta.Description == "" {
			if property, _ := s.Attr("property"); strings.EqualFold(property, "og:description") {
				if content, ok := s.Attr("content"); ok {
					meta.Description = content
				}
			}
		}
		if meta.Image == "" {
			if property, _ := s.Attr("property"); strings.EqualFold(property, "og:image") {
				if content, ok := s.Attr("content"); ok {
					meta.Image = content
				}
			}
		}
		if meta.Description == "" {
			if name, _ := s.Attr("name"); strings.EqualFold(name, "description") {
				if content, ok := s.Attr("content"); ok {
					meta.Description = content
				}
			}
		}
	})

	if meta.Title == "" {
		meta.Title = strings.TrimSpace(doc.Find("title").First().Text())
	}

	doc.Find("link").EachWithBreak(func(_ int, s *goquery.Selection) bool {
		rel, _ := s.Attr("rel")
		if strings.EqualFold(rel, "icon") || strings.EqualFold(rel, "shortcut icon") {
			if href, ok := s.Attr("href"); ok {
				meta.Favicon = href
				return false
			}
		}
		return true
	})

	if meta.Favicon != "" {
		faviconURL, err := url.Parse(meta.Favicon)
		if err == nil && faviconURL.IsAbs() {
			return meta, nil
		}
		resolved := parsed.ResolveReference(&url.URL{Path: meta.Favicon})
		meta.Favicon = resolved.String()
	}

	return meta, nil
}

var ErrMetadataUnavailable = errors.New("metadata unavailable")
