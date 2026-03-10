/**
 * Request Logger Middleware
 * Logs incoming requests with timing and status information
 */

export const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Override res.json to track response status
  const originalJson = res.json;
  res.json = function (data) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Log request details
    const logMessage = `${req.method} ${req.path} - ${statusCode} - ${duration}ms`;
    
    if (statusCode >= 500) {
      console.error('❌', logMessage);
    } else if (statusCode >= 400) {
      console.warn('⚠️ ', logMessage);
    } else {
      console.log('✅', logMessage);
    }

    return originalJson.call(this, data);
  };

  next();
};
