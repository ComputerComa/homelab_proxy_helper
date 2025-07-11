#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const packageInfo = require('../package.json');
const { CloudflareManager } = require('./services/cloudflare');
const { NginxProxyManager } = require('./services/nginx-proxy-manager');
const { ConfigManager } = require('./utils/config');
const { Logger } = require('./utils/logger');
const { validateConfig } = require('./utils/validation');

const program = new Command();
const logger = new Logger();

program
  .name('homelab-proxy')
  .description('CLI tool to manage subdomains and Nginx Proxy Manager configurations for homelab projects')
  .version(packageInfo.version);

program
  .command('init')
  .description('Initialize configuration')
  .action(async () => {
    try {
      const configManager = new ConfigManager();
      await configManager.initConfig();
      logger.success('Configuration initialized successfully!');
    } catch (error) {
      logger.error('Failed to initialize configuration:', error.message);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Show current configuration')
  .action(async () => {
    try {
      const configManager = new ConfigManager();
      const config = await configManager.getConfig();
      console.log(chalk.cyan('Current Configuration:'));
      console.log(JSON.stringify(config, null, 2));
    } catch (error) {
      logger.error('Failed to load configuration:', error.message);
      process.exit(1);
    }
  });

program
  .command('create')
  .description('Create a new subdomain and proxy configuration')
  .option('-s, --subdomain <subdomain>', 'Subdomain name')
  .option('-t, --target <target>', 'Target host:port')
  .option('-d, --domain <domain>', 'Domain name')
  .option('--ssl', 'Enable SSL certificate')
  .option('--force-ssl', 'Force SSL redirect')
  .option('--record-type <type>', 'DNS record type (CNAME or A)', 'CNAME')
  .option('--dns-target <target>', 'DNS record target (for A records, specify IP; for CNAME, defaults to apex domain)')
  .action(async (options) => {
    try {
      const configManager = new ConfigManager();
      const config = await configManager.getConfig();
      
      if (!validateConfig(config)) {
        logger.error('Invalid configuration. Please run "homelab-proxy init" first.');
        process.exit(1);
      }

      const cloudflare = new CloudflareManager(config.cloudflare);
      const npm = new NginxProxyManager(config.nginxProxyManager);

      // Interactive prompts if options not provided
      if (!options.subdomain || !options.target) {
        const inquirer = require('inquirer');
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'subdomain',
            message: 'Enter subdomain name:',
            when: !options.subdomain
          },
          {
            type: 'input',
            name: 'target',
            message: 'Enter target (host:port):',
            when: !options.target
          },
          {
            type: 'input',
            name: 'domain',
            message: 'Enter domain name:',
            default: config.defaultDomain,
            when: !options.domain
          },
          {
            type: 'list',
            name: 'recordType',
            message: 'Select DNS record type:',
            choices: [
              { name: 'CNAME (points to apex domain)', value: 'CNAME' },
              { name: 'A (points to IP address)', value: 'A' }
            ],
            default: 'CNAME',
            when: !options.recordType
          },
          {
            type: 'input',
            name: 'dnsTarget',
            message: 'Enter DNS target (IP address):',
            default: config.cloudflare.defaultIp,
            when: (answers) => (answers.recordType === 'A' || options.recordType === 'A') && !options.dnsTarget
          },
          {
            type: 'confirm',
            name: 'ssl',
            message: 'Enable SSL certificate?',
            default: true,
            when: options.ssl === undefined
          },
          {
            type: 'confirm',
            name: 'forceSsl',
            message: 'Force SSL redirect?',
            default: true,
            when: options.forceSsl === undefined
          }
        ]);
        
        options = { ...options, ...answers };
      }

      logger.info(`Creating subdomain: ${options.subdomain}.${options.domain || config.defaultDomain}`);
      
      // Create DNS record
      const recordType = options.recordType || 'CNAME';
      const dnsTarget = options.dnsTarget || (recordType === 'A' ? config.cloudflare.defaultIp : null);
      
      if (recordType === 'CNAME') {
        await cloudflare.createCnameRecord(options.subdomain, options.domain || config.defaultDomain, dnsTarget);
        logger.success(`CNAME record created: ${options.subdomain}.${options.domain || config.defaultDomain} -> ${dnsTarget || (options.domain || config.defaultDomain)}`);
      } else {
        await cloudflare.createARecord(options.subdomain, options.domain || config.defaultDomain, dnsTarget);
        logger.success(`A record created: ${options.subdomain}.${options.domain || config.defaultDomain} -> ${dnsTarget}`);
      }

      // Create proxy host
      await npm.createProxyHost({
        subdomain: options.subdomain,
        domain: options.domain || config.defaultDomain,
        target: options.target,
        ssl: options.ssl,
        forceSsl: options.forceSsl
      });
      logger.success('Proxy host created successfully!');

    } catch (error) {
      logger.error('Failed to create configuration:', error.message);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all managed domains and proxy hosts')
  .action(async () => {
    try {
      const configManager = new ConfigManager();
      const config = await configManager.getConfig();
      
      const cloudflare = new CloudflareManager(config.cloudflare);
      const npm = new NginxProxyManager(config.nginxProxyManager);

      logger.info('Fetching DNS records...');
      const dnsRecords = await cloudflare.listDnsRecords();
      
      logger.info('Fetching proxy hosts...');
      const proxyHosts = await npm.listProxyHosts();

      console.log(chalk.cyan('\n=== DNS Records ==='));
      console.log(dnsRecords);

      console.log(chalk.cyan('\n=== Proxy Hosts ==='));
      console.log(proxyHosts);

    } catch (error) {
      logger.error('Failed to list configurations:', error.message);
      process.exit(1);
    }
  });

program
  .command('delete')
  .description('Delete a subdomain and proxy configuration')
  .option('-s, --subdomain <subdomain>', 'Subdomain name')
  .option('-d, --domain <domain>', 'Domain name')
  .action(async (options) => {
    try {
      const configManager = new ConfigManager();
      const config = await configManager.getConfig();
      
      if (!options.subdomain) {
        const inquirer = require('inquirer');
        const { subdomain } = await inquirer.prompt([
          {
            type: 'input',
            name: 'subdomain',
            message: 'Enter subdomain name to delete:'
          }
        ]);
        options.subdomain = subdomain;
      }

      const cloudflare = new CloudflareManager(config.cloudflare);
      const npm = new NginxProxyManager(config.nginxProxyManager);

      logger.info(`Deleting subdomain: ${options.subdomain}.${options.domain || config.defaultDomain}`);
      
      // Delete DNS record
      await cloudflare.deleteDnsRecord(options.subdomain, options.domain || config.defaultDomain);
      logger.success('DNS record deleted successfully!');

      // Delete proxy host
      await npm.deleteProxyHost(options.subdomain, options.domain || config.defaultDomain);
      logger.success('Proxy host deleted successfully!');

    } catch (error) {
      logger.error('Failed to delete configuration:', error.message);
      process.exit(1);
    }
  });

program
  .command('cleanup')
  .description('Check all CNAME records for availability and remove stale entries')
  .option('--dry-run', 'Show what would be cleaned up without making changes')
  .option('--timeout <ms>', 'HTTP timeout in milliseconds', '5000')
  .option('--auto-remove', 'Automatically remove stale records without prompting')
  .action(async (options) => {
    try {
      const configManager = new ConfigManager();
      const config = await configManager.getConfig();
      
      if (!validateConfig(config)) {
        logger.error('Invalid configuration. Please run "homelab-proxy init" first.');
        process.exit(1);
      }

      const cloudflare = new CloudflareManager(config.cloudflare);
      const npm = new NginxProxyManager(config.nginxProxyManager);
      const { checkRecordHealth } = require('./utils/health-check');

      logger.info('Starting cleanup process...');
      
      // Get all DNS records
      const dnsRecords = await cloudflare.listDnsRecords();
      const cnameRecords = dnsRecords.filter(record => record.type === 'CNAME');
      
      if (cnameRecords.length === 0) {
        logger.info('No CNAME records found to check.');
        return;
      }

      logger.info(`Found ${cnameRecords.length} CNAME records to check`);
      
      // Check health of each CNAME record
      const staleRecords = [];
      const healthyRecords = [];
      
      for (const record of cnameRecords) {
        logger.info(`Checking health of ${record.name}...`);
        const health = await checkRecordHealth(record.name, parseInt(options.timeout));
        
        if (health.isHealthy) {
          healthyRecords.push({ ...record, health });
          logger.success(`✓ ${record.name} is healthy (${health.statusCode})`);
        } else {
          staleRecords.push({ ...record, health });
          logger.warn(`⚠ ${record.name} is STALE (${health.error})`);
        }
      }

      // Display summary
      logger.header('Cleanup Summary');
      logger.success(`Healthy records: ${healthyRecords.length}`);
      logger.warn(`Stale records: ${staleRecords.length}`);

      if (staleRecords.length === 0) {
        logger.info('No stale records found. Nothing to clean up!');
        return;
      }

      // Show stale records
      console.log('\nStale Records:');
      const { table } = require('table');
      const tableData = [
        ['Domain', 'Target', 'Error', 'Status']
      ];
      
      staleRecords.forEach(record => {
        tableData.push([
          record.name,
          record.content,
          record.health.error || 'Timeout',
          'STALE'
        ]);
      });
      
      console.log(table(tableData));

      if (options.dryRun) {
        logger.info('Dry run mode - no changes will be made');
        return;
      }

      // Ask for confirmation unless auto-remove is enabled
      let shouldRemove = options.autoRemove;
      
      if (!shouldRemove) {
        const inquirer = require('inquirer');
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Remove ${staleRecords.length} stale records from Cloudflare and NPM?`,
            default: false
          }
        ]);
        shouldRemove = confirm;
      }

      if (!shouldRemove) {
        logger.info('Cleanup cancelled by user');
        return;
      }

      // Remove stale records
      logger.info('Removing stale records...');
      let removedCount = 0;
      
      for (const record of staleRecords) {
        try {
          const subdomain = record.name.split('.')[0];
          const domain = record.name.substring(subdomain.length + 1);
          
          logger.info(`Removing ${record.name}...`);
          
          // Remove from Cloudflare
          await cloudflare.deleteDnsRecord(subdomain, domain);
          
          // Try to remove from NPM (may not exist)
          try {
            await npm.deleteProxyHost(subdomain, domain);
          } catch (error) {
            logger.warn(`Could not remove proxy host for ${record.name}: ${error.message}`);
          }
          
          removedCount++;
          logger.success(`✓ Removed ${record.name}`);
          
        } catch (error) {
          logger.error(`Failed to remove ${record.name}: ${error.message}`);
        }
      }

      logger.success(`Cleanup completed! Removed ${removedCount} of ${staleRecords.length} stale records.`);

    } catch (error) {
      logger.error('Cleanup failed:', error.message);
      process.exit(1);
    }
  });

program.parse();
