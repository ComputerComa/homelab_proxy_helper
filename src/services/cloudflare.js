const axios = require('axios');
const { Logger } = require('../utils/logger');

class CloudflareManager {
  constructor(config) {
    this.config = config;
    this.logger = new Logger();
    this.baseURL = 'https://api.cloudflare.com/client/v4';
    this.headers = {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  getTtlValue(ttl) {
    // In Cloudflare API, TTL of 1 means "auto"
    // Any other value is the actual TTL in seconds
    if (ttl === 1 || ttl === 'auto') {
      return 1; // Auto TTL
    }
    return parseInt(ttl) || 300; // Default to 300 seconds if invalid
  }

  // Validate that an A record exists for the apex domain
  async validateApexARecord(domain) {
    try {
      const zoneId = await this.getZoneId(domain);
      const response = await axios.get(`${this.baseURL}/zones/${zoneId}/dns_records`, {
        headers: this.headers,
        params: {
          name: domain, // Apex domain
          type: 'A',
        },
      });

      if (response.data.result.length === 0) {
        throw new Error(
          `No A record found for apex domain ${domain}. Please create an A record for your domain first.`
        );
      }

      const aRecord = response.data.result[0];
      this.logger.info(`Found A record for ${domain}: ${aRecord.content}`);
      return aRecord;
    } catch (error) {
      this.logger.error('Failed to validate apex A record:', error.message);
      throw error;
    }
  }

  async getZoneId(domain) {
    try {
      const response = await axios.get(`${this.baseURL}/zones`, {
        headers: this.headers,
        params: { name: domain },
      });

      if (response.data.result.length === 0) {
        throw new Error(`Domain ${domain} not found in Cloudflare`);
      }

      return response.data.result[0].id;
    } catch (error) {
      this.logger.error('Failed to get zone ID:', error.message);
      throw error;
    }
  }

  async createDnsRecord(subdomain, domain, recordType = 'CNAME', content = null) {
    try {
      // Validate that an A record exists for the apex domain
      await this.validateApexARecord(domain);

      const zoneId = await this.getZoneId(domain);
      const recordName = `${subdomain}.${domain}`;

      // Only create CNAME records that point to the apex domain
      const recordContent = content || domain; // Always point to apex domain

      const response = await axios.post(
        `${this.baseURL}/zones/${zoneId}/dns_records`,
        {
          type: 'CNAME',
          name: recordName,
          content: recordContent,
          ttl: this.getTtlValue(this.config.ttl), // TTL of 1 means "auto" in Cloudflare API
          proxied: false, // CNAME records cannot be proxied
        },
        {
          headers: this.headers,
        }
      );

      if (response.data.success) {
        this.logger.success(
          `DNS record created: ${recordName} (${recordType}) -> ${recordContent}`
        );
        return response.data.result;
      } else {
        throw new Error(`Cloudflare API error: ${response.data.errors[0].message}`);
      }
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.errors?.[0]?.code === 81057) {
        this.logger.warn(`DNS record ${subdomain}.${domain} already exists`);
        return await this.getDnsRecord(subdomain, domain);
      }
      this.logger.error('Failed to create DNS record:', error.message);
      throw error;
    }
  }

  async createCnameRecord(subdomain, domain, target = null) {
    return await this.createDnsRecord(subdomain, domain, 'CNAME', target);
  }

  async getDnsRecord(subdomain, domain) {
    try {
      const zoneId = await this.getZoneId(domain);
      const recordName = `${subdomain}.${domain}`;

      const response = await axios.get(`${this.baseURL}/zones/${zoneId}/dns_records`, {
        headers: this.headers,
        params: { name: recordName },
      });

      if (response.data.result.length === 0) {
        throw new Error(`DNS record ${recordName} not found`);
      }

      return response.data.result[0];
    } catch (error) {
      this.logger.error('Failed to get DNS record:', error.message);
      throw error;
    }
  }

  async listDnsRecords(domain = null) {
    try {
      const domains = domain ? [domain] : this.config.domains || [];
      const allRecords = [];

      for (const dom of domains) {
        const zoneId = await this.getZoneId(dom);
        const response = await axios.get(`${this.baseURL}/zones/${zoneId}/dns_records`, {
          headers: this.headers,
          params: { per_page: 100 },
        });

        allRecords.push(
          ...response.data.result.map(record => ({
            domain: dom,
            name: record.name,
            type: record.type,
            content: record.content,
            proxied: record.proxied,
            id: record.id,
          }))
        );
      }

      return allRecords;
    } catch (error) {
      this.logger.error('Failed to list DNS records:', error.message);
      throw error;
    }
  }

  async deleteDnsRecord(subdomain, domain) {
    try {
      const record = await this.getDnsRecord(subdomain, domain);
      const zoneId = await this.getZoneId(domain);

      const response = await axios.delete(
        `${this.baseURL}/zones/${zoneId}/dns_records/${record.id}`,
        {
          headers: this.headers,
        }
      );

      if (response.data.success) {
        this.logger.success(`DNS record deleted: ${subdomain}.${domain}`);
        return true;
      } else {
        throw new Error(`Cloudflare API error: ${response.data.errors[0].message}`);
      }
    } catch (error) {
      this.logger.error('Failed to delete DNS record:', error.message);
      throw error;
    }
  }

  async updateDnsRecord(subdomain, domain, updates) {
    try {
      const record = await this.getDnsRecord(subdomain, domain);
      const zoneId = await this.getZoneId(domain);

      const response = await axios.patch(
        `${this.baseURL}/zones/${zoneId}/dns_records/${record.id}`,
        updates,
        {
          headers: this.headers,
        }
      );

      if (response.data.success) {
        this.logger.success(`DNS record updated: ${subdomain}.${domain}`);
        return response.data.result;
      } else {
        throw new Error(`Cloudflare API error: ${response.data.errors[0].message}`);
      }
    } catch (error) {
      this.logger.error('Failed to update DNS record:', error.message);
      throw error;
    }
  }
}

module.exports = { CloudflareManager };
