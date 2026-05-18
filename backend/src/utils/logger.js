/**
 * Tiny logger that respects NODE_ENV.
 *
 * - log/info/debug: silenced in production (still emit in dev)
 * - warn/error: always emitted (you want these in production logs)
 *
 * Usage:
 *   import logger from '../utils/logger.js';
 *   logger.log('[BANK] Upload started', { bankId });
 *   logger.error('[BANK] Upload failed', err);
 */

const isProd = process.env.NODE_ENV === 'production';

const logger = {
    log: (...args) => { if (!isProd) console.log(...args); },
    info: (...args) => { if (!isProd) console.info(...args); },
    debug: (...args) => { if (!isProd) console.debug(...args); },
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
};

export default logger;
