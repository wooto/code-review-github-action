import { RateLimiter } from '../../src/utils/RateLimiter';

test('should enforce rate limiting between API calls', async () => {
  const rateLimiter = new RateLimiter(100); // 100ms delay
  const startTime = Date.now();

  await rateLimiter.wait();
  await rateLimiter.wait();

  const elapsed = Date.now() - startTime;
  expect(elapsed).toBeGreaterThanOrEqual(100);
});