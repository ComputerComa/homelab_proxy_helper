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

## Step 2: Initial Configuration

Run the initialization command to set up your configuration:

```bash
homelab-proxy init
```

You'll be prompted to enter:

- **Domain name**: Your primary domain managed by Cloudflare (e.g., `example.com`)
- **Cloudflare API Token**: Your Cloudflare API token
- **Default IP**: The IP address of your homelab server (e.g., `192.168.1.100`)
- **Cloudflare Proxy**: Whether to enable Cloudflare proxy (usually `false` for homelab)
- **DNS TTL**: Time to live for DNS records (default: `300`)
- **NPM URL**: Your Nginx Proxy Manager URL (e.g., `http://192.168.1.100:81`)
- **NPM Email**: Your Nginx Proxy Manager email
- **NPM Password**: Your Nginx Proxy Manager password
- **Let's Encrypt Email**: Email for SSL certificates (optional)

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
1. Create a DNS CNAME record: `grafana.example.com` → `example.com` (apex domain)
2. Create a proxy host in NPM: `grafana.example.com` → `192.168.1.100:3000`
3. Request an SSL certificate (if `--ssl` flag is used)

**Note**: By default, the tool creates CNAME records that point to your apex domain. This is ideal for homelab setups where you have one A record for your main domain and CNAME records for subdomains.

## DNS Record Types

The tool supports two types of DNS records:

### CNAME Records (Default)
- Points subdomain to your apex domain (e.g., `grafana.example.com` → `example.com`)
- Ideal for homelab setups with one main A record
- Cannot be proxied through Cloudflare
- Automatically inherits the IP address of your apex domain

### A Records
- Points subdomain directly to an IP address (e.g., `grafana.example.com` → `192.168.1.100`)
- Useful when you need different IP addresses for different services
- Can be proxied through Cloudflare

To create an A record instead of CNAME:
```bash
homelab-proxy create -s grafana -t 192.168.1.100:3000 --record-type A --dns-target 192.168.1.100
```

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
1. Check all CNAME records for availability
2. Test each domain with HTTP/HTTPS requests
3. Mark records as STALE if they timeout or return 5xx errors
4. Give you the option to remove stale records from both Cloudflare and NPM

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
# Nextcloud
homelab-proxy create -s nextcloud -t 192.168.1.101:80 --ssl --force-ssl

# Home Assistant
homelab-proxy create -s homeassistant -t 192.168.1.102:8123 --ssl

# Plex
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
