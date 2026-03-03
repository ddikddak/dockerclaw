// ============================================
// Logger - Comprehensive logging with level control
// ============================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  component: string;
  message: string;
  data?: unknown;
  error?: Error;
}

interface LoggerOptions {
  maxLogs?: number;
  minLevel?: LogLevel;
  enableConsole?: boolean;
  enablePersistence?: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private logs: LogEntry[] = [];
  private options: Required<LoggerOptions>;
  private listeners: Set<(entry: LogEntry) => void> = new Set();

  constructor(options: LoggerOptions = {}) {
    this.options = {
      maxLogs: 1000,
      minLevel: 'debug',
      enableConsole: true,
      enablePersistence: false,
      ...options,
    };

    // Load persisted logs if enabled
    if (this.options.enablePersistence) {
      this.loadPersistedLogs();
    }
  }

  /**
   * Log a message
   */
  log(
    level: LogLevel,
    component: string,
    message: string,
    data?: unknown,
    error?: Error
  ): void {
    // Check level filter
    if (LOG_LEVELS[level] < LOG_LEVELS[this.options.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level,
      component,
      message,
      data,
      error,
    };

    // Add to logs
    this.logs.push(entry);

    // Trim if exceeds max
    if (this.logs.length > this.options.maxLogs) {
      this.logs = this.logs.slice(-this.options.maxLogs);
    }

    // Console output
    if (this.options.enableConsole) {
      this.consoleOutput(entry);
    }

    // Persist if enabled
    if (this.options.enablePersistence) {
      this.persistLogs();
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(entry));
  }

  /**
   * Debug level log
   */
  debug(component: string, message: string, data?: unknown): void {
    this.log('debug', component, message, data);
  }

  /**
   * Info level log
   */
  info(component: string, message: string, data?: unknown): void {
    this.log('info', component, message, data);
  }

  /**
   * Warn level log
   */
  warn(component: string, message: string, data?: unknown, error?: Error): void {
    this.log('warn', component, message, data, error);
  }

  /**
   * Error level log
   */
  error(component: string, message: string, error?: Error, data?: unknown): void {
    this.log('error', component, message, data, error);
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Get logs for a specific component
   */
  getLogsByComponent(component: string): LogEntry[] {
    return this.logs.filter(log => log.component === component);
  }

  /**
   * Get logs within a time range
   */
  getLogsByTimeRange(startTime: number, endTime: number): LogEntry[] {
    return this.logs.filter(log => log.timestamp >= startTime && log.timestamp <= endTime);
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 10): LogEntry[] {
    return this.logs
      .filter(log => log.level === 'error')
      .slice(-limit);
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
    if (this.options.enablePersistence) {
      localStorage.removeItem('dockerclaw_logs');
    }
  }

  /**
   * Export logs as JSON
   */
  export(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Subscribe to log entries
   */
  subscribe(listener: (entry: LogEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Set minimum log level
   */
  setMinLevel(level: LogLevel): void {
    this.options.minLevel = level;
  }

  private consoleOutput(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.component}]`;

    const styles: Record<LogLevel, string> = {
      debug: 'color: gray',
      info: 'color: blue',
      warn: 'color: orange',
      error: 'color: red; font-weight: bold',
    };

    switch (entry.level) {
      case 'debug':
        console.debug(`%c${prefix}`, styles[entry.level], entry.message, entry.data);
        break;
      case 'info':
        console.info(`%c${prefix}`, styles[entry.level], entry.message, entry.data);
        break;
      case 'warn':
        console.warn(`%c${prefix}`, styles[entry.level], entry.message, entry.data, entry.error);
        break;
      case 'error':
        console.error(`%c${prefix}`, styles[entry.level], entry.message, entry.error, entry.data);
        break;
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private persistLogs(): void {
    try {
      localStorage.setItem('dockerclaw_logs', JSON.stringify(this.logs));
    } catch {
      // Ignore storage errors
    }
  }

  private loadPersistedLogs(): void {
    try {
      const stored = localStorage.getItem('dockerclaw_logs');
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch {
      // Ignore parse errors
    }
  }
}

// ============================================
// Global Logger Instance
// ============================================

export const logger = new Logger({
  maxLogs: 500,
  minLevel: import.meta.env.DEV ? 'debug' : 'warn',
  enableConsole: true,
  enablePersistence: import.meta.env.DEV,
});

// ============================================
// React Hook for Logger
// ============================================

import { useState, useEffect, useCallback } from 'react';

export function useLogger(component: string) {
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const unsubscribe = logger.subscribe(entry => {
      if (entry.component === component) {
        setRecentLogs(prev => [...prev.slice(-9), entry]);
      }
    });
    return unsubscribe;
  }, [component]);

  const log = useCallback(
    (level: LogLevel, message: string, data?: unknown) => {
      logger.log(level, component, message, data);
    },
    [component]
  );

  const debug = useCallback(
    (message: string, data?: unknown) => logger.debug(component, message, data),
    [component]
  );

  const info = useCallback(
    (message: string, data?: unknown) => logger.info(component, message, data),
    [component]
  );

  const warn = useCallback(
    (message: string, data?: unknown) => logger.warn(component, message, data),
    [component]
  );

  const error = useCallback(
    (message: string, err?: Error, data?: unknown) => logger.error(component, message, err, data),
    [component]
  );

  return {
    log,
    debug,
    info,
    warn,
    error,
    recentLogs,
  };
}
