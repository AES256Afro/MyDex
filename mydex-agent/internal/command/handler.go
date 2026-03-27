package command

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os/exec"
	"runtime"
	"time"

	"github.com/AES256Afro/mydex-agent/internal/auth"
	"github.com/AES256Afro/mydex-agent/internal/config"
)

// Command represents a remote command from the server
type Command struct {
	ID          string `json:"id"`
	CommandType string `json:"commandType"`
	Payload     string `json:"payload"`
	Status      string `json:"status"`
}

// Handler polls for and executes remote commands
type Handler struct {
	cfg    *config.Config
	auth   *auth.Client
	http   *http.Client
	stopCh chan struct{}
}

// New creates a new command handler
func New(cfg *config.Config, authClient *auth.Client) *Handler {
	return &Handler{
		cfg:  cfg,
		auth: authClient,
		http: &http.Client{
			Timeout: 30 * time.Second,
		},
		stopCh: make(chan struct{}),
	}
}

// Start begins the command polling loop
func (h *Handler) Start() {
	interval := time.Duration(h.cfg.CommandPollInterval) * time.Second
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			h.pollAndExecute()
		case <-h.stopCh:
			return
		}
	}
}

// Stop signals the polling loop to stop
func (h *Handler) Stop() {
	close(h.stopCh)
}

func (h *Handler) pollAndExecute() {
	req, err := h.auth.AuthenticatedRequest("GET",
		fmt.Sprintf("/api/v1/agents/commands?deviceId=%s&status=PENDING", h.cfg.DeviceID), nil)
	if err != nil {
		log.Printf("[commands] Auth error: %v", err)
		return
	}

	resp, err := h.http.Do(req)
	if err != nil {
		log.Printf("[commands] Poll failed: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return
	}

	var result struct {
		Commands []Command `json:"commands"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		log.Printf("[commands] Parse error: %v", err)
		return
	}

	for _, cmd := range result.Commands {
		log.Printf("[commands] Executing: %s (%s)", cmd.CommandType, cmd.ID)
		h.execute(cmd)
	}
}

func (h *Handler) execute(cmd Command) {
	var output string
	var status string

	switch cmd.CommandType {
	case "RUN_SCRIPT":
		output, status = h.runScript(cmd.Payload)
	case "FORCE_REBOOT":
		output, status = h.reboot()
	case "ISOLATE_HOST":
		output, status = h.isolateHost()
	case "UNISOLATE_HOST":
		output, status = h.unisolateHost()
	case "COLLECT_LOGS":
		output, status = h.collectLogs()
	case "UPDATE_AGENT":
		output = "Agent update not yet implemented"
		status = "FAILED"
	default:
		output = fmt.Sprintf("Unknown command type: %s", cmd.CommandType)
		status = "FAILED"
	}

	// Report result back to server
	h.reportResult(cmd.ID, status, output)
}

func (h *Handler) reportResult(cmdID, status, output string) {
	body, _ := json.Marshal(map[string]string{
		"id":     cmdID,
		"status": status,
		"output": output,
	})

	req, err := h.auth.AuthenticatedRequest("PATCH", "/api/v1/agents/commands", body)
	if err != nil {
		log.Printf("[commands] Report error: %v", err)
		return
	}
	req.Body = io.NopCloser(bytes.NewReader(body))

	resp, err := h.http.Do(req)
	if err != nil {
		log.Printf("[commands] Report failed: %v", err)
		return
	}
	resp.Body.Close()
}

func (h *Handler) runScript(payload string) (string, string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", payload)
	default:
		cmd = exec.Command("/bin/sh", "-c", payload)
	}

	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Sprintf("Error: %v\nOutput: %s", err, string(out)), "FAILED"
	}
	return string(out), "COMPLETED"
}

func (h *Handler) reboot() (string, string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("shutdown", "/r", "/t", "30", "/c", "MyDex remote reboot")
	default:
		cmd = exec.Command("shutdown", "-r", "+1", "MyDex remote reboot")
	}

	if err := cmd.Start(); err != nil {
		return fmt.Sprintf("Reboot failed: %v", err), "FAILED"
	}
	return "Reboot scheduled", "COMPLETED"
}

func (h *Handler) isolateHost() (string, string) {
	switch runtime.GOOS {
	case "windows":
		// Block all traffic except to MyDex server
		cmds := []string{
			"netsh advfirewall set allprofiles firewallpolicy blockinbound,blockoutbound",
			fmt.Sprintf(`netsh advfirewall firewall add rule name="MyDex-Allow-Out" dir=out action=allow remoteip=%s`, h.cfg.ServerURL),
			fmt.Sprintf(`netsh advfirewall firewall add rule name="MyDex-Allow-In" dir=in action=allow remoteip=%s`, h.cfg.ServerURL),
			`netsh advfirewall firewall add rule name="MyDex-DNS" dir=out action=allow protocol=udp remoteport=53`,
		}
		for _, c := range cmds {
			exec.Command("cmd", "/C", c).Run()
		}
		return "Host isolated — only MyDex server traffic allowed", "COMPLETED"
	default:
		return "Host isolation not yet supported on this OS", "FAILED"
	}
}

func (h *Handler) unisolateHost() (string, string) {
	switch runtime.GOOS {
	case "windows":
		cmds := []string{
			`netsh advfirewall firewall delete rule name="MyDex-Allow-Out"`,
			`netsh advfirewall firewall delete rule name="MyDex-Allow-In"`,
			`netsh advfirewall firewall delete rule name="MyDex-DNS"`,
			"netsh advfirewall set allprofiles firewallpolicy blockinbound,allowoutbound",
		}
		for _, c := range cmds {
			exec.Command("cmd", "/C", c).Run()
		}
		return "Host unisolated — normal networking restored", "COMPLETED"
	default:
		return "Host unisolation not yet supported on this OS", "FAILED"
	}
}

func (h *Handler) collectLogs() (string, string) {
	// Collect recent system logs
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("powershell", "-NoProfile", "-Command",
			"Get-EventLog -LogName System -Newest 100 | Format-List | Out-String")
	case "darwin":
		cmd = exec.Command("log", "show", "--last", "1h", "--style", "compact")
	default:
		cmd = exec.Command("journalctl", "-n", "200", "--no-pager")
	}

	out, err := cmd.Output()
	if err != nil {
		return fmt.Sprintf("Log collection failed: %v", err), "FAILED"
	}

	// Truncate if too large (max 500KB)
	result := string(out)
	if len(result) > 500*1024 {
		result = result[:500*1024] + "\n... [truncated]"
	}

	return result, "COMPLETED"
}
