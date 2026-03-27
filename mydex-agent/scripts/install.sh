#!/bin/bash
# MyDex Agent Installer for macOS and Linux
# Usage: sudo ./install.sh --api-key "mdx_xxxxx" [--server "https://antifascist.work"]
# Deploy via: Jamf (macOS), Mosyle, Ansible, or any MDM

set -euo pipefail

API_KEY=""
SERVER_URL="https://antifascist.work"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --api-key) API_KEY="$2"; shift 2 ;;
        --server) SERVER_URL="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

if [ -z "$API_KEY" ]; then
    echo "Error: --api-key is required"
    echo "Usage: sudo ./install.sh --api-key mdx_xxxxx [--server https://antifascist.work]"
    exit 1
fi

# Check root
if [ "$(id -u)" -ne 0 ]; then
    echo "Error: This installer must be run as root (use sudo)"
    exit 1
fi

OS="$(uname -s)"
ARCH="$(uname -m)"
INSTALL_DIR="/usr/local/bin"

echo "========================================="
echo " MyDex Agent Installer"
echo " OS: $OS  Arch: $ARCH"
echo "========================================="

# Determine binary path
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ "$OS" = "Darwin" ]; then
    if [ "$ARCH" = "arm64" ]; then
        BINARY="$SCRIPT_DIR/../dist/darwin-arm64/mydex-agent"
    else
        BINARY="$SCRIPT_DIR/../dist/darwin/mydex-agent"
    fi
    CONFIG_DIR="/Library/Application Support/MyDex"
else
    if [ "$ARCH" = "aarch64" ]; then
        BINARY="$SCRIPT_DIR/../dist/linux-arm64/mydex-agent"
    else
        BINARY="$SCRIPT_DIR/../dist/linux/mydex-agent"
    fi
    CONFIG_DIR="/etc/mydex"
fi

if [ ! -f "$BINARY" ]; then
    echo "Error: Binary not found at $BINARY"
    echo "Run 'make darwin' or 'make linux' first."
    exit 1
fi

# Install binary
echo "Installing binary to $INSTALL_DIR..."
cp "$BINARY" "$INSTALL_DIR/mydex-agent"
chmod 755 "$INSTALL_DIR/mydex-agent"

# Create config
echo "Creating configuration..."
mkdir -p "$CONFIG_DIR"
cat > "$CONFIG_DIR/config.json" << EOF
{
  "serverUrl": "$SERVER_URL",
  "apiKey": "$API_KEY",
  "heartbeatInterval": 60,
  "processInterval": 60,
  "softwareInterval": 1800,
  "systemStateInterval": 300,
  "networkInterval": 30,
  "dnsEnabled": true,
  "usbMonitoring": true,
  "reportingInterval": 300,
  "policyPollInterval": 60,
  "commandPollInterval": 30
}
EOF
chmod 600 "$CONFIG_DIR/config.json"

# Install service
if [ "$OS" = "Darwin" ]; then
    # macOS: LaunchDaemon
    echo "Installing macOS LaunchDaemon..."
    cat > /Library/LaunchDaemons/work.antifascist.mydex-agent.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>work.antifascist.mydex-agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/mydex-agent</string>
        <string>--service</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/var/log/mydex-agent.log</string>
    <key>StandardErrorPath</key>
    <string>/var/log/mydex-agent.err</string>
</dict>
</plist>
EOF
    launchctl load /Library/LaunchDaemons/work.antifascist.mydex-agent.plist
    echo "LaunchDaemon loaded."

else
    # Linux: systemd
    echo "Installing systemd service..."
    cat > /etc/systemd/system/mydex-agent.service << EOF
[Unit]
Description=MyDex Endpoint Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/mydex-agent --service
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=mydex-agent

[Install]
WantedBy=multi-user.target
EOF
    systemctl daemon-reload
    systemctl enable mydex-agent
    systemctl start mydex-agent
    echo "systemd service started."
fi

echo ""
echo "========================================="
echo " MyDex Agent installed and running!"
echo " Binary:  $INSTALL_DIR/mydex-agent"
echo " Config:  $CONFIG_DIR/config.json"
echo " Server:  $SERVER_URL"
echo "========================================="
