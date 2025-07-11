#!/usr/bin/env node

/**
 * Example cleanup script for Homelab Proxy Helper
 * This script demonstrates how to use the cleanup functionality programmatically
 */

const { CloudflareManager } = require('../src/services/cloudflare');
const { ConfigManager } = require('../src/utils/config');
const { checkRecordHealth, generateHealthReport } = require('../src/utils/health-check');
const { Logger } = require('../src/utils/logger');

async function exampleCleanup() {
  const logger = new Logger();
  
  try {
    // Load configuration
    const configManager = new ConfigManager();
    const config = await configManager.getConfig();
    
    logger.info('Starting health check example...');
    
    // Initialize Cloudflare service
    const cloudflare = new CloudflareManager(config.cloudflare);
    
    // Get all DNS records
    const dnsRecords = await cloudflare.listDnsRecords();
    const cnameRecords = dnsRecords.filter(record => record.type === 'CNAME');
    
    logger.info(`Found ${cnameRecords.length} CNAME records to check`);
    
    // Check health of each record
    const healthResults = [];
    
    for (const record of cnameRecords) {
      logger.info(`Checking ${record.name}...`);
      
      const health = await checkRecordHealth(record.name, 5000);
      healthResults.push({
        record,
        health
      });
      
      if (health.isHealthy) {
        logger.success(`✓ ${record.name} is healthy (${health.statusCode})`);
      } else {
        logger.warn(`⚠ ${record.name} is stale (${health.error})`);
      }
    }
    
    // Generate health report
    const report = generateHealthReport(healthResults.map(r => r.health));
    
    logger.header('Health Check Report');
    logger.info(`Total records: ${report.summary.total}`);
    logger.success(`Healthy records: ${report.summary.healthy}`);
    logger.warn(`Stale records: ${report.summary.stale}`);
    logger.info(`Health percentage: ${report.summary.healthyPercentage}%`);
    
    // Display detailed results
    console.log('\n--- Healthy Records ---');
    report.details.healthy.forEach(record => {
      console.log(`✓ ${record.hostname} - ${record.statusCode} (${record.responseTime}ms)`);
    });
    
    console.log('\n--- Stale Records ---');
    report.details.stale.forEach(record => {
      console.log(`⚠ ${record.hostname} - ${record.error}`);
    });
    
    // Example: Save report to file
    const fs = require('fs').promises;
    const reportPath = `health-report-${Date.now()}.json`;
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    logger.info(`Health report saved to ${reportPath}`);
    
    logger.success('Health check completed successfully!');
    
  } catch (error) {
    logger.error('Health check failed:', error.message);
    process.exit(1);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  exampleCleanup();
}

module.exports = { exampleCleanup };
