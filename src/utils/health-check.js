const axios = require('axios');
const { Logger } = require('./logger');

const logger = new Logger();

async function checkRecordHealth(hostname, timeout = 5000) {
  const health = {
    hostname,
    isHealthy: false,
    statusCode: null,
    error: null,
    responseTime: null,
    timestamp: new Date().toISOString()
  };

  try {
    const startTime = Date.now();
    
    // Try HTTPS first, then HTTP
    const urls = [
      `https://${hostname}`,
      `http://${hostname}`
    ];

    let lastError = null;
    
    for (const url of urls) {
      try {
        const response = await axios.get(url, {
          timeout: timeout,
          validateStatus: (status) => status < 500, // Accept all non-5xx status codes
          maxRedirects: 5,
          headers: {
            'User-Agent': 'Homelab-Proxy-Helper/1.0.0'
          }
        });

        health.isHealthy = true;
        health.statusCode = response.status;
        health.responseTime = Date.now() - startTime;
        health.protocol = url.startsWith('https') ? 'https' : 'http';
        
        return health;
        
      } catch (error) {
        lastError = error;
        
        // If we get a 5xx error, mark as unhealthy
        if (error.response && error.response.status >= 500) {
          health.statusCode = error.response.status;
          health.error = `HTTP ${error.response.status}`;
          health.responseTime = Date.now() - startTime;
          break;
        }
        
        // Continue to next URL if connection refused, timeout, etc.
        continue;
      }
    }

    // If we get here, all URLs failed
    if (lastError) {
      if (lastError.code === 'ECONNREFUSED') {
        health.error = 'Connection refused';
      } else if (lastError.code === 'ECONNRESET') {
        health.error = 'Connection reset';
      } else if (lastError.code === 'ENOTFOUND') {
        health.error = 'DNS resolution failed';
      } else if (lastError.code === 'ETIMEDOUT' || lastError.code === 'ECONNABORTED') {
        health.error = 'Connection timeout';
      } else if (lastError.response && lastError.response.status >= 500) {
        health.error = `HTTP ${lastError.response.status}`;
        health.statusCode = lastError.response.status;
      } else {
        health.error = lastError.message || 'Unknown error';
      }
    }

    health.responseTime = Date.now() - startTime;
    
  } catch (error) {
    health.error = error.message || 'Unknown error';
    health.responseTime = timeout;
  }

  return health;
}

async function checkMultipleRecords(hostnames, timeout = 5000, concurrency = 5) {
  const results = [];
  
  // Process in batches to avoid overwhelming the network
  for (let i = 0; i < hostnames.length; i += concurrency) {
    const batch = hostnames.slice(i, i + concurrency);
    const batchPromises = batch.map(hostname => checkRecordHealth(hostname, timeout));
    
    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    } catch (error) {
      logger.error(`Error checking batch ${i}-${i + concurrency}:`, error.message);
    }
  }
  
  return results;
}

function categorizeHealthResults(results) {
  const healthy = results.filter(r => r.isHealthy);
  const stale = results.filter(r => !r.isHealthy);
  
  return {
    healthy,
    stale,
    total: results.length,
    healthyCount: healthy.length,
    staleCount: stale.length,
    healthyPercentage: Math.round((healthy.length / results.length) * 100)
  };
}

function generateHealthReport(results) {
  const categories = categorizeHealthResults(results);
  
  const report = {
    summary: {
      total: categories.total,
      healthy: categories.healthyCount,
      stale: categories.staleCount,
      healthyPercentage: categories.healthyPercentage
    },
    details: {
      healthy: categories.healthy.map(r => ({
        hostname: r.hostname,
        statusCode: r.statusCode,
        responseTime: r.responseTime,
        protocol: r.protocol
      })),
      stale: categories.stale.map(r => ({
        hostname: r.hostname,
        error: r.error,
        statusCode: r.statusCode,
        responseTime: r.responseTime
      }))
    },
    timestamp: new Date().toISOString()
  };
  
  return report;
}

module.exports = {
  checkRecordHealth,
  checkMultipleRecords,
  categorizeHealthResults,
  generateHealthReport
};
