# Homelab Proxy Helper

A simple CLI tool to automate subdomain and reverse proxy setup for homelab projects using Cloudflare DNS and Nginx Proxy Manager.

## What it does

- Creates DNS records in Cloudflare for your subdomains
- Sets up reverse proxy configurations in Nginx Proxy Manager
- Manages SSL certificates automatically
- Cleans up stale records

Perfect for homelab enthusiasts who want to quickly expose services with proper DNS and SSL setup.

## Key Features

- 🚀 **One-command setup** - Create subdomain + proxy + SSL in one go
- 🎮 **Interactive menus** - Easy to use without memorizing commands
- 🧹 **Smart cleanup** - Automatically removes stale/unreachable services
- 🔐 **SSL management** - Auto-request certificates or use existing ones
- 📦 **Standalone executables** - No Node.js required
- 🔌 **WebSocket support** - Works with modern web applications

## Requirements

- Cloudflare account with API access
- Nginx Proxy Manager instance
- Domain managed by Cloudflare

## Installation

### Easy Way (Recommended)
Download the executable for your system from [releases](https://github.com/ComputerComa/homelab_proxy_helper/releases):

- **Windows**: `homelab-proxy-win.exe`
- **Linux**: `homelab-proxy-linux`
- **macOS**: `homelab-proxy-macos`

No installation required - just download and run!

### NPM Installation
```bash
npm install -g homelab-proxy-helper
```

## Quick Start

### 1. First Setup
```bash
# Run interactive setup
homelab-proxy init
```

You'll be asked for:
- Cloudflare API token
- Your domain name
- Nginx Proxy Manager URL and login
- Default IP address

### 2. Create Your First Service
```bash
# Interactive mode (recommended)
homelab-proxy

# Or direct command
homelab-proxy create -s grafana -t 192.168.1.100:3000 --ssl
```

This creates:
- `grafana.yourdomain.com` DNS record
- Nginx proxy configuration
- SSL certificate

### 3. Manage Your Services
```bash
# See all your services
homelab-proxy list

# Clean up dead services
homelab-proxy cleanup

# Delete a service
homelab-proxy delete
```

## Common Commands

### Interactive Menu
```bash
homelab-proxy
```
Shows a menu with all options - perfect for beginners.

### Create a Service
```bash
# Basic setup
homelab-proxy create -s myapp -t 192.168.1.100:8080 --ssl

# With custom domain
homelab-proxy create -s api -t 192.168.1.101:3000 -d mydomain.com --ssl

# Disable WebSocket support
homelab-proxy create -s oldapp -t 192.168.1.102:80 --ssl --no-websockets
```

### List Services
```bash
# Table format (default)
homelab-proxy list

# JSON format
homelab-proxy list --json
```

### Clean Up
```bash
# See what would be cleaned up
homelab-proxy cleanup --dry-run

# Clean up stale records
homelab-proxy cleanup

# Clean up with basic authentication
homelab-proxy cleanup --basic-auth-username admin --basic-auth-password secret

# Clean up with custom timeout
homelab-proxy cleanup --timeout 10000
```

### SSL Certificates
```bash
# List all SSL certificates
homelab-proxy list-certs

# Set default SSL certificate
homelab-proxy set-default-ssl
```

## Configuration

### API Setup

**Cloudflare API Token:**
1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Create token with permissions:
   - Zone:Zone:Read
   - Zone:DNS:Edit
3. Include your domain in Zone Resources

**Nginx Proxy Manager:**
- Make sure it's accessible (usually `http://your-server:81`)
- Use admin credentials or create a dedicated user

### Config File Location
- Windows: `%USERPROFILE%\.homelab-proxy\config.json`
- Linux/macOS: `~/.homelab-proxy/config.json`

### Basic Auth for Cleanup
If your services require basic authentication, you can configure it for health checks:

During `homelab-proxy init`, you'll be asked if you want to use basic auth for cleanup checks.

Or use command-line options:
```bash
homelab-proxy cleanup --basic-auth-username admin --basic-auth-password secret
```

### Environment Variables
```bash
export CLOUDFLARE_API_TOKEN=your_token_here
export NPM_URL=http://localhost:81
export NPM_EMAIL=admin@example.com
export NPM_PASSWORD=your_password
export DEFAULT_DOMAIN=example.com
```

## How It Works

### DNS Records
The tool creates CNAME records pointing to your main domain:

```
# Your main domain
example.com → 192.168.1.100

# Your services (CNAME records)
grafana.example.com → example.com
nextcloud.example.com → example.com
homeassistant.example.com → example.com
```

This way, you only need to update one A record if your IP changes.

### SSL Certificates
- Automatically requests Let's Encrypt certificates
- Can use existing certificates (great for wildcards)
- Supports force SSL redirect

### Cleanup System
The cleanup command checks if services are still reachable:
- Makes HTTP/HTTPS requests to each service
- Marks unreachable services as stale
- Lets you remove them interactively
- Excludes email records (DKIM) automatically
- Supports basic authentication for protected services

## Troubleshooting

### Common Issues

**Authentication Failed**
- Check your Cloudflare API token permissions
- Verify NPM credentials and URL

**SSL Certificate Failed**
- Ensure domain is accessible from internet
- Check Let's Encrypt rate limits
- Make sure port 80 is open for verification

**DNS Record Already Exists**
- Tool will use existing records safely
- Use `homelab-proxy list` to see current records

### Debug Mode
```bash
DEBUG=true homelab-proxy create -s test -t 192.168.1.100:8080
```

## Examples

### Basic Homelab Setup
```bash
# Setup Grafana monitoring
homelab-proxy create -s grafana -t 192.168.1.100:3000 --ssl

# Setup Nextcloud
homelab-proxy create -s cloud -t 192.168.1.101:8080 --ssl --force-ssl

# Setup Home Assistant
homelab-proxy create -s home -t 192.168.1.102:8123 --ssl

# List everything
homelab-proxy list
```

### Advanced Usage
```bash
# Use existing wildcard certificate
homelab-proxy create -s api -t 192.168.1.103:8080 --ssl-cert 5

# Create without SSL
homelab-proxy create -s internal -t 192.168.1.104:3000

# Custom domain
homelab-proxy create -s blog -t 192.168.1.105:80 -d myblog.com --ssl
```

## Support

- [GitHub Issues](https://github.com/ComputerComa/homelab_proxy_helper/issues) for bugs and feature requests
- [Getting Started Guide](GETTING_STARTED.md) for detailed setup instructions
- [Build Instructions](BUILD.md) for building from source

## License

MIT License - see [LICENSE](LICENSE) file for details.
