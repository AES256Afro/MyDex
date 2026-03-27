package transport

import (
	"bytes"
	"compress/gzip"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/AES256Afro/mydex-agent/internal/auth"
	"github.com/AES256Afro/mydex-agent/internal/config"
)

// TelemetryBatch represents a single batch of collected data
type TelemetryBatch struct {
	Type        string      `json:"type"`
	CollectedAt time.Time   `json:"collectedAt"`
	Data        interface{} `json:"data"`
}

// Client handles batched telemetry uploads to the server
type Client struct {
	cfg      *config.Config
	auth     *auth.Client
	http     *http.Client
	batches  []TelemetryBatch
	mu       sync.Mutex
	stopCh   chan struct{}
}

// New creates a new transport client
func New(cfg *config.Config, authClient *auth.Client) *Client {
	return &Client{
		cfg:  cfg,
		auth: authClient,
		http: &http.Client{
			Timeout: 60 * time.Second,
		},
		batches: make([]TelemetryBatch, 0),
		stopCh:  make(chan struct{}),
	}
}

// AddBatch queues a telemetry batch for upload
func (c *Client) AddBatch(batchType string, data interface{}) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.batches = append(c.batches, TelemetryBatch{
		Type:        batchType,
		CollectedAt: time.Now(),
		Data:        data,
	})
}

// Start begins the periodic upload loop
func (c *Client) Start() {
	interval := time.Duration(c.cfg.ReportingInterval) * time.Second
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			c.Flush()
		case <-c.stopCh:
			c.Flush() // Final flush on shutdown
			return
		}
	}
}

// Stop signals the upload loop to stop
func (c *Client) Stop() {
	close(c.stopCh)
}

// Flush sends all queued batches to the server
func (c *Client) Flush() {
	c.mu.Lock()
	if len(c.batches) == 0 {
		c.mu.Unlock()
		return
	}
	toSend := c.batches
	c.batches = make([]TelemetryBatch, 0)
	c.mu.Unlock()

	payload := map[string]interface{}{
		"deviceId": c.cfg.DeviceID,
		"batches":  toSend,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		log.Printf("[transport] Error marshaling telemetry: %v", err)
		// Put batches back
		c.mu.Lock()
		c.batches = append(toSend, c.batches...)
		c.mu.Unlock()
		return
	}

	// Gzip compress if payload > 1KB
	var body io.Reader
	var useGzip bool
	if len(jsonData) > 1024 {
		var buf bytes.Buffer
		gz := gzip.NewWriter(&buf)
		gz.Write(jsonData)
		gz.Close()
		body = &buf
		useGzip = true
	} else {
		body = bytes.NewReader(jsonData)
	}

	req, err := c.auth.AuthenticatedRequest("POST", "/api/v1/agents/telemetry", nil)
	if err != nil {
		log.Printf("[transport] Auth error: %v", err)
		c.mu.Lock()
		c.batches = append(toSend, c.batches...)
		c.mu.Unlock()
		return
	}

	// Replace the body since AuthenticatedRequest already set one
	req.Body = io.NopCloser(body)
	if useGzip {
		req.Header.Set("Content-Encoding", "gzip")
	}

	resp, err := c.http.Do(req)
	if err != nil {
		log.Printf("[transport] Upload failed: %v (will retry)", err)
		c.mu.Lock()
		c.batches = append(toSend, c.batches...)
		c.mu.Unlock()
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		respBody, _ := io.ReadAll(resp.Body)
		log.Printf("[transport] Upload returned %d: %s", resp.StatusCode, string(respBody))
		if resp.StatusCode >= 500 {
			// Server error — retry
			c.mu.Lock()
			c.batches = append(toSend, c.batches...)
			c.mu.Unlock()
		}
		return
	}

	log.Printf("[transport] Uploaded %d batches successfully", len(toSend))
}

// Heartbeat sends a heartbeat to the server
func (c *Client) Heartbeat(data map[string]interface{}) error {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("marshaling heartbeat: %w", err)
	}

	req, err := c.auth.AuthenticatedRequest("PATCH", "/api/v1/agents/devices", jsonData)
	if err != nil {
		return fmt.Errorf("creating heartbeat request: %w", err)
	}
	req.Body = io.NopCloser(bytes.NewReader(jsonData))

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("heartbeat request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("heartbeat returned %d", resp.StatusCode)
	}

	return nil
}
