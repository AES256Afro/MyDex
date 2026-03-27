package collector

import (
	"log"
	"time"

	"github.com/AES256Afro/mydex-agent/internal/config"
	"github.com/AES256Afro/mydex-agent/internal/transport"
)

// Collector defines the interface all collectors must implement
type Collector interface {
	Name() string
	Collect() (interface{}, error)
	BatchType() string
}

// Scheduler runs collectors at configured intervals and feeds data to transport
type Scheduler struct {
	cfg       *config.Config
	transport *transport.Client
	stopCh    chan struct{}
}

// NewScheduler creates a new collector scheduler
func NewScheduler(cfg *config.Config, t *transport.Client) *Scheduler {
	return &Scheduler{
		cfg:       cfg,
		transport: t,
		stopCh:    make(chan struct{}),
	}
}

// Start begins all collector loops
func (s *Scheduler) Start() {
	collectors := []struct {
		collector Collector
		interval  int // seconds
	}{
		{&ProcessCollector{}, s.cfg.ProcessInterval},
		{&SoftwareCollector{}, s.cfg.SoftwareInterval},
		{&SystemStateCollector{}, s.cfg.SystemStateInterval},
		{&NetworkCollector{}, s.cfg.NetworkInterval},
	}

	for _, c := range collectors {
		if c.interval <= 0 {
			continue
		}
		go s.runCollector(c.collector, time.Duration(c.interval)*time.Second)
	}
}

// Stop signals all collector loops to stop
func (s *Scheduler) Stop() {
	close(s.stopCh)
}

func (s *Scheduler) runCollector(c Collector, interval time.Duration) {
	// Run immediately on start
	s.collect(c)

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			s.collect(c)
		case <-s.stopCh:
			return
		}
	}
}

func (s *Scheduler) collect(c Collector) {
	data, err := c.Collect()
	if err != nil {
		log.Printf("[collector:%s] Error: %v", c.Name(), err)
		return
	}
	if data == nil {
		return
	}
	s.transport.AddBatch(c.BatchType(), data)
	log.Printf("[collector:%s] Collected data", c.Name())
}
