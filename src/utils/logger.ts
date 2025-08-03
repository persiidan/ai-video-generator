/**
 * Comprehensive Logger Utility for Video Generation
 * Based on TypeScript logging best practices
 */

export const LogLevel = {
  TRACE: 'TRACE',
  DEBUG: 'DEBUG', 
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  details?: any;
  error?: Error;
  timestamp?: string;
  duration?: number;
}

export interface Logger {
  trace(message: string, context?: string, details?: any): void;
  debug(message: string, context?: string, details?: any): void;
  info(message: string, context?: string, details?: any): void;
  warn(message: string, context?: string, details?: any): void;
  error(message: string, context?: string, details?: any, error?: Error): void;
  time(label: string): void;
  timeEnd(label: string): void;
}

class VideoLogger implements Logger {
  private timers: Map<string, number> = new Map();
  private context: string;

  constructor(context: string = 'VideoComposer') {
    this.context = context;
  }

  private formatLogEntry(level: LogLevel, message: string, context?: string, details?: any, error?: Error): LogEntry {
    return {
      level,
      message,
      context: context || this.context,
      details,
      error,
      timestamp: new Date().toISOString(),
    };
  }

  private log(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.level}] [${entry.context}]`;
    
    if (entry.error) {
      console.error(`${prefix} ${entry.message}`, {
        details: entry.details,
        error: {
          name: entry.error.name,
          message: entry.error.message,
          stack: entry.error.stack
        }
      });
    } else if (entry.level === LogLevel.ERROR) {
      console.error(`${prefix} ${entry.message}`, entry.details);
    } else if (entry.level === LogLevel.WARN) {
      console.warn(`${prefix} ${entry.message}`, entry.details);
    } else if (entry.level === LogLevel.DEBUG) {
      console.debug(`${prefix} ${entry.message}`, entry.details);
    } else {
      console.log(`${prefix} ${entry.message}`, entry.details);
    }
  }

  trace(message: string, context?: string, details?: any): void {
    this.log(this.formatLogEntry(LogLevel.TRACE, message, context, details));
  }

  debug(message: string, context?: string, details?: any): void {
    this.log(this.formatLogEntry(LogLevel.DEBUG, message, context, details));
  }

  info(message: string, context?: string, details?: any): void {
    this.log(this.formatLogEntry(LogLevel.INFO, message, context, details));
  }

  warn(message: string, context?: string, details?: any): void {
    this.log(this.formatLogEntry(LogLevel.WARN, message, context, details));
  }

  error(message: string, context?: string, details?: any, error?: Error): void {
    this.log(this.formatLogEntry(LogLevel.ERROR, message, context, details, error));
  }

  time(label: string): void {
    this.timers.set(label, performance.now());
    this.info(`⏱️ Timer started: ${label}`);
  }

  timeEnd(label: string): void {
    const startTime = this.timers.get(label);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.timers.delete(label);
      this.info(`⏱️ Timer ended: ${label}`, undefined, { duration: `${duration.toFixed(2)}ms` });
    }
  }
}

export function createLogger(context: string): Logger {
  return new VideoLogger(context);
}

// Global logger instance
export const logger = createLogger('VideoGenerator'); 