#!/usr/bin/env node

/**
 * Scheduled cleanup script for Homelab Proxy Helper
 * This script can be run via cron to automatically clean up stale records
 * 
 * Example cron job (run daily at 2 AM):
 * 0 2 * * * /usr/bin/node /path/to/homelab-proxy-helper/examples/scheduled-cleanup.js
 */

const { CloudflareManager } = require('../src/services/cloudflare');
const { NginxProxyManager } = require('../src/services/nginx-proxy-manager');
const { ConfigManager } = require('../src/utils/config');
const { checkRecordHealth } = require('../src/utils/health-check');
const { Logger } = require('../src/utils/logger');

async function scheduledCleanup() {
  const logger = new Logger();
  
  try {
    logger.info('Starting scheduled cleanup...');
    
    // Load configuration
    const configManager = new ConfigManager();
    const config = await configManager.getConfig();
    
    const cloudflare = new CloudflareManager(config.cloudflare);
    const npm = new NginxProxyManager(config.nginxProxyManager);
    
    // Get all CNAME records
    const dnsRecords = await cloudflare.listDnsRecords();
    const cnameRecords = dnsRecords.filter(record => record.type === 'CNAME');
    
    logger.info(`Checking ${cnameRecords.length} CNAME records...`);
    
    // Check health with longer timeout for scheduled runs
    const staleRecords = [];
    const timeout = parseInt(process.env.CLEANUP_TIMEOUT || '10000');
    
    for (const record of cnameRecords) {
      const health = await checkRecordHealth(record.name, timeout);
      
      if (!health.isHealthy) {
        staleRecords.push({ record, health });
        logger.warn(`Stale record found: ${record.name} (${health.error})`);
      }
    }
    
    logger.info(`Found ${staleRecords.length} stale records`);
    
    // Only proceed with cleanup if there are stale records
    if (staleRecords.length === 0) {
      logger.info('No stale records found. Cleanup not needed.');
      return;
    }
    
    // Check if auto-cleanup is enabled
    const autoCleanup = process.env.AUTO_CLEANUP === 'true';
    
    if (!autoCleanup) {
      logger.info('Auto-cleanup is disabled. Set AUTO_CLEANUP=true to enable automatic removal.');
      logger.info('Stale records that would be removed:');
      staleRecords.forEach(({ record, health }) => {
        logger.warn(`  - ${record.name} (${health.error})`);
      });
      return;
    }
    
    // Perform cleanup
    logger.info('Auto-cleanup enabled. Removing stale records...');
    
    let removedCount = 0;
    
    for (const { record, health } of staleRecords) {
      try {
        const subdomain = record.name.split('.')[0];
        const domain = record.name.substring(subdomain.length + 1);
        
        // Remove from Cloudflare
        await cloudflare.deleteDnsRecord(subdomain, domain);
        
        // Try to remove from NPM
        try {
          await npm.deleteProxyHost(subdomain, domain);
        } catch (error) {
          logger.warn(`Could not remove proxy host for ${record.name}: ${error.message}`);
        }
        
        removedCount++;
        logger.success(`Removed ${record.name} (${health.error})`);
        
      } catch (error) {
        logger.error(`Failed to remove ${record.name}: ${error.message}`);
      }
    }
    
    logger.success(`Scheduled cleanup completed! Removed ${removedCount} of ${staleRecords.length} stale records.`);
    
    // Send notification if configured
    if (process.env.WEBHOOK_URL && removedCount > 0) {
      await sendNotification(process.env.WEBHOOK_URL, {
        message: `Homelab Proxy Helper: Cleaned up ${removedCount} stale records`,
        records: staleRecords.map(s => ({ name: s.record.name, error: s.health.error }))
      });
    }
    
  } catch (error) {
    logger.error('Scheduled cleanup failed:', error.message);
    
    // Send error notification if configured
    if (process.env.WEBHOOK_URL) {
      await sendNotification(process.env.WEBHOOK_URL, {
        message: `Homelab Proxy Helper: Cleanup failed - ${error.message}`,
        error: true
      });
    }
    
    process.exit(1);
  }
}

async function sendNotification(webhookUrl, data) {
  try {
    const axios = require('axios');
    await axios.post(webhookUrl, data);
    console.log('Notification sent successfully');
  } catch (error) {
    console.error('Failed to send notification:', error.message);
  }
}

// Run the scheduled cleanup
scheduledCleanup();
