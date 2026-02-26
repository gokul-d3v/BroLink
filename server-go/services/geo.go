package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type GeoInfo struct {
	Country     string `json:"country"`
	CountryCode string `json:"countryCode"`
	RegionName  string `json:"regionName"`
	City        string `json:"city"`
	Status      string `json:"status"`
}

// LookupGeo fetches country and city for the given IP using ip-api.com (free, no key).
// Returns empty GeoInfo on error or private IP.
func LookupGeo(ip string) GeoInfo {
	// Skip private / loopback IPs
	if ip == "" || ip == "127.0.0.1" || ip == "::1" ||
		strings.HasPrefix(ip, "192.168.") ||
		strings.HasPrefix(ip, "10.") {
		return GeoInfo{}
	}

	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Get(fmt.Sprintf("http://ip-api.com/json/%s?fields=status,country,countryCode,regionName,city", ip))
	if err != nil {
		return GeoInfo{}
	}
	defer resp.Body.Close()

	var info GeoInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return GeoInfo{}
	}
	if info.Status != "success" {
		return GeoInfo{}
	}
	return info
}
