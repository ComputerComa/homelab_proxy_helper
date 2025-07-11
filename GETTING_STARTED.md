# Getting Started with Homelab Proxy Helper

This guide will help you set up and start using the Homelab Proxy Helper tool.

## Prerequisites

Before you begin, make sure you have:

1. **Node.js 16 or higher** installed on your system
2. **Cloudflare account** with a domain managed by Cloudflare
3. **Nginx Proxy Manager** instance running and accessible
4. **Cloudflare API Token** with appropriate permissions

## Step 1: Installation

### Option A: Global Installation (Recommended)
```bash
npm install -g homelab-proxy-helper
```

### Option B: Local Development
```bash
git clone https://github.com/yourusername/homelab-proxy-helper.git
cd homelab-proxy-helper
npm install
npm link
```

## Using the Tool

### Interactive Menu (Recommended for Beginners)
The easiest way to use the tool is through the interactive menu. Simply run:

```bash
homelab-proxy
```

This will display a user-friendly menu with all available options:
- 🚀 Create new subdomain and proxy
- 📋 List all domains and proxies
- 🗑️ Delete subdomain and proxy
- 🧹 Cleanup stale records
- 🔒 List SSL certificates
- ⚙️ Set default SSL certificate
- 🔧 Show/Edit configuration
- 🔄 Initialize/Reconfigure

### Command Line Interface
For advanced users or automation, you can use specific commands directly:

```bash
# Initialize configuration
homelab-proxy init

# Create a new subdomain
homelab-proxy create -s grafana -t 192.168.1.100:3000 --ssl
```

## Step 2: Initial Configuration

Run the initialization command to set up your configuration:

```bash
homelab-proxy init
```

You'll be prompted to enter:

