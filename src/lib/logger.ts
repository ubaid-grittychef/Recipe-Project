type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LOG_COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m",
  info: "\x1b[32m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
};
const RESET = "\x1b[0m";

function formatError(err: unknown): LogEntry["error"] | undefined {
  if (!err) return undefined;
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { name: "UnknownError", message: String(err) };
}

function emit(entry: LogEntry) {
  const color = LOG_COLORS[entry.level];
  const tag = `${color}[${entry.level.toUpperCase()}]${RESET}`;
  const ctx = `\x1b[90m[${entry.context}]${RESET}`;
  const ts = `\x1b[90m${entry.timestamp}${RESET}`;

  const parts = [ts, tag, ctx, entry.message];
  if (entry.data && Object.keys(entry.data).length > 0) {
    parts.push(JSON.stringify(entry.data));
  }

  const line = parts.join(" ");

  switch (entry.level) {
    case "error":
      console.error(line);
      if (entry.error?.stack) console.error(`\x1b[90m${entry.error.stack}${RESET}`);
      break;
    case "warn":
      console.warn(line);
      break;
    default:
      console.log(line);
  }
}

export function createLogger(context: string) {
  function log(level: LogLevel, message: string, data?: Record<string, unknown>, err?: unknown) {
    emit({
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      data,
      error: formatError(err),
    });
  }

  return {
    debug: (msg: string, data?: Record<string, unknown>) => log("debug", msg, data),
    info: (msg: string, data?: Record<string, unknown>) => log("info", msg, data),
    warn: (msg: string, data?: Record<string, unknown>, err?: unknown) => log("warn", msg, data, err),
    error: (msg: string, data?: Record<string, unknown>, err?: unknown) => log("error", msg, data, err),
  };
}

export type Logger = ReturnType<typeof createLogger>;
