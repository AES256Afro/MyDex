package collector

import (
	"os/exec"
	"runtime"
	"strings"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
)

// SystemState represents the full system state snapshot
type SystemState struct {
	Timestamp          time.Time `json:"timestamp"`
	OS                 string    `json:"os"`
	OSVersion          string    `json:"osVersion"`
	Hostname           string    `json:"hostname"`
	Uptime             uint64    `json:"uptimeSeconds"`
	CPUModel           string    `json:"cpuModel"`
	CPUCores           int       `json:"cpuCores"`
	CPUUsagePercent    float64   `json:"cpuUsagePercent"`
	TotalMemoryMB      uint64    `json:"totalMemoryMb"`
	UsedMemoryMB       uint64    `json:"usedMemoryMb"`
	MemoryUsagePercent float64   `json:"memoryUsagePercent"`
	TotalDiskGB        uint64    `json:"totalDiskGb"`
	UsedDiskGB         uint64    `json:"usedDiskGb"`
	DiskUsagePercent   float64   `json:"diskUsagePercent"`
	FirewallEnabled    bool      `json:"firewallEnabled"`
	DiskEncrypted      bool      `json:"diskEncrypted"`
	AntivirusRunning   bool      `json:"antivirusRunning"`
}

// SystemStateCollector collects system state information
type SystemStateCollector struct{}

func (c *SystemStateCollector) Name() string      { return "system_state" }
func (c *SystemStateCollector) BatchType() string  { return "system_state" }

func (c *SystemStateCollector) Collect() (interface{}, error) {
	state := SystemState{
		Timestamp: time.Now().UTC(),
		OS:        runtime.GOOS,
	}

	// Host info
	if info, err := host.Info(); err == nil {
		state.Hostname = info.Hostname
		state.OSVersion = info.Platform + " " + info.PlatformVersion
		state.Uptime = info.Uptime
	}

	// CPU info
	if cpus, err := cpu.Info(); err == nil && len(cpus) > 0 {
		state.CPUModel = cpus[0].ModelName
		state.CPUCores = int(cpus[0].Cores)
	}
	if pct, err := cpu.Percent(0, false); err == nil && len(pct) > 0 {
		state.CPUUsagePercent = pct[0]
	}

	// Memory
	if v, err := mem.VirtualMemory(); err == nil {
		state.TotalMemoryMB = v.Total / 1024 / 1024
		state.UsedMemoryMB = v.Used / 1024 / 1024
		state.MemoryUsagePercent = v.UsedPercent
	}

	// Disk
	rootPath := "/"
	if runtime.GOOS == "windows" {
		rootPath = "C:\\"
	}
	if d, err := disk.Usage(rootPath); err == nil {
		state.TotalDiskGB = d.Total / 1024 / 1024 / 1024
		state.UsedDiskGB = d.Used / 1024 / 1024 / 1024
		state.DiskUsagePercent = d.UsedPercent
	}

	// Security checks (OS-specific)
	state.FirewallEnabled = checkFirewall()
	state.DiskEncrypted = checkDiskEncryption()
	state.AntivirusRunning = checkAntivirus()

	return state, nil
}

func checkFirewall() bool {
	switch runtime.GOOS {
	case "windows":
		out, err := exec.Command("netsh", "advfirewall", "show", "currentprofile", "state").Output()
		if err != nil {
			return false
		}
		return strings.Contains(strings.ToLower(string(out)), "on")
	case "darwin":
		out, err := exec.Command("/usr/libexec/ApplicationFirewall/socketfilterfw", "--getglobalstate").Output()
		if err != nil {
			return false
		}
		return strings.Contains(string(out), "enabled")
	default: // linux
		out, err := exec.Command("ufw", "status").Output()
		if err != nil {
			// Try iptables
			out, err = exec.Command("iptables", "-L", "-n").Output()
			if err != nil {
				return false
			}
			return len(strings.Split(string(out), "\n")) > 8
		}
		return strings.Contains(string(out), "active")
	}
}

func checkDiskEncryption() bool {
	switch runtime.GOOS {
	case "windows":
		out, err := exec.Command("powershell", "-NoProfile", "-Command",
			"(Get-BitLockerVolume -MountPoint 'C:').ProtectionStatus").Output()
		if err != nil {
			return false
		}
		return strings.TrimSpace(string(out)) == "On"
	case "darwin":
		out, err := exec.Command("fdesetup", "status").Output()
		if err != nil {
			return false
		}
		return strings.Contains(string(out), "On")
	default:
		out, err := exec.Command("lsblk", "-o", "NAME,TYPE,MOUNTPOINT,FSTYPE").Output()
		if err != nil {
			return false
		}
		return strings.Contains(string(out), "crypt")
	}
}

func checkAntivirus() bool {
	switch runtime.GOOS {
	case "windows":
		out, err := exec.Command("powershell", "-NoProfile", "-Command",
			"Get-MpComputerStatus | Select-Object -ExpandProperty RealTimeProtectionEnabled").Output()
		if err != nil {
			return false
		}
		return strings.TrimSpace(string(out)) == "True"
	case "darwin":
		// Check if XProtect is running
		out, err := exec.Command("pgrep", "-x", "XProtect").Output()
		if err != nil {
			return false
		}
		return len(strings.TrimSpace(string(out))) > 0
	default:
		// Check for common AV processes
		for _, proc := range []string{"clamd", "freshclam", "sophos", "crowdstrike"} {
			if out, err := exec.Command("pgrep", "-x", proc).Output(); err == nil && len(out) > 0 {
				return true
			}
		}
		return false
	}
}
