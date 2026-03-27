package collector

import (
	"time"

	"github.com/shirou/gopsutil/v3/process"
)

// ProcessInfo represents a running process
type ProcessInfo struct {
	PID        int32   `json:"pid"`
	Name       string  `json:"name"`
	Exe        string  `json:"exe,omitempty"`
	Cmdline    string  `json:"cmdline,omitempty"`
	Username   string  `json:"username,omitempty"`
	CPUPercent float64 `json:"cpuPercent"`
	MemoryMB   float32 `json:"memoryMb"`
	Status     string  `json:"status"`
	CreateTime int64   `json:"createTime"`
}

// ProcessCollector collects running process information
type ProcessCollector struct{}

func (c *ProcessCollector) Name() string      { return "processes" }
func (c *ProcessCollector) BatchType() string  { return "processes" }

func (c *ProcessCollector) Collect() (interface{}, error) {
	procs, err := process.Processes()
	if err != nil {
		return nil, err
	}

	var result []ProcessInfo
	for _, p := range procs {
		name, err := p.Name()
		if err != nil || name == "" {
			continue
		}

		info := ProcessInfo{
			PID:  p.Pid,
			Name: name,
		}

		if exe, err := p.Exe(); err == nil {
			info.Exe = exe
		}

		if username, err := p.Username(); err == nil {
			info.Username = username
		}

		if cpu, err := p.CPUPercent(); err == nil {
			info.CPUPercent = cpu
		}

		if mem, err := p.MemoryInfo(); err == nil && mem != nil {
			info.MemoryMB = float32(mem.RSS) / 1024 / 1024
		}

		if status, err := p.Status(); err == nil && len(status) > 0 {
			info.Status = status[0]
		}

		if createTime, err := p.CreateTime(); err == nil {
			info.CreateTime = createTime
		}

		result = append(result, info)
	}

	return map[string]interface{}{
		"timestamp":    time.Now().UTC(),
		"processCount": len(result),
		"processes":    result,
	}, nil
}
