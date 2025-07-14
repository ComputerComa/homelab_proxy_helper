#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const { table } = require('table');
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
  .description(
    'CLI tool to manage subdomains and Nginx Proxy Manager configurations for homelab projects'
  )
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
      console.log(chalk.green('Domain:'), config.defaultDomain);
      console.log(chalk.green('Cloudflare:'));
      console.log(
        chalk.yellow('  API Token:'),
        config.cloudflare.apiToken ? '***' + config.cloudflare.apiToken.slice(-4) : 'Not set'
      );
      console.log(
        chalk.yellow('  TTL:'),
        config.cloudflare.ttl === 1 ? 'auto' : config.cloudflare.ttl
      );
      console.log(chalk.green('Nginx Proxy Manager:'));
      console.log(chalk.yellow('  URL:'), config.nginxProxyManager.url);
      console.log(chalk.yellow('  Email:'), config.nginxProxyManager.email);
      console.log(
        chalk.yellow('  Let\'s Encrypt Email:'),
        config.nginxProxyManager.letsencryptEmail || 'Not set'
      );

      if (config.nginxProxyManager.defaultSslCertId) {
        console.log(
          chalk.yellow('  Default SSL Certificate ID:'),
          config.nginxProxyManager.defaultSslCertId
        );
      } else {
        console.log(chalk.yellow('  Default SSL Certificate:'), 'Not set');
      }

      console.log(
        chalk.yellow('  Default WebSocket Support:'),
        config.nginxProxyManager.defaultWebsockets !== false ? 'Enabled' : 'Disabled'
      );

      console.log(chalk.green('Created:'), new Date(config.createdAt).toLocaleString());
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
  .option('--ssl-cert <id>', 'Use existing SSL certificate by ID')
  .option('--list-certs', 'List available SSL certificates')
  .option('--no-proxy', 'Disable Cloudflare proxy (DNS-only mode)')
  .option('--no-websockets', 'Disable WebSocket support')
  .action(async options => {
    try {
      const configManager = new ConfigManager();
      const config = await configManager.getConfig();

      if (!validateConfig(config)) {
        logger.error('Invalid configuration. Please run "homelab-proxy init" first.');
        process.exit(1);
      }

      const cloudflare = new CloudflareManager(config.cloudflare);
      const npm = new NginxProxyManager(config.nginxProxyManager);

      // Handle certificate listing
      if (options.listCerts) {
        logger.info('Fetching available SSL certificates...');
        const certificates = await npm.getCertificates();

        if (certificates.length === 0) {
          logger.info('No SSL certificates found in NPM');
          return;
        }

        logger.header('Available SSL Certificates');
        const tableData = [['ID', 'Name', 'Domain Names', 'Status', 'Expires']];

        certificates.forEach(cert => {
          const domains = cert.domain_names ? cert.domain_names.join(', ') : 'N/A';
          const status = cert.expires_on ? 'Active' : 'Inactive';
          const expires = cert.expires_on ? new Date(cert.expires_on).toLocaleDateString() : 'N/A';
          tableData.push([
            cert.id.toString(),
            cert.nice_name || 'Unnamed',
            domains,
            status,
            expires,
          ]);
        });

        console.log(table(tableData));
        return;
      }

      // Interactive prompts if options not provided
      if (!options.subdomain || !options.target) {
        const inquirer = require('inquirer');
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'subdomain',
            message: 'Enter subdomain name:',
            when: !options.subdomain,
          },
          {
            type: 'input',
            name: 'target',
            message: 'Enter target (host:port):',
            when: !options.target,
          },
          {
            type: 'input',
            name: 'domain',
            message: 'Enter domain name:',
            default: config.defaultDomain,
            when: !options.domain,
          },
          {
            type: 'confirm',
            name: 'ssl',
            message: 'Enable SSL certificate?',
            default: true,
            when: options.ssl === undefined && !options.sslCert,
          },
          {
            type: 'list',
            name: 'sslType',
            message: 'SSL certificate type:',
            choices: () => {
              const choices = [{ name: 'Request new Let\'s Encrypt certificate', value: 'new' }];

              // Add default SSL certificate option if configured
              if (config.nginxProxyManager.defaultSslCertId) {
                choices.unshift({ name: 'Use default SSL certificate', value: 'default' });
              }

              choices.push({ name: 'Use existing certificate', value: 'existing' });
              return choices;
            },
            default: config.nginxProxyManager.defaultSslCertId ? 'default' : 'new',
            when: answers => (answers.ssl || options.ssl) && !options.sslCert,
          },
          {
            type: 'list',
            name: 'sslCert',
            message: 'Select existing SSL certificate:',
            choices: async () => {
              const certificates = await npm.getCertificates();
              return certificates.map(cert => ({
                name: `${cert.nice_name || 'Unnamed'} (ID: ${cert.id}) - ${cert.domain_names ? cert.domain_names.join(', ') : 'N/A'}`,
                value: cert.id,
              }));
            },
            when: answers => answers.sslType === 'existing' && !options.sslCert,
          },
          {
            type: 'confirm',
            name: 'forceSsl',
            message: 'Force SSL redirect?',
            default: true,
            when: options.forceSsl === undefined,
          },
          {
            type: 'confirm',
            name: 'enableProxy',
            message: 'Enable Cloudflare proxy for DNS record?',
            default: true,
            when: options.noProxy === undefined,
          },
          {
            type: 'confirm',
            name: 'enableWebsockets',
            message: 'Enable WebSocket support?',
            default: config.nginxProxyManager.defaultWebsockets !== false, // Use config default or true
            when: options.noWebsockets === undefined,
          },
        ]);

        options = { ...options, ...answers };
        
        // Convert enableProxy to noProxy for consistency with CLI flag
        if (options.enableProxy !== undefined) {
          options.noProxy = !options.enableProxy;
        }
        
        // Convert enableWebsockets to noWebsockets for consistency with CLI flag
        if (options.enableWebsockets !== undefined) {
          options.noWebsockets = !options.enableWebsockets;
        }
      }

      // Handle default SSL certificate
      if (options.sslType === 'default' && config.nginxProxyManager.defaultSslCertId) {
        options.sslCert = config.nginxProxyManager.defaultSslCertId;
        logger.info(`Using default SSL certificate (ID: ${options.sslCert})`);
      }

      logger.info(
        `Creating subdomain: ${options.subdomain}.${options.domain || config.defaultDomain}`
      );

      // Create CNAME record (validates A record exists for apex domain)
      // By default, enable proxy unless --no-proxy is specified
      const enableProxy = !options.noProxy;
      await cloudflare.createCnameRecord(options.subdomain, options.domain || config.defaultDomain, null, enableProxy);
      logger.success(
        `CNAME record created: ${options.subdomain}.${options.domain || config.defaultDomain} -> ${options.domain || config.defaultDomain} ${enableProxy ? '(proxied)' : '(DNS-only)'}`
      );

      // Create proxy host
      const proxyHostOptions = {
        subdomain: options.subdomain,
        domain: options.domain || config.defaultDomain,
        target: options.target,
        ssl: options.ssl || options.sslCert,
        forceSsl: options.forceSsl,
        sslCertId: options.sslCert,
        websockets: !options.noWebsockets, // Enable WebSockets unless --no-websockets is specified
      };

      await npm.createProxyHost(proxyHostOptions);
      logger.success('Proxy host created successfully!');
    } catch (error) {
      logger.error('Failed to create configuration:', error.message);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all managed domains and proxy hosts in table format')
  .option('-j, --json', 'Output in JSON format')
  .action(async options => {
    try {
      const configManager = new ConfigManager();
      const config = await configManager.getConfig();

      const cloudflare = new CloudflareManager(config.cloudflare);
      const npm = new NginxProxyManager(config.nginxProxyManager);

      logger.info('Fetching DNS records...');
      const dnsRecords = await cloudflare.listDnsRecords();

      logger.info('Fetching proxy hosts...');
      const proxyHosts = await npm.listProxyHosts();

      if (options.json) {
        // Output in JSON format
        console.log(
          JSON.stringify(
            {
              dns_records: dnsRecords,
              proxy_hosts: proxyHosts,
            },
            null,
            2
          )
        );
      } else {
        // Output in human-readable table format
        console.log(chalk.cyan('\n=== DNS Records ==='));
        if (dnsRecords && dnsRecords.length > 0) {
          const dnsTableData = [
            [
              chalk.bold('Name'),
              chalk.bold('Type'),
              chalk.bold('Content'),
              chalk.bold('TTL'),
              chalk.bold('Proxied'),
            ],
          ];

          dnsRecords.forEach(record => {
            dnsTableData.push([
              record.name || 'N/A',
              record.type || 'N/A',
              record.content || 'N/A',
              record.ttl === 1 ? 'auto' : record.ttl || 'N/A',
              record.proxied ? chalk.green('Yes') : chalk.red('No'),
            ]);
          });

          console.log(
            table(dnsTableData, {
              border: {
                topBody: '─',
                topJoin: '┬',
                topLeft: '┌',
                topRight: '┐',
                bottomBody: '─',
                bottomJoin: '┴',
                bottomLeft: '└',
                bottomRight: '┘',
                bodyLeft: '│',
                bodyRight: '│',
                bodyJoin: '│',
                joinBody: '─',
                joinLeft: '├',
                joinRight: '┤',
                joinJoin: '┼',
              },
            })
          );
        } else {
          console.log(chalk.gray('No DNS records found.'));
        }

        console.log(chalk.cyan('\n=== Proxy Hosts ==='));
        if (proxyHosts && proxyHosts.length > 0) {
          const proxyTableData = [
            [
              chalk.bold('ID'),
              chalk.bold('Domain'),
              chalk.bold('Forward To'),
              chalk.bold('SSL'),
              chalk.bold('WebSockets'),
              chalk.bold('Status'),
            ],
          ];

          proxyHosts.forEach(host => {
            const domainNames = Array.isArray(host.domain_names)
              ? host.domain_names.join(', ')
              : host.domain_names || 'N/A';
            const forwardHost = host.forward_host || 'N/A';
            const forwardPort = host.forward_port || '';
            const forwardTo = forwardPort ? `${forwardHost}:${forwardPort}` : forwardHost;
            const sslStatus = host.certificate_id ? chalk.green('Enabled') : chalk.red('Disabled');
            const websocketStatus = host.websockets_enabled ? chalk.green('Enabled') : chalk.red('Disabled');
            const status = host.enabled ? chalk.green('Enabled') : chalk.red('Disabled');

            proxyTableData.push([
              host.id || 'N/A',
              domainNames,
              forwardTo,
              sslStatus,
              websocketStatus,
              status,
            ]);
          });

          console.log(
            table(proxyTableData, {
              border: {
                topBody: '─',
                topJoin: '┬',
                topLeft: '┌',
                topRight: '┐',
                bottomBody: '─',
                bottomJoin: '┴',
                bottomLeft: '└',
                bottomRight: '┘',
                bodyLeft: '│',
                bodyRight: '│',
                bodyJoin: '│',
                joinBody: '─',
                joinLeft: '├',
                joinRight: '┤',
                joinJoin: '┼',
              },
            })
          );
        } else {
          console.log(chalk.gray('No proxy hosts found.'));
        }
      }
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
  .action(async options => {
    try {
      const configManager = new ConfigManager();
      const config = await configManager.getConfig();

      if (!options.subdomain) {
        const inquirer = require('inquirer');
        const { subdomain } = await inquirer.prompt([
          {
            type: 'input',
            name: 'subdomain',
            message: 'Enter subdomain name to delete:',
          },
        ]);
        options.subdomain = subdomain;
      }

      const cloudflare = new CloudflareManager(config.cloudflare);
      const npm = new NginxProxyManager(config.nginxProxyManager);

      logger.info(
        `Deleting subdomain: ${options.subdomain}.${options.domain || config.defaultDomain}`
      );

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
  .option('--basic-auth-username <username>', 'Username for basic authentication during health checks')
  .option('--basic-auth-password <password>', 'Password for basic authentication during health checks')
  .action(async options => {
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
      const cnameRecords = dnsRecords.filter(
        record => record.type === 'CNAME' && !record.name.includes('_domainkey')
      );

      if (cnameRecords.length === 0) {
        logger.info('No CNAME records found to check.');
        return;
      }

      const excludedCount = dnsRecords.filter(
        record => record.type === 'CNAME' && record.name.includes('_domainkey')
      ).length;

      if (excludedCount > 0) {
        logger.info(`Excluded ${excludedCount} DKIM records (_domainkey) from cleanup`);
      }

      logger.info(`Found ${cnameRecords.length} CNAME records to check`);

      // Check health of each CNAME record
      const staleRecords = [];
      const healthyRecords = [];

      // Get basic auth configuration if available
      let basicAuth = config.cleanup && config.cleanup.useBasicAuth ? config.cleanup.basicAuth : null;
      
      // Override with command-line options if provided
      if (options.basicAuthUsername && options.basicAuthPassword) {
        basicAuth = {
          username: options.basicAuthUsername,
          password: options.basicAuthPassword,
        };
      }

      if (basicAuth) {
        logger.info('Using basic authentication for health checks');
      }

      // Create a prompt function for authentication when needed
      const promptForAuth = async (hostname) => {
        if (options.autoRemove) {
          // Skip auth prompt in auto-remove mode
          return null;
        }

        logger.warn(`Service ${hostname} requires authentication`);
        
        const inquirer = require('inquirer');
        const authAnswers = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'provideAuth',
            message: `Do you want to provide authentication for ${hostname}?`,
            default: false,
          },
          {
            type: 'input',
            name: 'username',
            message: 'Username:',
            when: answers => answers.provideAuth,
            validate: input => input.length > 0 || 'Username is required',
          },
          {
            type: 'password',
            name: 'password',
            message: 'Password:',
            when: answers => answers.provideAuth,
            validate: input => input.length > 0 || 'Password is required',
          },
        ]);

        if (authAnswers.provideAuth) {
          return {
            username: authAnswers.username,
            password: authAnswers.password,
          };
        }

        return null;
      };

      for (const record of cnameRecords) {
        logger.info(`Checking health of ${record.name}...`);
        const health = await checkRecordHealth(record.name, parseInt(options.timeout), basicAuth, promptForAuth);

        if (health.isHealthy) {
          healthyRecords.push({ ...record, health });
          const authNote = health.authAttempted ? ' (authenticated)' : '';
          logger.success(`✓ ${record.name} is healthy (${health.statusCode})${authNote}`);
        } else {
          staleRecords.push({ ...record, health });
          const statusInfo = health.statusCode ? ` (${health.statusCode})` : '';
          if (health.statusCode === 401) {
            logger.warn(`⚠ ${record.name} requires authentication${statusInfo}: ${health.error}`);
          } else {
            logger.warn(`⚠ ${record.name} is STALE${statusInfo}: ${health.error}`);
          }
        }
      }

      // Display summary
      logger.header('Cleanup Summary');
      logger.success(`Healthy records: ${healthyRecords.length}`);
      logger.warn(`Stale records: ${staleRecords.length}`);

      // Show healthy records table
      if (healthyRecords.length > 0) {
        console.log('\nHealthy Records:');
        const healthyTableData = [['Domain', 'Target', 'Status Code', 'Response Time', 'Protocol']];
        
        healthyRecords.forEach(record => {
          const health = record.health;
          healthyTableData.push([
            record.name,
            record.content,
            health.statusCode || 'N/A',
            health.responseTime ? `${health.responseTime}ms` : 'N/A',
            health.protocol || 'N/A'
          ]);
        });

        console.log(table(healthyTableData));
      }

      if (staleRecords.length === 0) {
        logger.info('No stale records found. Nothing to clean up!');
        return;
      }

      // Show stale records table
      console.log('\nStale Records:');
      const staleTableData = [['Domain', 'Target', 'Status Code', 'Error', 'Response Time']];

      staleRecords.forEach(record => {
        const health = record.health;
        staleTableData.push([
          record.name,
          record.content,
          health.statusCode || 'N/A',
          health.error || 'Timeout',
          health.responseTime ? `${health.responseTime}ms` : 'N/A'
        ]);
      });

      console.log(table(staleTableData));

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
            default: false,
          },
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

      logger.success(
        `Cleanup completed! Removed ${removedCount} of ${staleRecords.length} stale records.`
      );
    } catch (error) {
      logger.error('Cleanup failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('list-certs')
  .description('List all SSL certificates in Nginx Proxy Manager in table format')
  .option('-j, --json', 'Output in JSON format')
  .action(async options => {
    try {
      const configManager = new ConfigManager();
      const config = await configManager.getConfig();

      if (!validateConfig(config)) {
        logger.error('Invalid configuration. Please run "homelab-proxy init" first.');
        process.exit(1);
      }

      const npm = new NginxProxyManager(config.nginxProxyManager);

      logger.info('Fetching SSL certificates...');
      const certificates = await npm.getCertificates();

      if (certificates.length === 0) {
        logger.info('No SSL certificates found in NPM');
        return;
      }

      if (options.json) {
        // Output in JSON format
        console.log(JSON.stringify(certificates, null, 2));
      } else {
        // Output in human-readable table format
        logger.header('SSL Certificates');
        const tableData = [
          [
            chalk.bold('ID'),
            chalk.bold('Name'),
            chalk.bold('Domain Names'),
            chalk.bold('Status'),
            chalk.bold('Provider'),
            chalk.bold('Expires'),
            chalk.bold('Created'),
          ],
        ];

        certificates.forEach(cert => {
          const domains = cert.domain_names ? cert.domain_names.join(', ') : 'N/A';
          const status = cert.expires_on ? chalk.green('Active') : chalk.red('Inactive');
          const provider = cert.provider || 'Unknown';
          const expires = cert.expires_on ? new Date(cert.expires_on).toLocaleDateString() : 'N/A';
          const created = cert.created_on ? new Date(cert.created_on).toLocaleDateString() : 'N/A';

          tableData.push([
            cert.id.toString(),
            cert.nice_name || 'Unnamed',
            domains,
            status,
            provider,
            expires,
            created,
          ]);
        });

        console.log(
          table(tableData, {
            border: {
              topBody: '─',
              topJoin: '┬',
              topLeft: '┌',
              topRight: '┐',
              bottomBody: '─',
              bottomJoin: '┴',
              bottomLeft: '└',
              bottomRight: '┘',
              bodyLeft: '│',
              bodyRight: '│',
              bodyJoin: '│',
              joinBody: '─',
              joinLeft: '├',
              joinRight: '┤',
              joinJoin: '┼',
            },
          })
        );
        logger.info(`Found ${certificates.length} SSL certificates`);
      }
    } catch (error) {
      logger.error('Failed to list certificates:', error.message);
      process.exit(1);
    }
  });

// Set default SSL certificate command
program
  .command('set-default-ssl')
  .description('Set a default SSL certificate to use for new proxy hosts')
  .option('-i, --id <id>', 'SSL certificate ID to set as default')
  .option('--clear', 'Clear the default SSL certificate')
  .action(async options => {
    try {
      const configManager = new ConfigManager();
      const config = await configManager.getConfig();

      if (!validateConfig(config)) {
        logger.error('Invalid configuration. Please run "homelab-proxy init" first.');
        process.exit(1);
      }

      const npm = new NginxProxyManager(config.nginxProxyManager);

      // Handle clearing the default SSL certificate
      if (options.clear) {
        await configManager.updateConfig({
          nginxProxyManager: {
            ...config.nginxProxyManager,
            defaultSslCertId: undefined,
          },
        });
        logger.success('Default SSL certificate cleared');
        return;
      }

      // Get certificate ID from command line or prompt
      let certId = options.id;

      if (!certId) {
        const certificates = await npm.getCertificates();

        if (certificates.length === 0) {
          logger.error('No SSL certificates found in NPM. Please create a certificate first.');
          process.exit(1);
        }

        const inquirer = require('inquirer');
        const answers = await inquirer.prompt([
          {
            type: 'list',
            name: 'certId',
            message: 'Select default SSL certificate:',
            choices: certificates.map(cert => ({
              name: `${cert.nice_name || 'Unnamed'} (ID: ${cert.id}) - ${cert.domain_names ? cert.domain_names.join(', ') : 'N/A'}`,
              value: cert.id,
            })),
          },
        ]);

        certId = answers.certId;
      }

      // Validate the certificate exists
      const certificates = await npm.getCertificates();
      const selectedCert = certificates.find(cert => cert.id === parseInt(certId));

      if (!selectedCert) {
        logger.error(`SSL certificate with ID ${certId} not found`);
        process.exit(1);
      }

      // Update configuration
      await configManager.updateConfig({
        nginxProxyManager: {
          ...config.nginxProxyManager,
          defaultSslCertId: parseInt(certId),
        },
      });

      logger.success(
        `Default SSL certificate set to: ${selectedCert.nice_name || 'Unnamed'} (ID: ${certId})`
      );
      logger.info(
        `Domain names: ${selectedCert.domain_names ? selectedCert.domain_names.join(', ') : 'N/A'}`
      );
    } catch (error) {
      logger.error('Failed to set default SSL certificate:', error.message);
      process.exit(1);
    }
  });

// Interactive menu when no command is provided
async function showInteractiveMenu() {
  const inquirer = require('inquirer');

  logger.header('🏠 Homelab Proxy Helper');
  logger.info('Welcome! What would you like to do?');

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Select an action:',
      choices: [
        { name: '🚀 Create new subdomain and proxy', value: 'create' },
        { name: '📋 List all domains and proxies', value: 'list' },
        { name: '🗑️  Delete subdomain and proxy', value: 'delete' },
        { name: '🧹 Cleanup stale records', value: 'cleanup' },
        { name: '🔒 List SSL certificates', value: 'list-certs' },
        { name: '⚙️  Set default SSL certificate', value: 'set-default-ssl' },
        { name: '🔧 Show/Edit configuration', value: 'config' },
        { name: '🔄 Initialize/Reconfigure', value: 'init' },
        { name: '❌ Exit', value: 'exit' },
      ],
    },
  ]);

  if (answers.action === 'exit') {
    logger.info('Goodbye! 👋');
    process.exit(0);
  }

  // Execute the selected command
  try {
    switch (answers.action) {
    case 'create':
      await program.parseAsync(['node', 'homelab-proxy', 'create']);
      break;
    case 'list':
      await program.parseAsync(['node', 'homelab-proxy', 'list']);
      break;
    case 'delete':
      await program.parseAsync(['node', 'homelab-proxy', 'delete']);
      break;
    case 'cleanup':
      await program.parseAsync(['node', 'homelab-proxy', 'cleanup']);
      break;
    case 'list-certs':
      await program.parseAsync(['node', 'homelab-proxy', 'list-certs']);
      break;
    case 'set-default-ssl':
      await program.parseAsync(['node', 'homelab-proxy', 'set-default-ssl']);
      break;
    case 'config':
      await program.parseAsync(['node', 'homelab-proxy', 'config']);
      break;
    case 'init':
      await program.parseAsync(['node', 'homelab-proxy', 'init']);
      break;
    }
  } catch (error) {
    logger.error('Command failed:', error.message);
  }
}

// Check if no command was provided
if (process.argv.length === 2) {
  showInteractiveMenu();
} else {
  program.parse();
}
