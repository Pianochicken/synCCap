/**
 * @file logger.ts
 * @description Structured logger for the synCCap backend using Winston.
 *
 * Outputs JSON in production (machine-parseable for log aggregators)
 * and pretty-printed coloured text in development.
 */

import winston from 'winston';
import { config } from './config';

const { combine, timestamp, colorize, printf, json } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ level, message, timestamp: ts, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${ts} [${level}] ${message}${metaStr}`;
  })
);

const prodFormat = combine(timestamp(), json());

export const logger = winston.createLogger({
  level: config.env === 'production' ? 'info' : 'debug',
  format: config.env === 'production' ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
});
