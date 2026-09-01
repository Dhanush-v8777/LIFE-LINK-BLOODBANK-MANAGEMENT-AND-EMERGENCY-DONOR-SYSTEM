const rateLimitStore = {};

/**
 * Custom memory-based rate limiter to protect sensitive auth endpoints
 * @param {number} limit Maximum requests in the window
 * @param {number} windowMs Time window in milliseconds
 */
function rateLimiter(limit = 15, windowMs = 60 * 1000) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();

    if (!rateLimitStore[ip]) {
      rateLimitStore[ip] = [];
    }

    // Remove requests that fell out of the sliding window
    rateLimitStore[ip] = rateLimitStore[ip].filter(timestamp => now - timestamp < windowMs);

    if (rateLimitStore[ip].length >= limit) {
      console.warn(`[RATE LIMIT] Rate limit exceeded for IP: ${ip} on route: ${req.originalUrl}`);
      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Please wait a minute and try again.'
      });
    }

    rateLimitStore[ip].push(now);
    next();
  };
}

module.exports = rateLimiter;
