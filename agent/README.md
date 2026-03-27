# MyDex Desktop Agent

Companion desktop agent for MyDex employee monitoring platform.

## Features

- **Activity Monitoring**: Reports active window/app every 30 seconds
- **IOC Hash Scanning**: Hashes running process executables and checks against your IOC database
- **CVE Scanning**: Reports installed software inventory for CVE matching
- **Browser Detection**: Identifies browser windows and extracts page titles
- **System Tray**: Runs silently in the system tray

## Setup

1. Install dependencies:
   ```bash
   cd agent
   npm install
   ```

2. Run the agent:
   ```bash
   npm start
   ```

3. Configure:
   - Enter your MyDex server URL (e.g., http://localhost:3000)
   - Enter your email and password
   - Click Connect

## Building

```bash
npm run build
```

This creates distributable packages for your platform in the `dist/` folder.

## How It Works

### Activity Collection
Every 30 seconds (configurable), the agent captures the foreground window title and process name. For browser windows, it extracts the page title and identifies the browser.

### IOC Hash Scanning
Every hour, the agent:
1. Lists all running processes
2. Hashes each unique executable (MD5 + SHA256)
3. Sends hashes to `/api/v1/security/ioc/lookup`
4. If matches are found, security alerts are created on the server

### CVE Scanning
Every 24 hours, the agent:
1. Reads installed software from the Windows registry
2. Sends the software list to `/api/v1/security/cve/scan`
3. The server matches against known CVEs and creates alerts
