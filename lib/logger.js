/**
 * Production-ready logging utility
 * Handles different log levels and environments
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const LOG_LEVEL_NAMES = {
  [LOG_LEVELS.ERROR]: 'ERROR',
  [LOG_LEVELS.WARN]: 'WARN',
  [LOG_LEVELS.INFO]: 'INFO',
  [LOG_LEVELS.DEBUG]: 'DEBUG'
};

class Logger {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isDevelopment = process.env.NODE_ENV === 'development';
    
    // Set log level based on environment
    if (this.isProduction) {
      this.logLevel = LOG_LEVELS.INFO; // Only INFO and above in production
    } else {
      this.logLevel = LOG_LEVELS.DEBUG; // All logs in development
    }
    
    // Enable Vercel logs in production
    this.enableVercelLogs = this.isProduction;
  }

  /**
   * Log with timestamp and structured format
   */
  log(level, message, data = null, context = null) {
    if (level > this.logLevel) return;

    const timestamp = new Date().toISOString();
    const levelName = LOG_LEVEL_NAMES[level];
    
    // Create structured log entry
    const logEntry = {
      timestamp,
      level: levelName,
      message,
      ...(data && { data }),
      ...(context && { context }),
      environment: process.env.NODE_ENV,
      ...(this.isProduction && { 
        vercel: {
          region: process.env.VERCEL_REGION,
          deployment: process.env.VERCEL_DEPLOYMENT_ID
        }
      })
    };

    // Console output with colors in development
    if (this.isDevelopment) {
      const colors = {
        [LOG_LEVELS.ERROR]: '\x1b[31m', // Red
        [LOG_LEVELS.WARN]: '\x1b[33m',  // Yellow
        [LOG_LEVELS.INFO]: '\x1b[36m',  // Cyan
        [LOG_LEVELS.DEBUG]: '\x1b[90m'  // Gray
      };
      const reset = '\x1b[0m';
      
      console.log(`${colors[level]}[${levelName}]${reset} ${message}`, 
        data ? data : '', 
        context ? `Context: ${JSON.stringify(context)}` : ''
      );
    } else {
      // Production: structured JSON logs
      console.log(JSON.stringify(logEntry));
    }

    // Send to external logging service in production (optional)
    if (this.isProduction && this.enableVercelLogs) {
      this.sendToVercelLogs(logEntry);
    }
  }

  /**
   * Send logs to Vercel's logging system
   */
  sendToVercelLogs(logEntry) {
    // Vercel automatically captures console.log in production
    // This is just for additional structure
    try {
      // You can add external logging services here
      // e.g., Sentry, LogRocket, DataDog, etc.
    } catch (error) {
      // Don't let logging errors break the app
    }
  }

  /**
   * Log levels
   */
  error(message, data = null, context = null) {
    this.log(LOG_LEVELS.ERROR, message, data, context);
  }

  warn(message, data = null, context = null) {
    this.log(LOG_LEVELS.WARN, message, data, context);
  }

  info(message, data = null, context = null) {
    this.log(LOG_LEVELS.INFO, message, data, context);
  }

  debug(message, data = null, context = null) {
    this.log(LOG_LEVELS.DEBUG, message, data, context);
  }

  /**
   * Log API requests with timing
   */
  logApiRequest(method, url, statusCode, duration, context = null) {
    const level = statusCode >= 400 ? LOG_LEVELS.ERROR : LOG_LEVELS.INFO;
    this.log(level, `API ${method} ${url}`, {
      statusCode,
      duration: `${duration}ms`,
      ...context
    });
  }

  /**
   * Log streaming events
   */
  logStreamEvent(eventType, data = null, context = null) {
    this.info(`STREAM:${eventType}`, data, context);
  }

  /**
   * Log playlist generation progress
   */
  logPlaylistProgress(phase, progress, data = null, context = null) {
    this.info(`PLAYLIST:${phase}`, {
      progress: `${progress}%`,
      ...data
    }, context);
  }

  /**
   * Log errors with stack trace
   */
  logError(error, context = null) {
    this.error(error.message, {
      stack: error.stack,
      name: error.name,
      ...context
    });
  }
}

// Create singleton instance
const logger = new Logger();

// Export both the class and instance
export { Logger, LOG_LEVELS };
export default logger;
