# Homelab- 🔧 **Ngi- 🌐 **Cloudflare Integration**: Automatically create CNAME DNS records for your subdomains
- 🔧 **Nginx Proxy Manager Integration**: Create proxy host configurations automatically
- 🔐 **SSL Certificate Management**: Automatically request Let's Encrypt certificates or use existing ones
- 🎯 **Default SSL Certificate**: Set a default SSL certificate for streamlined proxy creation
- 🌐 **Cloudflare Proxy Support**: CNAME records created with proxy enabled by default for better performance and security
- 🔌 **WebSocket Support**: Enable WebSocket support for modern web applications (enabled by default)
- 🎮 **Interactive Menu**: User-friendly menu system when no command is provided
- 📦 **Standalone Executables**: Cross-platform binaries that don't require Node.js
- 📋 **Interactive CLI**: User-friendly prompts for easy configuration
- 🎯 **Bulk Operations**: List and manage multiple domains and proxy hosts
- ⚡ **Fast Setup**: One command to create complete subdomain + proxy setup
- 🧹 **Automated Cleanup**: Health monitoring and automatic removal of stale records
- 🔄 **CNAME-Only**: Optimized for homelab setups with CNAME records pointing to apex domainnager Integration**: Create proxy host configurations automatically
- 🔐 **SSL Certificate Management**: Automatically request Let's Encrypt certificates or use existing ones
- 🎯 **Default SSL Certificate**: Set a default SSL certificate for streamlined proxy creation
- 🌐 **Cloudflare Proxy Support**: CNAME records created with proxy enabled by default for better performance and security
- 🎮 **Interactive Menu**: User-friendly menu system when no command is provided
- 📦 **Standalone Executables**: Cross-platform binaries that don't require Node.js
- 📋 **Interactive CLI**: User-friendly prompts for easy configuration
- 🎯 **Bulk Operations**: List and manage multiple domains and proxy hosts
- ⚡ **Fast Setup**: One command to create complete subdomain + proxy setup
- 🧹 **Automated Cleanup**: Health monitoring and automatic removal of stale records
- 🔄 **CNAME-Only**: Optimized for homelab setups with CNAME records pointing to apex domain
- ✅ **A Record Validation**: Automatically validates that apex domain has proper A recorder

A Node.js command-line tool to automate the creation of subdomains and Nginx Proxy Manager configurations for homelab projects. This tool integrates with Cloudflare's DNS API and Nginx Proxy Manager's API to streamline the process of setting up reverse proxies for your homelab services.

The tool creates CNAME records that point to your apex domain, which is ideal for homelab setups where you have one A record for your main domain and CNAME records for all your services. This approach simplifies IP management and provides a consistent setup.

## Features

- 🌐 **Cloudflare Integration**: Automatically create CNAME DNS records for your subdomains
- 🔧 **Nginx Proxy Manager Integration**: Create proxy host configurations automatically
- 🔐 **SSL Certificate Management**: Automatically request Let's Encrypt certificates or use existing ones
- 🎯 **Default SSL Certificate**: Set a default SSL certificate for streamlined proxy creation
- 🎮 **Interactive Menu**: User-friendly menu system when no command is provided
- � **Standalone Executables**: Cross-platform binaries that don't require Node.js
- �📋 **Interactive CLI**: User-friendly prompts for easy configuration
- 🎯 **Bulk Operations**: List and manage multiple domains and proxy hosts
- ⚡ **Fast Setup**: One command to create complete subdomain + proxy setup
- 🧹 **Automated Cleanup**: Health monitoring and automatic removal of stale records
- 🔄 **CNAME-Only**: Optimized for homelab setups with CNAME records pointing to apex domain
- ✅ **A Record Validation**: Automatically validates that apex domain has proper A record

## Prerequisites

- Node.js 16 or higher
- Cloudflare account with API access
- Nginx Proxy Manager instance
- Domain managed by Cloudflare

## Installation

