#!/usr/bin/env node

/**
 * Example usage of the Homelab Proxy Helper
 * This script demonstrates how to use the tool programmatically
 */

const { CloudflareManager } = require('../src/services/cloudflare');
const { NginxProxyManager } = require('../src/services/nginx-proxy-manager');
const { ConfigManager } = require('../src/utils/config');
const { Logger } = require('../src/utils/logger');

async function exampleUsage() {
  const logger = new Logger();
  
  try {
    // Load configuration
    const configManager = new ConfigManager();
    const config = await configManager.getConfig();
    
    logger.info('Configuration loaded successfully');
    
    // Initialize services
    const cloudflare = new CloudflareManager(config.cloudflare);
    const npm = new NginxProxyManager(config.nginxProxyManager);
    
    // Example: Create a subdomain for Grafana
    const subdomain = 'grafana';
    const domain = config.defaultDomain;
    const target = '192.168.1.100:3000';
    
    logger.info(`Creating subdomain: ${subdomain}.${domain}`);
    
    // Step 1: Create DNS record (CNAME by default)
    logger.startSpinner('Creating CNAME record...');
    const dnsRecord = await cloudflare.createCnameRecord(subdomain, domain);
    logger.stopSpinner(`CNAME record created: ${dnsRecord.name} -> ${domain}`);
    
    // Step 2: Create proxy host
    logger.startSpinner('Creating proxy host...');
    const proxyHost = await npm.createProxyHost({
      subdomain: subdomain,
      domain: domain,
      target: target,
      ssl: true,
      forceSsl: true
    });
    logger.stopSpinner(`Proxy host created with ID: ${proxyHost.id}`);
    
    logger.success('Setup completed successfully!');
    
    // Example: List all configurations
    logger.info('Current DNS records:');
    const dnsRecords = await cloudflare.listDnsRecords();
    console.table(dnsRecords);
    
    logger.info('Current proxy hosts:');
    const proxyHosts = await npm.listProxyHosts();
    console.table(proxyHosts);
    
  } catch (error) {
    logger.error('Example failed:', error.message);
    process.exit(1);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  exampleUsage();
}

module.exports = { exampleUsage };
