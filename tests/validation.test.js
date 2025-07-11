const { validateSubdomain, validateDomain, validateTarget } = require('../src/utils/validation');

describe('Validation Utils', () => {
  describe('validateSubdomain', () => {
    test('should accept valid subdomain', () => {
      const result = validateSubdomain('grafana');
      expect(result.valid).toBe(true);
    });

    test('should reject empty subdomain', () => {
      const result = validateSubdomain('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Subdomain is required');
    });

    test('should reject subdomain with invalid characters', () => {
      const result = validateSubdomain('grafana_test');
      expect(result.valid).toBe(false);
    });

    test('should reject subdomain starting with hyphen', () => {
      const result = validateSubdomain('-grafana');
      expect(result.valid).toBe(false);
    });

    test('should reject subdomain ending with hyphen', () => {
      const result = validateSubdomain('grafana-');
      expect(result.valid).toBe(false);
    });

    test('should reject subdomain longer than 63 characters', () => {
      const longSubdomain = 'a'.repeat(64);
      const result = validateSubdomain(longSubdomain);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Subdomain cannot be longer than 63 characters');
    });
  });

  describe('validateDomain', () => {
    test('should accept valid domain', () => {
      const result = validateDomain('example.com');
      expect(result.valid).toBe(true);
    });

    test('should accept subdomain', () => {
      const result = validateDomain('api.example.com');
      expect(result.valid).toBe(true);
    });

    test('should reject empty domain', () => {
      const result = validateDomain('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Domain is required');
    });

    test('should reject invalid domain format', () => {
      const result = validateDomain('invalid-domain');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid domain format');
    });
  });

  describe('validateTarget', () => {
    test('should accept valid IP:port', () => {
      const result = validateTarget('192.168.1.100:3000');
      expect(result.valid).toBe(true);
    });

    test('should accept valid hostname:port', () => {
      const result = validateTarget('localhost:8080');
      expect(result.valid).toBe(true);
    });

    test('should reject empty target', () => {
      const result = validateTarget('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Target is required');
    });

    test('should reject target without port', () => {
      const result = validateTarget('192.168.1.100');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Target must be in format host:port');
    });

    test('should reject invalid port', () => {
      const result = validateTarget('192.168.1.100:99999');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Port must be a number between 1 and 65535');
    });

    test('should reject non-numeric port', () => {
      const result = validateTarget('192.168.1.100:abc');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Port must be a number between 1 and 65535');
    });
  });

  describe('TTL validation', () => {
    test('should accept "auto" as valid TTL', () => {
      // This would be tested in the config manager, but we can test the logic here
      const ttl = 'auto';
      const normalizedTtl = ttl.toLowerCase() === 'auto' ? 1 : parseInt(ttl);
      expect(normalizedTtl).toBe(1);
    });

    test('should accept numeric TTL', () => {
      const ttl = '300';
      const normalizedTtl = ttl.toLowerCase() === 'auto' ? 1 : parseInt(ttl);
      expect(normalizedTtl).toBe(300);
    });

    test('should handle mixed case "AUTO"', () => {
      const ttl = 'AUTO';
      const normalizedTtl = ttl.toLowerCase() === 'auto' ? 1 : parseInt(ttl);
      expect(normalizedTtl).toBe(1);
    });
  });
});
