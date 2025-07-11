const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const inquirer = require('inquirer');
const { Logger } = require('./logger');

class ConfigManager {
  constructor() {
    this.logger = new Logger();
    this.configDir = path.join(os.homedir(), '.homelab-proxy');
    this.configFile = path.join(this.configDir, 'config.json');
  }

  async ensureConfigDir() {
    try {
      await fs.access(this.configDir);
    } catch (error) {
      await fs.mkdir(this.configDir, { recursive: true });
    }
  }

  async initConfig() {
    await this.ensureConfigDir();

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'cloudflareDomain',
        message: 'Enter your primary domain name (managed by Cloudflare):',
        validate: input => input.length > 0 || 'Domain name is required',
      },
      {
        type: 'input',
        name: 'cloudflareApiToken',
        message: 'Enter your Cloudflare API token:',
        validate: input => input.length > 0 || 'API token is required',
      },
      {
        type: 'input',
        name: 'cloudflareTtl',
        message: 'DNS TTL (seconds or "auto" for Cloudflare default):',
        default: 'auto',
        validate: input => {
          if (input.toLowerCase() === 'auto') {
            return true;
          }
          const num = parseInt(input);
          return (!isNaN(num) && num > 0) || 'Please enter a valid TTL value or "auto"';
        },
      },
      {
        type: 'input',
        name: 'nginxProxyManagerUrl',
        message: 'Enter your Nginx Proxy Manager URL:',
        default: 'http://localhost:81',
        validate: input => {
          try {
            new URL(input);
            return true;
          } catch {
            return 'Please enter a valid URL';
          }
        },
      },
      {
        type: 'input',
        name: 'nginxProxyManagerEmail',
        message: 'Enter your Nginx Proxy Manager email:',
        validate: input => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(input) || 'Please enter a valid email address';
        },
      },
      {
        type: 'password',
        name: 'nginxProxyManagerPassword',
        message: 'Enter your Nginx Proxy Manager password:',
        validate: input => input.length > 0 || 'Password is required',
      },
      {
        type: 'input',
        name: 'letsencryptEmail',
        message: 'Enter your Let\'s Encrypt email (optional):',
        default: answers => answers.nginxProxyManagerEmail,
      },
      {
        type: 'confirm',
        name: 'defaultWebsockets',
        message: 'Enable WebSocket support by default for new proxy hosts?',
        default: true,
      },
    ]);

    const config = {
      version: '1.0.0',
      defaultDomain: answers.cloudflareDomain,
      cloudflare: {
        apiToken: answers.cloudflareApiToken,
        domains: [answers.cloudflareDomain],
        ttl: answers.cloudflareTtl.toLowerCase() === 'auto' ? 1 : parseInt(answers.cloudflareTtl),
      },
      nginxProxyManager: {
        url: answers.nginxProxyManagerUrl,
        email: answers.nginxProxyManagerEmail,
        password: answers.nginxProxyManagerPassword,
        letsencryptEmail: answers.letsencryptEmail,
        defaultWebsockets: answers.defaultWebsockets,
      },
      createdAt: new Date().toISOString(),
    };

    await this.saveConfig(config);
    this.logger.success('Configuration saved successfully!');
    return config;
  }

  async getConfig() {
    try {
      const configData = await fs.readFile(this.configFile, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('Configuration file not found. Please run "homelab-proxy init" first.');
      }
      throw error;
    }
  }

  async saveConfig(config) {
    await this.ensureConfigDir();
    await fs.writeFile(this.configFile, JSON.stringify(config, null, 2));
  }

  async updateConfig(updates) {
    const config = await this.getConfig();
    const updatedConfig = { ...config, ...updates };
    await this.saveConfig(updatedConfig);
    return updatedConfig;
  }

  async configExists() {
    try {
      await fs.access(this.configFile);
      return true;
    } catch {
      return false;
    }
  }

  getConfigPath() {
    return this.configFile;
  }
}

module.exports = { ConfigManager };
