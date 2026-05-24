import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) =>
    stack ? `${timestamp} [${level.toUpperCase()}] ${message}\n${stack}` : `${timestamp} [${level.toUpperCase()}] ${message}`
  )
);

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports: [
    new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), logFormat) }),
    new DailyRotateFile({ filename: 'logs/error-%DATE%.log', datePattern: 'YYYY-MM-DD', level: 'error', maxFiles: '30d' }),
    new DailyRotateFile({ filename: 'logs/combined-%DATE%.log', datePattern: 'YYYY-MM-DD', maxFiles: '30d' }),
  ],
});
