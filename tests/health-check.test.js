const { checkRecordHealth, categorizeHealthResults, generateHealthReport } = require('../src/utils/health-check');

// Mock axios for testing
jest.mock('axios');
const axios = require('axios');

describe('Health Check Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkRecordHealth', () => {
    test('should return healthy status for 200 response', async () => {
      axios.get.mockResolvedValue({
        status: 200,
        data: 'OK'
      });

      const result = await checkRecordHealth('example.com', 5000, null, null);
      
      expect(result.isHealthy).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.hostname).toBe('example.com');
      expect(result.responseTime).toBeDefined();
      expect(result.protocol).toBe('https');
    });

    test('should return healthy status for 404 response (not a server error)', async () => {
      axios.get.mockResolvedValue({
        status: 404,
        data: 'Not Found'
      });

      const result = await checkRecordHealth('example.com', 5000, null, null);
      
      expect(result.isHealthy).toBe(true);
      expect(result.statusCode).toBe(404);
    });

    test('should return unhealthy status for 500 response', async () => {
      const error = new Error('Server Error');
      error.response = { status: 500 };
      axios.get.mockRejectedValue(error);

      const result = await checkRecordHealth('example.com', 5000, null, null);
      
      expect(result.isHealthy).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toBe('HTTP 500');
    });

    test('should return unhealthy status for connection timeout', async () => {
      const error = new Error('timeout');
      error.code = 'ETIMEDOUT';
      axios.get.mockRejectedValue(error);

      const result = await checkRecordHealth('example.com', 5000, null, null);
      
      expect(result.isHealthy).toBe(false);
      expect(result.error).toBe('Connection timeout');
    });

    test('should return unhealthy status for connection refused', async () => {
      const error = new Error('connect ECONNREFUSED');
      error.code = 'ECONNREFUSED';
      axios.get.mockRejectedValue(error);

      const result = await checkRecordHealth('example.com', 5000, null, null);
      
      expect(result.isHealthy).toBe(false);
      expect(result.error).toBe('Connection refused');
    });

    test('should return unhealthy status for DNS resolution failure', async () => {
      const error = new Error('getaddrinfo ENOTFOUND');
      error.code = 'ENOTFOUND';
      axios.get.mockRejectedValue(error);

      const result = await checkRecordHealth('nonexistent.example.com', 5000, null, null);
      
      expect(result.isHealthy).toBe(false);
      expect(result.error).toBe('DNS resolution failed');
    });

    test('should try HTTP after HTTPS fails', async () => {
      axios.get
        .mockRejectedValueOnce(new Error('HTTPS failed'))
        .mockResolvedValueOnce({
          status: 200,
          data: 'OK'
        });

      const result = await checkRecordHealth('example.com', 5000, null, null);
      
      expect(result.isHealthy).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.protocol).toBe('http');
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    test('should handle 401 authentication required', async () => {
      const error = new Error('Unauthorized');
      error.response = { status: 401 };
      axios.get.mockRejectedValue(error);

      const result = await checkRecordHealth('example.com', 5000, null, null);
      
      expect(result.isHealthy).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('Authentication required');
    });

    test('should use saved basic auth and succeed', async () => {
      axios.get.mockResolvedValue({
        status: 200,
        data: 'OK'
      });

      const basicAuth = {
        username: 'testuser',
        password: 'testpass'
      };

      const result = await checkRecordHealth('example.com', 5000, basicAuth, null);
      
      expect(result.isHealthy).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(axios.get).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          auth: {
            username: 'testuser',
            password: 'testpass'
          }
        })
      );
    });

    test('should prompt for auth on 401 when no saved auth', async () => {
      const authError = new Error('Unauthorized');
      authError.response = { status: 401 };
      
      // Mock axios.get to handle the auth retry scenario
      axios.get.mockImplementation((url, config) => {
        // First call: no auth -> 401
        if (!config.auth) {
          return Promise.reject(authError);
        }
        // Second call: with auth -> 200
        return Promise.resolve({
          status: 200,
          data: 'OK'
        });
      });

      const promptForAuth = jest.fn().mockResolvedValue({
        username: 'promptuser',
        password: 'promptpass'
      });

      const result = await checkRecordHealth('example.com', 5000, null, promptForAuth);
      
      // Check the result
      expect(result.isHealthy).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.authAttempted).toBe(true);
      expect(promptForAuth).toHaveBeenCalledWith('example.com');
      
      // Check that axios.get was called 2 times
      expect(axios.get).toHaveBeenCalledTimes(2);
      
      // Check first call (without auth)
      expect(axios.get).toHaveBeenNthCalledWith(1, 'https://example.com', expect.objectContaining({
        timeout: 5000,
        validateStatus: expect.any(Function),
        maxRedirects: 5,
        headers: { 'User-Agent': 'Homelab-Proxy-Helper/1.0.0' }
      }));
      
      // Check second call (with auth)
      expect(axios.get).toHaveBeenNthCalledWith(2, 'https://example.com', expect.objectContaining({
        timeout: 5000,
        validateStatus: expect.any(Function),
        maxRedirects: 5,
        headers: { 'User-Agent': 'Homelab-Proxy-Helper/1.0.0' },
        auth: {
          username: 'promptuser',
          password: 'promptpass'
        }
      }));
    });

    test('should handle failed saved auth credentials', async () => {
      const authError = new Error('Unauthorized');
      authError.response = { status: 401 };
      axios.get.mockRejectedValue(authError);

      const basicAuth = {
        username: 'baduser',
        password: 'badpass'
      };

      const result = await checkRecordHealth('example.com', 5000, basicAuth, null);
      
      expect(result.isHealthy).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('Authentication failed (saved credentials invalid)');
      expect(result.authAttempted).toBe(true);
    });

    test('should handle no auth provided when prompted', async () => {
      const authError = new Error('Unauthorized');
      authError.response = { status: 401 };
      axios.get.mockRejectedValue(authError);

      const promptForAuth = jest.fn().mockResolvedValue(null);

      const result = await checkRecordHealth('example.com', 5000, null, promptForAuth);
      
      expect(result.isHealthy).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('Authentication required');
      expect(result.authAttempted).toBe(true);
      expect(promptForAuth).toHaveBeenCalledWith('example.com');
    });

    // ...existing tests...
  });

  describe('categorizeHealthResults', () => {
    test('should correctly categorize health results', () => {
      const results = [
        { hostname: 'healthy1.com', isHealthy: true, statusCode: 200 },
        { hostname: 'healthy2.com', isHealthy: true, statusCode: 404 },
        { hostname: 'stale1.com', isHealthy: false, error: 'timeout' },
        { hostname: 'stale2.com', isHealthy: false, error: 'HTTP 500' }
      ];

      const categories = categorizeHealthResults(results);
      
      expect(categories.total).toBe(4);
      expect(categories.healthyCount).toBe(2);
      expect(categories.staleCount).toBe(2);
      expect(categories.healthyPercentage).toBe(50);
      expect(categories.healthy).toHaveLength(2);
      expect(categories.stale).toHaveLength(2);
    });

    test('should handle empty results', () => {
      const categories = categorizeHealthResults([]);
      
      expect(categories.total).toBe(0);
      expect(categories.healthyCount).toBe(0);
      expect(categories.staleCount).toBe(0);
      expect(categories.healthyPercentage).toBe(NaN);
    });
  });

  describe('generateHealthReport', () => {
    test('should generate comprehensive health report', () => {
      const results = [
        { 
          hostname: 'healthy.com', 
          isHealthy: true, 
          statusCode: 200, 
          responseTime: 100,
          protocol: 'https'
        },
        { 
          hostname: 'stale.com', 
          isHealthy: false, 
          error: 'timeout',
          responseTime: 5000
        }
      ];

      const report = generateHealthReport(results);
      
      expect(report.summary.total).toBe(2);
      expect(report.summary.healthy).toBe(1);
      expect(report.summary.stale).toBe(1);
      expect(report.summary.healthyPercentage).toBe(50);
      
      expect(report.details.healthy).toHaveLength(1);
      expect(report.details.healthy[0].hostname).toBe('healthy.com');
      expect(report.details.healthy[0].statusCode).toBe(200);
      
      expect(report.details.stale).toHaveLength(1);
      expect(report.details.stale[0].hostname).toBe('stale.com');
      expect(report.details.stale[0].error).toBe('timeout');
      
      expect(report.timestamp).toBeDefined();
    });
  });
});