- **Domain name**: Your primary domain managed by Cloudflare (e.g., `example.com`)
- **Cloudflare API Token**: Your Cloudflare API token
- **DNS TTL**: Time to live for DNS records (default: `auto` - uses Cloudflare's automatic TTL)
- **NPM URL**: Your Nginx Proxy Manager URL (e.g., `http://192.168.1.100:81`)
- **NPM Email**: Your Nginx Proxy Manager email
- **NPM Password**: Your Nginx Proxy Manager password
- **Let's Encrypt Email**: Email for SSL certificates (optional)
- **WebSocket Support**: Whether to enable WebSocket support by default (recommended: Yes)

**Important**: This tool creates CNAME records that point to your apex domain. You must have an A record for your apex domain (e.g., `example.com`) pointing to your server's IP address. The tool will validate this A record exists before creating CNAME records.

### TTL (Time To Live) Options

The tool supports flexible TTL configuration:

- **`auto`** (recommended): Uses Cloudflare's automatic TTL management
- **Numeric value**: Sets a specific TTL in seconds (e.g., `300`, `3600`)

**Examples:**
```bash
# Using auto TTL (recommended)
"ttl": "auto"

# Using specific TTL
"ttl": 300
```

Cloudflare's automatic TTL provides optimal performance by dynamically adjusting TTL values based on various factors.

## Step 3: Create Your First Subdomain

Create a subdomain for a service (e.g., Grafana):

```bash
homelab-proxy create
```

Or use command-line options:

```bash
homelab-proxy create -s grafana -t 192.168.1.100:3000 --ssl
```

This will:
1. Create a DNS CNAME record: `grafana.example.com` → `example.com` (apex domain) with **Cloudflare proxy enabled**
2. Create a proxy host in NPM: `grafana.example.com` → `192.168.1.100:3000`
3. Request an SSL certificate (if `--ssl` flag is used)

**Note**: By default, the tool creates CNAME records that point to your apex domain with Cloudflare proxy enabled. This provides better performance, security, and DDoS protection. If you need DNS-only mode, use the `--no-proxy` flag.

## DNS Proxy Options

**Cloudflare Proxy Enabled (Default)**:
- Better performance with Cloudflare CDN
- DDoS protection and security features
- SSL/TLS encryption at the edge
- Hides your origin server IP

**DNS-Only Mode**:
- Direct DNS resolution without proxy
- Use when you need direct access to your server
- Required for some applications that don't work with proxies

```bash
# Create with proxy enabled (default)
homelab-proxy create -s grafana -t 192.168.1.100:3000 --ssl

# Create with DNS-only mode
homelab-proxy create -s grafana -t 192.168.1.100:3000 --ssl --no-proxy
```

## WebSocket Support

**WebSocket Enabled (Default)**:
- Supports modern web applications that use WebSockets
- Required for real-time features like live chat, notifications, etc.
- Works with applications like Home Assistant, Grafana, etc.

**WebSocket Disabled**:
- Use for traditional web applications that don't need WebSocket support
- Slightly reduces overhead for simple static websites

```bash
# Create with WebSocket support enabled (default)
homelab-proxy create -s grafana -t 192.168.1.100:3000 --ssl

# Create with WebSocket support disabled
homelab-proxy create -s static-site -t 192.168.1.100:8080 --ssl --no-websockets
```

## SSL Certificate Options

The tool provides flexible SSL certificate management:

### Create New SSL Certificate
```bash
# Request a new SSL certificate
homelab-proxy create -s grafana -t 192.168.1.100:3000 --ssl
```

### Use Existing SSL Certificate
```bash
# Use an existing SSL certificate by ID
homelab-proxy create -s grafana -t 192.168.1.100:3000 --ssl-cert 5
```

### List Available SSL Certificates
```bash
# View all SSL certificates in NPM
homelab-proxy list-certs
```

This will show you all available SSL certificates with their IDs, domains, and expiration dates.

### Set Default SSL Certificate
```bash
# Set a default SSL certificate to use for new proxy hosts
homelab-proxy set-default-ssl --id 5

# Or use interactive mode to select from available certificates
homelab-proxy set-default-ssl

# Clear the default SSL certificate
homelab-proxy set-default-ssl --clear
```

When you set a default SSL certificate, it will be automatically suggested when creating new proxy hosts. This is especially useful for wildcard certificates that can be used across multiple subdomains.

### Interactive SSL Selection
When using the interactive mode, you'll be prompted to choose between:
- Using the default SSL certificate (if one is configured)
- Creating a new SSL certificate
- Using an existing SSL certificate (with a list of available certificates)

**Benefits of using existing SSL certificates:**
- Faster proxy creation (no need to wait for certificate generation)
- Useful for wildcard certificates that cover multiple subdomains
- Avoids Let's Encrypt rate limits
- Consistent SSL configuration across multiple services

**Benefits of setting a default SSL certificate:**
- Streamlined workflow for users with wildcard certificates
- Consistent SSL configuration across all services
- One-click SSL setup for new proxy hosts
- Reduces the need to remember certificate IDs

## DNS Record Management

This tool works exclusively with **CNAME records** for optimal homelab management:

### How It Works
- **Apex Domain**: You must have an A record for your main domain (e.g., `example.com` → `192.168.1.100`)
- **Subdomains**: All subdomains are created as CNAME records pointing to your apex domain
- **Validation**: The tool automatically validates that an A record exists for your apex domain before creating CNAME records

### Benefits of CNAME-Only Approach
- **Simplified Management**: Only one IP address to manage (at the apex domain)
- **Easy IP Changes**: Change your IP once at the apex domain, all subdomains follow automatically
- **Reduced Configuration**: No need to specify IP addresses for each subdomain
- **Consistent Setup**: All subdomains inherit the same IP resolution path

### Example Structure
```
example.com          (A record)    → 192.168.1.100
grafana.example.com  (CNAME)       → example.com
nextcloud.example.com (CNAME)      → example.com
plex.example.com     (CNAME)       → example.com
```

**Note**: If you need to change your server's IP address, you only need to update the A record for your apex domain, and all CNAME records will automatically resolve to the new IP.

## Step 4: Verify Setup

Check that everything is working:

```bash
homelab-proxy list
```

This will show all your DNS records and proxy hosts.

## Step 5: Cleanup Stale Records

Over time, you might have subdomains that are no longer active. The cleanup command helps you identify and remove these stale records:

```bash
homelab-proxy cleanup
```

This command will:
1. Check all CNAME records for availability (excluding DKIM records)
2. Test each domain with HTTP/HTTPS requests
3. Mark records as STALE if they timeout or return 5xx errors
4. Give you the option to remove stale records from both Cloudflare and NPM

**Note**: The cleanup command automatically excludes DKIM records (domains containing "_domainkey") from health checks, as these are essential for email authentication and should not be removed.

### Cleanup Options

```bash
# Dry run - see what would be cleaned up without making changes
homelab-proxy cleanup --dry-run

# Custom timeout (default: 5000ms)
homelab-proxy cleanup --timeout 10000

# Auto-remove stale records without prompting
homelab-proxy cleanup --auto-remove
```

### What Makes a Record "Stale"

A record is considered stale if:
- Connection times out
- DNS resolution fails
- Server returns 5xx errors (500, 502, 503, 504)
- Connection is refused

Records returning 404, 403, or other 4xx errors are considered healthy (the service is running but the path might not exist).

## Automated Cleanup

You can schedule the cleanup to run automatically using cron:

```bash
# Run cleanup daily at 2 AM
0 2 * * * /usr/bin/node /path/to/homelab-proxy-helper/src/index.js cleanup --auto-remove

# Run cleanup weekly with custom timeout
0 2 * * 0 /usr/bin/node /path/to/homelab-proxy-helper/src/index.js cleanup --auto-remove --timeout 15000
```

For production environments, you can use the scheduled cleanup script:

```bash
# Set environment variables for automated cleanup
export AUTO_CLEANUP=true
export CLEANUP_TIMEOUT=10000
export WEBHOOK_URL=https://your-webhook-url.com/notify

# Run the scheduled cleanup script
node examples/scheduled-cleanup.js
```

## Common Examples

### Web Services
```bash
# Nextcloud with new SSL certificate
homelab-proxy create -s nextcloud -t 192.168.1.101:80 --ssl --force-ssl

# Home Assistant with existing SSL certificate
homelab-proxy create -s homeassistant -t 192.168.1.102:8123 --ssl-cert 3

# Plex with new SSL certificate
homelab-proxy create -s plex -t 192.168.1.103:32400 --ssl
```

### Development Services
```bash
# Local development server
homelab-proxy create -s dev -t localhost:3000

# API server
homelab-proxy create -s api -t 192.168.1.104:8080 --ssl
```

### Monitoring Services
```bash
# Grafana
homelab-proxy create -s grafana -t 192.168.1.105:3000 --ssl

# Prometheus
homelab-proxy create -s prometheus -t 192.168.1.105:9090 --ssl
```

## Configuration File

Your configuration is stored in `~/.homelab-proxy/config.json`. You can edit this file directly or use the `init` command to reconfigure.

## Troubleshooting

### Common Issues

1. **"Configuration file not found"**
   - Run `homelab-proxy init` to create the configuration

2. **"Authentication failed"**
   - Check your Cloudflare API token permissions
   - Verify NPM credentials are correct

3. **"Domain not found"**
   - Ensure your domain is managed by Cloudflare
   - Check the domain spelling in your configuration

4. **"DNS record already exists"**
   - The tool will use the existing record
   - Use `homelab-proxy list` to see current records

5. **"SSL certificate failed"**
   - Ensure your domain is accessible from the internet
   - Check Let's Encrypt rate limits
   - Verify port 80 is accessible for HTTP-01 challenge

### Debug Mode

Enable debug logging for more information:

```bash
DEBUG=true homelab-proxy create -s test -t 192.168.1.100:8080
```

## Next Steps

- Explore the full CLI with `homelab-proxy --help`
- Set up monitoring for your services
- Configure advanced proxy settings in NPM
- Automate with scripts or CI/CD pipelines

## Getting Help

- Check the [README](./README.md) for detailed documentation
- Create an issue on GitHub for bugs or feature requests
- Join the community discussions

Happy homelabbing! 🏠🔧
