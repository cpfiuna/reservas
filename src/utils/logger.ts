/**
 * Simple logger utility for application-wide logging
 * PRODUCTION-SAFE: Only logs errors in production, no sensitive data exposed
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Configure log level based on environment
// In production, only log errors (level 3)
const LOG_LEVEL: LogLevel = import.meta.env.PROD ? 'error' : 'warn';

// Log level priority map
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// Check if a message at the given level should be logged
const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVELS[level] >= LOG_LEVELS[LOG_LEVEL];
};

// Sanitize data to prevent sensitive information leaks
const sanitizeData = (data?: any): any => {
  if (!data) return undefined;
  
  // In production, never log data objects to prevent sensitive info exposure
  if (import.meta.env.PROD) {
    return '[Data hidden in production]';
  }
  
  // In development, still be cautious
  if (typeof data === 'object') {
    const sanitized = { ...data };
    // Remove potentially sensitive fields
    const sensitiveKeys = ['password', 'token', 'email', 'secret', 'key', 'auth'];
    Object.keys(sanitized).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    });
    return sanitized;
  }
  
  return data;
};

const formatMessage = (level: LogLevel, message: string, data?: any): string => {
  let formattedMessage = `[${level.toUpperCase()}] ${message}`;
  const sanitized = sanitizeData(data);
  if (sanitized && sanitized !== '[Data hidden in production]') {
    formattedMessage += `: ${JSON.stringify(sanitized, null, 2)}`;
  }
  return formattedMessage;
};

export const logger = {
  debug: (message: string, data?: any): void => {
    // Debug logs disabled in production
    if (shouldLog('debug') && !import.meta.env.PROD) {
      console.debug(formatMessage('debug', message, data));
    }
  },
  
  info: (message: string, data?: any): void => {
    // Info logs disabled in production
    if (shouldLog('info') && !import.meta.env.PROD) {
      console.info(formatMessage('info', message, data));
    }
  },
  
  warn: (message: string, data?: any): void => {
    // Warnings allowed in production but sanitized
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, data));
    }
  },
  
  error: (message: string, data?: any): void => {
    // Only errors logged in production, always sanitized
    if (shouldLog('error')) {
      console.error(formatMessage('error', message, data));
    }
  }
};