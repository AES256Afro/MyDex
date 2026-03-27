package auth

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"runtime"
	"sync"
	"time"

	"github.com/shirou/gopsutil/v3/host"

	"github.com/AES256Afro/mydex-agent/internal/config"
)

// Client handles agent authentication with the MyDex server
type Client struct {
	cfg       *config.Config
	token     string
	expiresAt time.Time
	mu        sync.RWMutex
	http      *http.Client
}

type authResponse struct {
	Token          string `json:"token"`
	ExpiresIn      int    `json:"expiresIn"`
	DeviceID       string `json:"deviceId"`
	OrganizationID string `json:"organizationId"`
}

// New creates a new auth client
func New(cfg *config.Config) *Client {
	return &Client{
		cfg: cfg,
		http: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// Authenticate exchanges the API key for a JWT token
func (c *Client) Authenticate() error {
	body, _ := json.Marshal(map[string]string{
		"apiKey": c.cfg.APIKey,
	})

	resp, err := c.http.Post(
		c.cfg.ServerURL+"/api/v1/agents/auth",
		"application/json",
		bytes.NewReader(body),
	)
	if err != nil {
		return fmt.Errorf("auth request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("auth failed with status %d", resp.StatusCode)
	}

	var result authResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fmt.Errorf("parsing auth response: %w", err)
	}

	c.mu.Lock()
	c.token = result.Token
	c.expiresAt = time.Now().Add(time.Duration(result.ExpiresIn) * time.Second)
	c.cfg.DeviceID = result.DeviceID
	c.cfg.OrgID = result.OrganizationID
	c.mu.Unlock()

	// Persist deviceId
	c.cfg.Save()

	return nil
}

// Token returns the current JWT, refreshing if needed
func (c *Client) Token() (string, error) {
	c.mu.RLock()
	token := c.token
	expires := c.expiresAt
	c.mu.RUnlock()

	// Refresh if token expires within 5 minutes
	if token == "" || time.Until(expires) < 5*time.Minute {
		if err := c.Authenticate(); err != nil {
			return "", err
		}
		c.mu.RLock()
		token = c.token
		c.mu.RUnlock()
	}

	return token, nil
}

// RegisterDevice registers this machine as a device on the server
func (c *Client) RegisterDevice() error {
	hostname, _ := os.Hostname()

	info, _ := host.Info()
	osVersion := ""
	platform := runtime.GOOS
	if info != nil {
		osVersion = info.Platform + " " + info.PlatformVersion
		platform = info.OS
	}

	body, _ := json.Marshal(map[string]interface{}{
		"hostname":     hostname,
		"platform":     platform,
		"osVersion":    osVersion,
		"agentVersion": "1.0.0",
		"status":       "ONLINE",
	})

	req, err := c.AuthenticatedRequest("POST", "/api/v1/agents/devices", body)
	if err != nil {
		return fmt.Errorf("creating register request: %w", err)
	}
	req.Body = io.NopCloser(bytes.NewReader(body))

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("register request: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 && resp.StatusCode != 201 {
		return fmt.Errorf("register failed with status %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Device struct {
			ID string `json:"id"`
		} `json:"device"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return fmt.Errorf("parsing register response: %w", err)
	}

	c.mu.Lock()
	c.cfg.DeviceID = result.Device.ID
	c.mu.Unlock()

	c.cfg.Save()
	return nil
}

// AuthenticatedRequest creates an HTTP request with the JWT auth header
func (c *Client) AuthenticatedRequest(method, path string, body []byte) (*http.Request, error) {
	token, err := c.Token()
	if err != nil {
		return nil, err
	}

	url := c.cfg.ServerURL + path
	var req *http.Request
	if body != nil {
		req, err = http.NewRequest(method, url, bytes.NewReader(body))
	} else {
		req, err = http.NewRequest(method, url, nil)
	}
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "MyDex-Agent/1.0")

	return req, nil
}
