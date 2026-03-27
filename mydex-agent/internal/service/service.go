package service

import (
	"log"

	"github.com/kardianos/service"
)

// AgentService wraps the agent lifecycle for OS service management
type AgentService struct {
	StartFunc func()
	StopFunc  func()
}

func (a *AgentService) Start(s service.Service) error {
	go a.StartFunc()
	return nil
}

func (a *AgentService) Stop(s service.Service) error {
	a.StopFunc()
	return nil
}

// ServiceConfig returns the OS service configuration
func ServiceConfig() *service.Config {
	return &service.Config{
		Name:        "MyDexAgent",
		DisplayName: "MyDex Endpoint Agent",
		Description: "MyDex endpoint monitoring and security agent",
		Arguments:   []string{"--service"},
	}
}

// Install registers the agent as an OS service
func Install() error {
	svcConfig := ServiceConfig()
	prg := &AgentService{}
	s, err := service.New(prg, svcConfig)
	if err != nil {
		return err
	}
	return s.Install()
}

// Uninstall removes the agent OS service
func Uninstall() error {
	svcConfig := ServiceConfig()
	prg := &AgentService{}
	s, err := service.New(prg, svcConfig)
	if err != nil {
		return err
	}
	return s.Uninstall()
}

// Run starts the agent as an OS service or interactive process
func Run(startFunc func(), stopFunc func()) {
	svcConfig := ServiceConfig()
	prg := &AgentService{
		StartFunc: startFunc,
		StopFunc:  stopFunc,
	}

	s, err := service.New(prg, svcConfig)
	if err != nil {
		log.Fatalf("Failed to create service: %v", err)
	}

	logger, err := s.Logger(nil)
	if err != nil {
		log.Fatalf("Failed to create service logger: %v", err)
	}

	if err := s.Run(); err != nil {
		logger.Error(err)
	}
}
