const { Logger } = require('./logger');

const logger = new Logger();

function validateConfig(config) {
  const errors = [];

  // Check if config exists
  if (!config) {
    errors.push('Configuration is missing');
    return false;
  }

  // Validate Cloudflare configuration
  if (!config.cloudflare) {
    errors.push('Cloudflare configuration is missing');
  } else {
    if (!config.cloudflare.apiToken) {
      errors.push('Cloudflare API token is missing');
    }
    if (!config.cloudflare.domains || config.cloudflare.domains.length === 0) {
      errors.push('Cloudflare domains are missing');
    }
  }

  // Validate Nginx Proxy Manager configuration
  if (!config.nginxProxyManager) {
    errors.push('Nginx Proxy Manager configuration is missing');
  } else {
    if (!config.nginxProxyManager.url) {
      errors.push('Nginx Proxy Manager URL is missing');
    }
    if (!config.nginxProxyManager.email) {
      errors.push('Nginx Proxy Manager email is missing');
    }
    if (!config.nginxProxyManager.password) {
      errors.push('Nginx Proxy Manager password is missing');
    }
  }

  // Validate default domain
  if (!config.defaultDomain) {
    errors.push('Default domain is missing');
  }

  if (errors.length > 0) {
    logger.error('Configuration validation failed:');
    errors.forEach(error => logger.error(`  - ${error}`));
    return false;
  }

  return true;
}

function validateSubdomain(subdomain) {
  if (!subdomain) {
    return { valid: false, error: 'Subdomain is required' };
  }

  if (subdomain.length > 63) {
    return { valid: false, error: 'Subdomain cannot be longer than 63 characters' };
  }

  const subdomainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;

  if (!subdomainRegex.test(subdomain)) {
    return {
      valid: false,
      error:
        'Subdomain must contain only letters, numbers, and hyphens, and cannot start or end with a hyphen',
    };
  }

  return { valid: true };
}

function validateDomain(domain) {
  const domainRegex =
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

  if (!domain) {
    return { valid: false, error: 'Domain is required' };
  }

  if (!domainRegex.test(domain)) {
    return { valid: false, error: 'Invalid domain format' };
  }

  return { valid: true };
}

function validateTarget(target) {
  if (!target) {
    return { valid: false, error: 'Target is required' };
  }

  const parts = target.split(':');
  if (parts.length !== 2) {
    return { valid: false, error: 'Target must be in format host:port' };
  }

  const [host, port] = parts;

  // Validate host (IP or hostname)
  const ipRegex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const hostnameRegex =
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

  if (!ipRegex.test(host) && !hostnameRegex.test(host)) {
    return { valid: false, error: 'Invalid host format' };
  }

  // Validate port
  const portNum = parseInt(port);
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    return { valid: false, error: 'Port must be a number between 1 and 65535' };
  }

  return { valid: true };
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email) {
    return { valid: false, error: 'Email is required' };
  }

  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true };
}

function validateUrl(url) {
  if (!url) {
    return { valid: false, error: 'URL is required' };
  }

  try {
    new URL(url);
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

function validateIpAddress(ip) {
  const ipRegex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  if (!ip) {
    return { valid: false, error: 'IP address is required' };
  }

  if (!ipRegex.test(ip)) {
    return { valid: false, error: 'Invalid IP address format' };
  }

  return { valid: true };
}

module.exports = {
  validateConfig,
  validateSubdomain,
  validateDomain,
  validateTarget,
  validateEmail,
  validateUrl,
  validateIpAddress,
};
