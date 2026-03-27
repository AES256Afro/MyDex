package collector

import (
	"encoding/json"
	"os/exec"
	"runtime"
	"strings"
	"time"
)

// InstalledApp represents an installed application
type InstalledApp struct {
	Name        string `json:"name"`
	Version     string `json:"version,omitempty"`
	Publisher   string `json:"publisher,omitempty"`
	InstallDate string `json:"installDate,omitempty"`
}

// SoftwareCollector collects installed software information
type SoftwareCollector struct{}

func (c *SoftwareCollector) Name() string      { return "software" }
func (c *SoftwareCollector) BatchType() string  { return "software" }

func (c *SoftwareCollector) Collect() (interface{}, error) {
	var apps []InstalledApp
	var err error

	switch runtime.GOOS {
	case "windows":
		apps, err = collectWindowsSoftware()
	case "darwin":
		apps, err = collectMacSoftware()
	default:
		apps, err = collectLinuxSoftware()
	}

	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"timestamp": time.Now().UTC(),
		"appCount":  len(apps),
		"apps":      apps,
	}, nil
}

func collectWindowsSoftware() ([]InstalledApp, error) {
	// Use PowerShell to query installed programs from registry
	cmd := exec.Command("powershell", "-NoProfile", "-Command", `
		Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*,
		HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\* -ErrorAction SilentlyContinue |
		Where-Object { $_.DisplayName } |
		Select-Object DisplayName, DisplayVersion, Publisher, InstallDate |
		ConvertTo-Json -Compress
	`)

	out, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	// Parse the JSON output
	var raw []struct {
		DisplayName    string `json:"DisplayName"`
		DisplayVersion string `json:"DisplayVersion"`
		Publisher      string `json:"Publisher"`
		InstallDate    string `json:"InstallDate"`
	}

	if err := parseJSON(out, &raw); err != nil {
		return nil, err
	}

	apps := make([]InstalledApp, 0, len(raw))
	for _, r := range raw {
		apps = append(apps, InstalledApp{
			Name:        r.DisplayName,
			Version:     r.DisplayVersion,
			Publisher:   r.Publisher,
			InstallDate: r.InstallDate,
		})
	}

	return apps, nil
}

func collectMacSoftware() ([]InstalledApp, error) {
	cmd := exec.Command("system_profiler", "SPApplicationsDataType", "-json")
	out, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	var raw map[string][]struct {
		Name    string `json:"_name"`
		Version string `json:"version"`
	}

	if err := parseJSON(out, &raw); err != nil {
		return nil, err
	}

	var apps []InstalledApp
	for _, items := range raw {
		for _, item := range items {
			apps = append(apps, InstalledApp{
				Name:    item.Name,
				Version: item.Version,
			})
		}
	}

	return apps, nil
}

func collectLinuxSoftware() ([]InstalledApp, error) {
	// Try dpkg first, then rpm
	var cmd *exec.Cmd
	if _, err := exec.LookPath("dpkg"); err == nil {
		cmd = exec.Command("dpkg-query", "-W", "-f", "${Package}\t${Version}\n")
	} else if _, err := exec.LookPath("rpm"); err == nil {
		cmd = exec.Command("rpm", "-qa", "--queryformat", "%{NAME}\t%{VERSION}\n")
	} else {
		return nil, nil // No package manager found
	}

	out, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	var apps []InstalledApp
	for _, line := range strings.Split(string(out), "\n") {
		parts := strings.SplitN(line, "\t", 2)
		if len(parts) >= 1 && parts[0] != "" {
			app := InstalledApp{Name: parts[0]}
			if len(parts) >= 2 {
				app.Version = parts[1]
			}
			apps = append(apps, app)
		}
	}

	return apps, nil
}

func parseJSON(data []byte, v interface{}) error {
	return json.Unmarshal(data, v)
}
