package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
)

// Config holds the agent configuration
type Config struct {
	// Server connection
	ServerURL string `json:"serverUrl"`
	APIKey    string `json:"apiKey"`

	// Collection intervals (seconds)
	HeartbeatInterval  int `json:"heartbeatInterval"`
	ProcessInterval    int `json:"processInterval"`
	SoftwareInterval   int `json:"softwareInterval"`
	SystemStateInterval int `json:"systemStateInterval"`
	NetworkInterval    int `json:"networkInterval"`
	DNSEnabled         bool `json:"dnsEnabled"`
	USBMonitoring      bool `json:"usbMonitoring"`

	// Telemetry batching
	ReportingInterval int `json:"reportingInterval"` // seconds between telemetry uploads

	// Policy
	PolicyPollInterval int `json:"policyPollInterval"`
	CommandPollInterval int `json:"commandPollInterval"`

	// Local state (not saved to config file)
	DeviceID string `json:"deviceId,omitempty"`
	Token    string `json:"-"` // JWT token, not persisted
	OrgID    string `json:"-"`
}

// DefaultConfig returns sensible defaults
func DefaultConfig() *Config {
	return &Config{
		ServerURL:           "https://antifascist.work",
		APIKey:              "",
		HeartbeatInterval:   60,
		ProcessInterval:     60,
		SoftwareInterval:    1800, // 30 min
		SystemStateInterval: 300,  // 5 min
		NetworkInterval:     30,
		DNSEnabled:          true,
		USBMonitoring:       true,
		ReportingInterval:   300, // 5 min
		PolicyPollInterval:  60,
		CommandPollInterval: 30,
	}
}

// ConfigDir returns the platform-specific config directory
func ConfigDir() string {
	switch runtime.GOOS {
	case "windows":
		return filepath.Join(os.Getenv("ProgramData"), "MyDex")
	case "darwin":
		return "/Library/Application Support/MyDex"
	default: // linux
		return "/etc/mydex"
	}
}

// ConfigPath returns the full path to the config file
func ConfigPath() string {
	return filepath.Join(ConfigDir(), "config.json")
}

// Load reads config from disk, falling back to defaults
func Load() (*Config, error) {
	cfg := DefaultConfig()

	data, err := os.ReadFile(ConfigPath())
	if err != nil {
		if os.IsNotExist(err) {
			return cfg, nil // Use defaults
		}
		return nil, fmt.Errorf("reading config: %w", err)
	}

	if err := json.Unmarshal(data, cfg); err != nil {
		return nil, fmt.Errorf("parsing config: %w", err)
	}

	return cfg, nil
}

// Save writes the current config to disk
func (c *Config) Save() error {
	dir := ConfigDir()
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("creating config dir: %w", err)
	}

	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return fmt.Errorf("marshaling config: %w", err)
	}

	if err := os.WriteFile(ConfigPath(), data, 0600); err != nil {
		return fmt.Errorf("writing config: %w", err)
	}

	return nil
}