### Option 1: Standalone Executable (Recommended)
Download the appropriate executable for your platform from the [releases page](https://github.com/ComputerComa/homelab_proxy_helper/releases):

- **Windows**: `homelab-proxy-win.exe`
- **Linux**: `homelab-proxy-linux`
- **macOS**: `homelab-proxy-macos`

No Node.js installation required! The executables are self-contained.

### Option 2: Global Installation
```bash
npm install -g homelab-proxy-helper
```

### Option 3: Local Development
```bash
git clone https://github.com/yourusername/homelab-proxy-helper.git
cd homelab-proxy-helper
npm install
npm link
```

### Option 4: Build Your Own Executables
```bash
# Clone the repository
git clone https://github.com/ComputerComa/homelab_proxy_helper.git
cd homelab-proxy-helper
npm install

# Build for all platforms
npm run build

# Or build for specific platform
npm run build:win    # Windows
npm run build:linux  # Linux
npm run build:macos  # macOS
```

See [BUILD.md](BUILD.md) for detailed build instructions.

## Quick Start

### Interactive Mode
Simply run the command without any arguments to access the interactive menu:

```bash
homelab-proxy
```

This will show a user-friendly menu with all available options:
- 🚀 Create new subdomain and proxy
- 📋 List all domains and proxies
- 🗑️ Delete subdomain and proxy
- 🧹 Cleanup stale records
- 🔒 List SSL certificates
- ⚙️ Set default SSL certificate
- 🔧 Show/Edit configuration
- 🔄 Initialize/Reconfigure
- ❌ Exit

### Command Line Mode
1. **Initialize configuration**:
   ```bash
   homelab-proxy init
   ```

2. **Create a new subdomain and proxy**:
   ```bash
   homelab-proxy create
   ```

3. **List existing configurations**:
   ```bash
   homelab-proxy list
   ```

## Commands

### `homelab-proxy init`
Initialize the tool configuration. This command will prompt you for:
- Cloudflare API token
- Default IP address for DNS records
- Nginx Proxy Manager URL and credentials
- Primary domain name
- SSL configuration preferences
- WebSocket support default setting

### `homelab-proxy create [options]`
Create a new subdomain and proxy configuration.

**Options:**
- `-s, --subdomain <subdomain>` - Subdomain name
- `-t, --target <target>` - Target host:port
- `-d, --domain <domain>` - Domain name (uses default if not specified)
- `--ssl` - Enable SSL certificate
- `--force-ssl` - Force SSL redirect
- `--ssl-cert <id>` - Use existing SSL certificate by ID
- `--no-proxy` - Disable Cloudflare proxy (DNS-only mode)
- `--no-websockets` - Disable WebSocket support
- `--list-certs` - List available SSL certificates

**Examples:**
```bash
# Interactive mode
homelab-proxy create

# Create CNAME record with proxy enabled (default)
homelab-proxy create -s grafana -t 192.168.1.100:3000 --ssl

# Create CNAME record with proxy disabled (DNS-only)
homelab-proxy create -s grafana -t 192.168.1.100:3000 --ssl --no-proxy

# Disable WebSocket support
homelab-proxy create -s api -t 192.168.1.100:8080 --ssl --no-websockets

# Use existing SSL certificate
homelab-proxy create -s nextcloud -t 192.168.1.101:8080 --ssl-cert 123

# Full specification with CNAME
homelab-proxy create -s nextcloud -t 192.168.1.101:8080 -d example.com --ssl --force-ssl
```

### `homelab-proxy list`
List all managed DNS records and proxy hosts in a formatted table.

**Shows:**
- **DNS Records**: Name, Type, Content, TTL, Proxied status
- **Proxy Hosts**: ID, Domain, Forward To, SSL status, WebSocket status, Enabled status

**Options:**
- `-j, --json` - Output in JSON format instead of table format

**Examples:**
```bash
# List in table format (default)
homelab-proxy list

# List in JSON format
homelab-proxy list --json
```

### `homelab-proxy delete [options]`
Delete a subdomain and its proxy configuration.

**Options:**
- `-s, --subdomain <subdomain>` - Subdomain name to delete
- `-d, --domain <domain>` - Domain name

**Examples:**
```bash
# Interactive mode
homelab-proxy delete

# With options
homelab-proxy delete -s grafana -d example.com
```

### `homelab-proxy config`
Show current configuration.

### `homelab-proxy cleanup [options]`
Check all CNAME records for availability and remove stale entries. Automatically excludes DKIM records (domains containing "_domainkey").

**Options:**
- `--dry-run` - Show what would be cleaned up without making changes
- `--timeout <ms>` - HTTP timeout in milliseconds (default: 5000)
- `--auto-remove` - Automatically remove stale records without prompting

**Examples:**
```bash
# Interactive cleanup
homelab-proxy cleanup

# Dry run to see what would be cleaned up
homelab-proxy cleanup --dry-run

# Custom timeout and auto-remove
homelab-proxy cleanup --timeout 10000 --auto-remove
```

The cleanup command tests each CNAME record by making HTTP/HTTPS requests. Records are marked as stale if they:
- Timeout or connection is refused
- Return 5xx server errors
- Fail DNS resolution

Records returning 4xx errors (like 404) are considered healthy since the service is responding. DKIM records (containing "_domainkey") are automatically excluded from cleanup.

### `homelab-proxy list-certs`
List all SSL certificates in Nginx Proxy Manager in a formatted table.

**Options:**
- `-j, --json` - Output in JSON format instead of table format

**Examples:**
```bash
# List SSL certificates in table format (default)
homelab-proxy list-certs

# List SSL certificates in JSON format
homelab-proxy list-certs --json
```

### `homelab-proxy set-default-ssl [options]`
Set a default SSL certificate to use for new proxy hosts.

**Options:**
- `-i, --id <id>` - SSL certificate ID to set as default
- `--clear` - Clear the default SSL certificate

**Examples:**
```bash
# Set default SSL certificate by ID
homelab-proxy set-default-ssl --id 5

# Interactive mode to select from available certificates
homelab-proxy set-default-ssl

# Clear the default SSL certificate
homelab-proxy set-default-ssl --clear
```

When a default SSL certificate is set, it will be automatically suggested when creating new proxy hosts. This is especially useful for wildcard certificates that can be used across multiple subdomains.

## Configuration

The tool stores configuration in `~/.homelab-proxy/config.json`. You can modify this file directly or use the `init` command to reconfigure.

### Configuration Structure
```json
{
  "version": "1.0.0",
  "defaultDomain": "example.com",
  "cloudflare": {
    "apiToken": "your_token_here",
    "domains": ["example.com"],
    "defaultIp": "192.168.1.100",
    "proxied": false,
    "ttl": "auto"
  },
  "nginxProxyManager": {
    "url": "http://localhost:81",
    "email": "admin@example.com",
    "password": "your_password",
    "letsencryptEmail": "admin@example.com"
  }
}
```

## Environment Variables

You can also use environment variables for configuration:

```bash
# Cloudflare
export CLOUDFLARE_API_TOKEN=your_token_here
export CLOUDFLARE_DEFAULT_IP=192.168.1.100

# Nginx Proxy Manager
export NPM_URL=http://localhost:81
export NPM_EMAIL=admin@example.com
export NPM_PASSWORD=your_password

# Default domain
export DEFAULT_DOMAIN=example.com
```

## API Requirements

### Cloudflare API Token
1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Create a token with the following permissions:
   - Zone:Zone:Read
   - Zone:DNS:Edit
3. Include your domain in the Zone Resources

### Nginx Proxy Manager
- Ensure your NPM instance is accessible
- Use admin credentials or create a dedicated user
- API should be available at `http://your-npm-instance/api`

## Common Use Cases

### Setting up a new service
```bash
# Create DNS record and proxy for Grafana
homelab-proxy create -s grafana -t 192.168.1.100:3000 --ssl

# Create DNS record and proxy for Nextcloud
homelab-proxy create -s nextcloud -t 192.168.1.101:8080 --ssl --force-ssl
```

### Managing multiple domains
```bash
# Create subdomain on specific domain
homelab-proxy create -s api -t 192.168.1.102:8000 -d api.example.com --ssl
```

### Bulk operations
```bash
# List all current configurations
homelab-proxy list

# Clean up unused subdomains
homelab-proxy delete -s old-service
```

### Maintenance Tasks
```bash
# Clean up stale records (dry run first)
homelab-proxy cleanup --dry-run

# Clean up stale records with confirmation
homelab-proxy cleanup

# Automated cleanup
homelab-proxy cleanup --auto-remove --timeout 10000
```

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Verify Cloudflare API token has correct permissions
   - Check NPM credentials are correct
   - Ensure NPM instance is accessible

2. **DNS Record Already Exists**
   - Tool will use existing record if found
   - Use `homelab-proxy list` to see current records

3. **SSL Certificate Failed**
   - Check domain is accessible from internet
   - Verify Let's Encrypt rate limits haven't been exceeded
   - Ensure port 80 is accessible for HTTP-01 challenge

### Debug Mode
Enable debug logging:
```bash
DEBUG=true homelab-proxy create -s test -t 192.168.1.100:8080
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Security Considerations

- API tokens and passwords are stored locally in `~/.homelab-proxy/config.json`
- Ensure proper file permissions on configuration file
- Consider using environment variables for sensitive data
- Regularly rotate API tokens and passwords

## License

MIT License - see LICENSE file for details.

## Support

- Create an issue on GitHub for bugs or feature requests
- Check existing issues before creating new ones
- Provide detailed information about your environment and the issue

## Roadmap

- [x] **Health monitoring and cleanup** - Automatically detect and remove stale records
- [ ] Support for multiple DNS providers
- [ ] Backup and restore configurations
- [ ] Template support for common service types
- [ ] Integration with Docker labels
- [ ] Web UI for configuration management
- [ ] Advanced SSL certificate management
- [ ] Scheduled health checks and notifications

## DNS Record Types

The tool supports two types of DNS records:

### CNAME Records (Default)
- **Recommended for homelab setups**
- Points subdomain to your apex domain (e.g., `grafana.example.com` → `example.com`)
- Automatically inherits the IP address of your apex domain
- Easier to manage - change one A record and all CNAME records follow
- Cannot be proxied through Cloudflare

### A Records
- Points subdomain directly to an IP address
- Useful when you need different IP addresses for different services
- Can be proxied through Cloudflare
- More direct but requires individual IP management

**Example Setup:**
```
# Your main domain (A record)
example.com → 192.168.1.100

# Your services (CNAME records)
grafana.example.com → example.com
nextcloud.example.com → example.com
homeassistant.example.com → example.com
```

### TTL Configuration

The tool supports Cloudflare's automatic TTL setting:

- **`"auto"`** or **`1`**: Uses Cloudflare's automatic TTL (recommended)
- **Numeric values**: Sets specific TTL in seconds (e.g., `300`, `3600`)

Automatic TTL provides optimal performance by letting Cloudflare manage TTL values dynamically.

