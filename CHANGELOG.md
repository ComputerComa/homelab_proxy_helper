# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **GitHub Releases**: Fixed GitHub Actions workflow to properly mark releases as stable (not prereleases)

## [1.5.0] - 2025-07-14

### Added
- **Basic Auth Support**: Added basic authentication support for cleanup health checks
- **CLI Basic Auth Options**: Added `--basic-auth-username` and `--basic-auth-password` options to cleanup command
- **Config Basic Auth**: Added basic auth configuration during initialization
- **Sorted Lists**: Proxy hosts and SSL certificates are now sorted by ID for better organization
- **Enhanced Health Check Display**: Cleanup command now shows detailed tables with HTTP status codes, response times, and protocols for both healthy and stale records

### Fixed
- **List Sorting**: Fixed proxy host and SSL certificate lists to display in ID order
- **Status Code Display**: Added HTTP status codes to cleanup warning messages and detailed tables

## [1.4.1] - 2025-07-11

### Fixed
- Minor bug fixes and stability improvements
- Updated dependencies for better compatibility

## [1.4.0] - 2025-07-11

### Added
- **WebSocket Support**: Added WebSocket support for proxy hosts with configurable options
- **Improved CLI Output**: Enhanced list command with human-readable table format
- **JSON Output Option**: Added `--json` flag for raw JSON output in list and list-certs commands
- **Interactive WebSocket Prompt**: Added interactive prompt for WebSocket configuration when creating proxy hosts
- **WebSocket Status Display**: Added WebSocket status column in proxy host table output
- **Color-coded Status**: Improved visual feedback with color-coded status indicators

### Changed
- **Default WebSocket Behavior**: WebSocket support is now enabled by default for new proxy hosts
- **Proxy Host Listing**: Fixed proxy host data mapping to show correct information (no more N/A entries)
- **Table Output**: Replaced simple text output with formatted tables for better readability
- **Configuration Options**: Added WebSocket configuration options to config file and CLI flags

### Fixed
- **Proxy Host Data**: Fixed issue where proxy host list showed incorrect or missing data
- **Error Handling**: Improved error handling and logging for proxy host operations
- **CLI Output**: Fixed formatting issues in command output

## [1.3.0] - 2025-07-10

### Added
- **Cross-platform Builds**: Added support for building standalone executables for Windows, Linux, and macOS
- **Automated Releases**: Implemented GitHub Actions workflow for automated builds and releases
- **Build Scripts**: Added comprehensive build scripts for different platforms
- **PKG Configuration**: Added PKG configuration for standalone executable generation

### Changed
- **Build Process**: Updated build process to support cross-platform executable generation
- **CI/CD Pipeline**: Enhanced continuous integration with automated testing and building

## [1.2.0] - 2025-07-09

### Added
- **SSL Certificate Management**: Added comprehensive SSL certificate handling
- **List Certificates Command**: Added `list-certs` command to display all SSL certificates
- **Set Default SSL**: Added `set-default-ssl` command to configure default SSL certificates
- **SSL Certificate Selection**: Added option to use existing SSL certificates when creating proxy hosts
- **Interactive SSL Selection**: Added interactive prompts for SSL certificate selection

### Enhanced
- **CLI Interactivity**: Improved interactive CLI with better menu system
- **Configuration Management**: Enhanced configuration system with SSL-related options
- **Error Handling**: Better error handling for SSL certificate operations

## [1.1.0] - 2025-07-08

### Added
- **Health Check System**: Implemented comprehensive health checking for proxy hosts
- **Cleanup Command**: Added intelligent cleanup system for stale DNS records and proxy hosts
- **Stale Record Detection**: Added ability to detect and mark stale/unreachable records
- **Interactive Cleanup**: Added interactive prompts for cleanup operations
- **DKIM Record Protection**: Added protection for DKIM records during cleanup operations

### Enhanced
- **DNS Management**: Improved DNS record management with better validation
- **Proxy Host Management**: Enhanced proxy host operations with health checking
- **Logging System**: Improved logging with better categorization and formatting

### Fixed
- **DNS Record Handling**: Fixed issues with DNS record creation and validation
- **Proxy Host Status**: Improved proxy host status detection and reporting

## [1.0.0] - 2025-07-07

### Added
- **Initial Release**: First stable release of homelab-proxy-helper
- **Core CLI Framework**: Implemented basic CLI structure with Commander.js
- **Cloudflare Integration**: Added Cloudflare DNS management capabilities
- **Nginx Proxy Manager Integration**: Added NPM API integration for proxy management
- **Configuration System**: Implemented YAML-based configuration management
- **Basic Commands**: Added core commands: init, create, list, delete, config
- **DNS Record Management**: Added support for CNAME and A record management
- **Proxy Host Management**: Added proxy host creation and management
- **Flexible TTL Support**: Added support for auto and numeric TTL values
- **Input Validation**: Implemented comprehensive input validation
- **Error Handling**: Added robust error handling and logging
- **Interactive Setup**: Added interactive configuration setup
- **Environment Support**: Added support for environment variables and .env files

### Features
- **Multi-provider Support**: Designed with extensibility for multiple DNS providers
- **Flexible Configuration**: Support for both CLI arguments and configuration files
- **Domain Validation**: Comprehensive domain and subdomain validation
- **SSL Integration**: Basic SSL certificate support with NPM
- **Logging System**: Structured logging with different levels
- **Cross-platform**: Compatible with Windows, Linux, and macOS

## [0.1.0] - 2025-07-06

### Added
- **Project Initialization**: Initial project setup and structure
- **Basic Dependencies**: Added core dependencies (axios, chalk, commander, etc.)
- **Development Environment**: Set up development tools (ESLint, Jest, Prettier)
- **Testing Framework**: Implemented Jest testing framework
- **Code Quality**: Added linting and formatting tools
- **Documentation**: Created initial README and getting started guide

---

## Legend

- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements
- **Enhanced**: Improvements to existing features

## Version Links

- [1.4.1]: Latest version with bug fixes and improvements
- [1.4.0]: Major release with WebSocket support and improved CLI
- [1.3.0]: Cross-platform builds and automated releases
- [1.2.0]: SSL certificate management features
- [1.1.0]: Health check system and cleanup functionality
- [1.0.0]: Initial stable release
- [0.1.0]: Project initialization and setup
