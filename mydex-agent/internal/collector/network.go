package collector

import (
	"time"

	"github.com/shirou/gopsutil/v3/net"
	"github.com/shirou/gopsutil/v3/process"
)

// ConnectionInfo represents a network connection
type ConnectionInfo struct {
	Protocol      string `json:"protocol"`
	LocalAddress  string `json:"localAddress"`
	LocalPort     uint32 `json:"localPort"`
	RemoteAddress string `json:"remoteAddress"`
	RemotePort    uint32 `json:"remotePort"`
	State         string `json:"state"`
	PID           int32  `json:"pid"`
	ProcessName   string `json:"processName,omitempty"`
}

// NetworkCollector collects active network connections
type NetworkCollector struct{}

func (c *NetworkCollector) Name() string      { return "network" }
func (c *NetworkCollector) BatchType() string  { return "network_connections" }

func (c *NetworkCollector) Collect() (interface{}, error) {
	conns, err := net.Connections("all")
	if err != nil {
		return nil, err
	}

	// Build PID -> process name cache
	pidNames := make(map[int32]string)

	var result []ConnectionInfo
	for _, conn := range conns {
		// Skip connections with no remote address (listeners without connections)
		if conn.Status == "NONE" && conn.Raddr.IP == "" {
			continue
		}

		info := ConnectionInfo{
			LocalAddress:  conn.Laddr.IP,
			LocalPort:     conn.Laddr.Port,
			RemoteAddress: conn.Raddr.IP,
			RemotePort:    conn.Raddr.Port,
			State:         conn.Status,
			PID:           conn.Pid,
		}

		switch conn.Type {
		case 1: // SOCK_STREAM = TCP
			info.Protocol = "TCP"
		case 2: // SOCK_DGRAM = UDP
			info.Protocol = "UDP"
		default:
			info.Protocol = "OTHER"
		}

		// Resolve process name
		if conn.Pid > 0 {
			if name, ok := pidNames[conn.Pid]; ok {
				info.ProcessName = name
			} else {
				if p, err := process.NewProcess(conn.Pid); err == nil {
					if name, err := p.Name(); err == nil {
						info.ProcessName = name
						pidNames[conn.Pid] = name
					}
				}
			}
		}

		result = append(result, info)
	}

	return map[string]interface{}{
		"timestamp":       time.Now().UTC(),
		"connectionCount": len(result),
		"connections":     result,
	}, nil
}
