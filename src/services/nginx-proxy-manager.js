const axios = require('axios');
const { Logger } = require('../utils/logger');

class NginxProxyManager {
  constructor(config) {
    this.config = config;
    this.logger = new Logger();
    this.baseURL = config.url;
    this.token = null;
  }

  async authenticate() {
    try {
      const response = await axios.post(`${this.baseURL}/api/tokens`, {
        identity: this.config.email,
        secret: this.config.password,
      });

      if (response.data.token) {
        this.token = response.data.token;
        this.logger.success('Successfully authenticated with Nginx Proxy Manager');
        return this.token;
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      this.logger.error('Failed to authenticate with Nginx Proxy Manager:', error.message);
      throw error;
    }
  }

  async ensureAuthenticated() {
    if (!this.token) {
      await this.authenticate();
    }
  }

  async createProxyHost(options) {
    try {
      await this.ensureAuthenticated();

      const proxyHostData = {
        domain_names: [`${options.subdomain}.${options.domain}`],
        forward_scheme: 'http',
        forward_host: options.target.split(':')[0],
        forward_port: parseInt(options.target.split(':')[1]) || 80,
        access_list_id: 0,
        certificate_id: options.sslCertId || 0,
        ssl_forced: options.forceSsl || false,
        caching_enabled: false,
        block_exploits: true,
        advanced_config: '',
        locations: [],
        meta: {},
      };

      const response = await axios.post(`${this.baseURL}/api/nginx/proxy-hosts`, proxyHostData, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.data) {
        this.logger.success(
          `Proxy host created: ${options.subdomain}.${options.domain} -> ${options.target}`
        );

        // If SSL is enabled and no existing certificate ID was provided, try to get a new certificate
        if (options.ssl && !options.sslCertId) {
          await this.requestSSLCertificate(response.data.id, options.subdomain, options.domain);
        } else if (options.sslCertId) {
          this.logger.success(`Using existing SSL certificate ID: ${options.sslCertId}`);
        }

        return response.data;
      } else {
        throw new Error('Failed to create proxy host');
      }
    } catch (error) {
      if (
        error.response?.status === 400 &&
        error.response?.data?.message?.includes('already exists')
      ) {
        this.logger.warn(`Proxy host ${options.subdomain}.${options.domain} already exists`);
        return await this.getProxyHostByDomain(`${options.subdomain}.${options.domain}`);
      }
      this.logger.error('Failed to create proxy host:', error.message);
      throw error;
    }
  }

  async requestSSLCertificate(proxyHostId, subdomain, domain) {
    try {
      await this.ensureAuthenticated();

      const certificateData = {
        provider: 'letsencrypt',
        nice_name: `${subdomain}.${domain}`,
        domain_names: [`${subdomain}.${domain}`],
        meta: {
          letsencrypt_email: this.config.letsencryptEmail || this.config.email,
          letsencrypt_agree: true,
          dns_challenge: false,
        },
      };

      const response = await axios.post(`${this.baseURL}/api/nginx/certificates`, certificateData, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.data) {
        this.logger.success(`SSL certificate requested for ${subdomain}.${domain}`);

        // Update proxy host with certificate
        await this.updateProxyHost(proxyHostId, { certificate_id: response.data.id });

        return response.data;
      }
    } catch (error) {
      this.logger.warn(
        `Failed to request SSL certificate for ${subdomain}.${domain}:`,
        error.message
      );
      // Don't throw error here as proxy host creation should succeed even if SSL fails
    }
  }

  async updateProxyHost(proxyHostId, updates) {
    try {
      await this.ensureAuthenticated();

      const response = await axios.put(
        `${this.baseURL}/api/nginx/proxy-hosts/${proxyHostId}`,
        updates,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to update proxy host:', error.message);
      throw error;
    }
  }

  async getProxyHostByDomain(domain) {
    try {
      await this.ensureAuthenticated();

      const response = await axios.get(`${this.baseURL}/api/nginx/proxy-hosts`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      const proxyHost = response.data.find(
        host => host.domain_names && host.domain_names.includes(domain)
      );

      if (!proxyHost) {
        throw new Error(`Proxy host for domain ${domain} not found`);
      }

      return proxyHost;
    } catch (error) {
      this.logger.error('Failed to get proxy host:', error.message);
      throw error;
    }
  }

  async listProxyHosts() {
    try {
      await this.ensureAuthenticated();

      const response = await axios.get(`${this.baseURL}/api/nginx/proxy-hosts`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      return response.data.map(host => ({
        id: host.id,
        domains: host.domain_names,
        target: `${host.forward_host}:${host.forward_port}`,
        ssl: host.certificate_id > 0,
        enabled: host.enabled,
        created: host.created_on,
        modified: host.modified_on,
      }));
    } catch (error) {
      this.logger.error('Failed to list proxy hosts:', error.message);
      throw error;
    }
  }

  async deleteProxyHost(subdomain, domain) {
    try {
      const fullDomain = `${subdomain}.${domain}`;
      const proxyHost = await this.getProxyHostByDomain(fullDomain);

      await axios.delete(`${this.baseURL}/api/nginx/proxy-hosts/${proxyHost.id}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      this.logger.success(`Proxy host deleted: ${fullDomain}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to delete proxy host:', error.message);
      throw error;
    }
  }

  async getCertificates() {
    try {
      await this.ensureAuthenticated();

      const response = await axios.get(`${this.baseURL}/api/nginx/certificates`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get certificates:', error.message);
      throw error;
    }
  }
}

module.exports = { NginxProxyManager };
