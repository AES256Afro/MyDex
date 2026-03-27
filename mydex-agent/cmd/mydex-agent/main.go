package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"github.com/AES256Afro/mydex-agent/internal/auth"
	"github.com/AES256Afro/mydex-agent/internal/collector"
	"github.com/AES256Afro/mydex-agent/internal/command"
	"github.com/AES256Afro/mydex-agent/internal/config"
	agentservice "github.com/AES256Afro/mydex-agent/internal/service"
	"github.com/AES256Afro/mydex-agent/internal/transport"
)

var (
	version   = "1.0.0"
	buildTime = "dev"
)

func main() {
	// CLI flags
	installFlag := flag.Bool("install", false, "Install as system service")
	uninstallFlag := flag.Bool("uninstall", false, "Uninstall system service")
	serviceFlag := flag.Bool("service", false, "Run as service (used internally)")
	configFlag := flag.String("config", "", "Path to config file")
	apiKeyFlag := flag.String("api-key", "", "API key for initial setup")
	serverFlag := flag.String("server", "", "Server URL")
	versionFlag := flag.Bool("version", false, "Print version and exit")
	flag.Parse()

	if *versionFlag {
		fmt.Printf("MyDex Agent v%s (%s) [%s/%s]\n", version, buildTime, runtime.GOOS, runtime.GOARCH)
		os.Exit(0)
	}

	// Setup logging
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Printf("MyDex Agent v%s starting on %s/%s", version, runtime.GOOS, runtime.GOARCH)

	// Handle install/uninstall
	if *installFlag {
		if err := agentservice.Install(); err != nil {
			log.Fatalf("Install failed: %v", err)
		}
		fmt.Println("MyDex Agent installed as system service")
		fmt.Println("Start with: net start MyDexAgent (Windows) or systemctl start mydex-agent (Linux)")
		os.Exit(0)
	}

	if *uninstallFlag {
		if err := agentservice.Uninstall(); err != nil {
			log.Fatalf("Uninstall failed: %v", err)
		}
		fmt.Println("MyDex Agent uninstalled")
		os.Exit(0)
	}

	// Load config
	var cfg *config.Config
	var err error

	if *configFlag != "" {
		// TODO: load from specific path
		cfg, err = config.Load()
	} else {
		cfg, err = config.Load()
	}
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Override with CLI flags
	if *apiKeyFlag != "" {
		cfg.APIKey = *apiKeyFlag
	}
	if *serverFlag != "" {
		cfg.ServerURL = *serverFlag
	}

	// Validate
	if cfg.APIKey == "" {
		fmt.Println("Error: API key required. Use --api-key=mdx_xxxxx or set in config file.")
		fmt.Printf("Config location: %s\n", config.ConfigPath())
		os.Exit(1)
	}

	// Save config (persists API key and server URL)
	if err := cfg.Save(); err != nil {
		log.Printf("Warning: could not save config: %v", err)
	}

	if *serviceFlag {
		// Running as OS service
		agentservice.Run(
			func() { runAgent(cfg) },
			func() { /* stop handled by signal */ },
		)
	} else {
		// Running interactively
		runAgent(cfg)
	}
}

func runAgent(cfg *config.Config) {
	// Initialize auth client
	authClient := auth.New(cfg)

	// Authenticate with server
	log.Println("Authenticating with server...")
	for retries := 0; retries < 5; retries++ {
		if err := authClient.Authenticate(); err != nil {
			log.Printf("Auth attempt %d failed: %v", retries+1, err)
			time.Sleep(time.Duration(retries+1) * 10 * time.Second)
			continue
		}
		log.Printf("Authenticated. Device ID: %s", cfg.DeviceID)
		break
	}

	if cfg.DeviceID == "" {
		log.Fatal("Failed to authenticate after 5 attempts")
	}

	// Initialize transport
	transportClient := transport.New(cfg, authClient)

	// Initialize collectors
	collectorScheduler := collector.NewScheduler(cfg, transportClient)

	// Initialize command handler
	commandHandler := command.New(cfg, authClient)

	// Start all components
	go transportClient.Start()
	collectorScheduler.Start()
	go commandHandler.Start()

	// Start heartbeat loop
	go func() {
		ticker := time.NewTicker(time.Duration(cfg.HeartbeatInterval) * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				data := map[string]interface{}{
					"deviceId": cfg.DeviceID,
					"status":   "ONLINE",
				}
				if err := transportClient.Heartbeat(data); err != nil {
					log.Printf("[heartbeat] Error: %v", err)
				}
			}
		}
	}()

	log.Println("Agent is running. Press Ctrl+C to stop.")

	// Wait for shutdown signal
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	log.Println("Shutting down...")
	collectorScheduler.Stop()
	commandHandler.Stop()
	transportClient.Stop()
	log.Println("Agent stopped.")
}
