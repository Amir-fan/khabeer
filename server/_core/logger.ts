/**
 * Logging utilities
 * Structured logging for production
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
}

function formatLogEntry(entry: LogEntry): string {
  const { timestamp, level, message, context, error } = entry;
  const parts = [`[${timestamp}]`, `[${level.toUpperCase()}]`, message];
  
  if (context) {
    parts.push(JSON.stringify(context));
  }
  
  if (error) {
    parts.push(`\nError: ${error.message}\nStack: ${error.stack}`);
  }
  
  return parts.join(" ");
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    error,
  };

  const formatted = formatLogEntry(entry);

  switch (level) {
    case "error":
      console.error(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "debug":
      if (process.env.NODE_ENV === "development") {
        console.debug(formatted);
      }
      break;
    default:
      console.log(formatted);
  }
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => log("warn", message, context),
  error: (message: string, error?: Error, context?: Record<string, unknown>) => log("error", message, context, error),
  debug: (message: string, context?: Record<string, unknown>) => log("debug", message, context),
};

