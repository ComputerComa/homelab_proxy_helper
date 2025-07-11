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

      const result = await checkRecordHealth('example.com', 5000);
      
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

      const result = await checkRecordHealth('example.com', 5000);
      
      expect(result.isHealthy).toBe(true);
      expect(result.statusCode).toBe(404);
    });

    test('should return unhealthy status for 500 response', async () => {
      const error = new Error('Server Error');
      error.response = { status: 500 };
      axios.get.mockRejectedValue(error);

      const result = await checkRecordHealth('example.com', 5000);
      
      expect(result.isHealthy).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toBe('HTTP 500');
    });

    test('should return unhealthy status for connection timeout', async () => {
      const error = new Error('timeout');
      error.code = 'ETIMEDOUT';
      axios.get.mockRejectedValue(error);

      const result = await checkRecordHealth('example.com', 5000);
      
      expect(result.isHealthy).toBe(false);
      expect(result.error).toBe('Connection timeout');
    });

    test('should return unhealthy status for connection refused', async () => {
      const error = new Error('connect ECONNREFUSED');
      error.code = 'ECONNREFUSED';
      axios.get.mockRejectedValue(error);

      const result = await checkRecordHealth('example.com', 5000);
      
      expect(result.isHealthy).toBe(false);
      expect(result.error).toBe('Connection refused');
    });

    test('should return unhealthy status for DNS resolution failure', async () => {
      const error = new Error('getaddrinfo ENOTFOUND');
      error.code = 'ENOTFOUND';
      axios.get.mockRejectedValue(error);

      const result = await checkRecordHealth('nonexistent.example.com', 5000);
      
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

      const result = await checkRecordHealth('example.com', 5000);
      
      expect(result.isHealthy).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.protocol).toBe('http');
      expect(axios.get).toHaveBeenCalledTimes(2);
    });
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
