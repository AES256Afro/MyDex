VERSION := 1.0.0
BUILD_TIME := $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
LDFLAGS := -ldflags "-s -w -X main.version=$(VERSION) -X main.buildTime=$(BUILD_TIME)"
BINARY := mydex-agent
OUT_DIR := dist

.PHONY: all clean windows darwin linux

all: windows darwin linux

clean:
	rm -rf $(OUT_DIR)

# ── Windows ──────────────────────────────────────────────────────────────────

windows:
	@echo "Building Windows amd64..."
	@mkdir -p $(OUT_DIR)/windows
	GOOS=windows GOARCH=amd64 go build $(LDFLAGS) -o $(OUT_DIR)/windows/$(BINARY).exe ./cmd/mydex-agent/

windows-arm64:
	@echo "Building Windows arm64..."
	@mkdir -p $(OUT_DIR)/windows-arm64
	GOOS=windows GOARCH=arm64 go build $(LDFLAGS) -o $(OUT_DIR)/windows-arm64/$(BINARY).exe ./cmd/mydex-agent/

# ── macOS ────────────────────────────────────────────────────────────────────

darwin:
	@echo "Building macOS amd64..."
	@mkdir -p $(OUT_DIR)/darwin
	GOOS=darwin GOARCH=amd64 go build $(LDFLAGS) -o $(OUT_DIR)/darwin/$(BINARY) ./cmd/mydex-agent/

darwin-arm64:
	@echo "Building macOS arm64 (Apple Silicon)..."
	@mkdir -p $(OUT_DIR)/darwin-arm64
	GOOS=darwin GOARCH=arm64 go build $(LDFLAGS) -o $(OUT_DIR)/darwin-arm64/$(BINARY) ./cmd/mydex-agent/

# ── Linux ────────────────────────────────────────────────────────────────────

linux:
	@echo "Building Linux amd64..."
	@mkdir -p $(OUT_DIR)/linux
	GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o $(OUT_DIR)/linux/$(BINARY) ./cmd/mydex-agent/

linux-arm64:
	@echo "Building Linux arm64..."
	@mkdir -p $(OUT_DIR)/linux-arm64
	GOOS=linux GOARCH=arm64 go build $(LDFLAGS) -o $(OUT_DIR)/linux-arm64/$(BINARY) ./cmd/mydex-agent/

# ── MDM Installers ───────────────────────────────────────────────────────────

msi: windows
	@echo "Building Windows MSI installer..."
	@echo "Requires WiX Toolset. Run: scripts/build-msi.ps1"

pkg: darwin-arm64
	@echo "Building macOS .pkg installer..."
	@echo "Run: scripts/build-pkg.sh"

deb: linux
	@echo "Building .deb package..."
	@echo "Run: scripts/build-deb.sh"

# ── Development ──────────────────────────────────────────────────────────────

dev:
	go run ./cmd/mydex-agent/ --api-key=$(API_KEY) --server=$(SERVER)

test:
	go test ./...

lint:
	golangci-lint run ./...
