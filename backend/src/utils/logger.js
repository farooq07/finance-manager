/**
 * Tiny logger that respects NODE_ENV.
 *
 * - log/info/debug: silenced in production (still emit in dev)
 * - warn/error: always emitted (you want these in production logs)
 *
 * In production warn/error are written as one JSON line each
 * ({ level, time, msg, err }) so the host's log search can filter them, and
 * secrets that end up in messages (tokens, passwords, codes, keys) are
 * masked first.
 *
 * Usage:
 *   import logger from '../utils/logger.js';
 *   logger.log('[BANK] Upload started', { bankId });
 *   logger.error('[BANK] Upload failed', err);
 */

const isProd = process.env.NODE_ENV === 'production';

const SECRET_PATTERNS = [
    [/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]'],
    [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g, '[jwt redacted]'],
    [/("?(?:password|password_hash|newPassword|pin|appPin|otp|otp_code|token|vaultToken|stock_pin_code|api[_-]?key|secret)"?\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,}]+)/gi, '$1"[redacted]"'],
    [/postgres(?:ql)?:\/\/[^\s"']+/gi, 'postgresql://[redacted]'],
];

export function redact(text) {
    let out = String(text);
    for (const [re, rep] of SECRET_PATTERNS) out = out.replace(re, rep);
    return out;
}

const toText = (a) => {
    if (a instanceof Error) return `${a.name}: ${a.message}`;
    if (typeof a === 'string') return a;
    try { return JSON.stringify(a); } catch { return String(a); }
};

function line(level, args) {
    const err = args.find((a) => a instanceof Error);
    return JSON.stringify({
        level,
        time: new Date().toISOString(),
        msg: redact(args.map(toText).join(' ')),
        ...(err?.stack ? { err: redact(err.stack.split('\n').slice(0, 6).join('\n')) } : {}),
    });
}

const logger = {
    log: (...args) => { if (!isProd) console.log(...args); },
    info: (...args) => { if (!isProd) console.info(...args); },
    debug: (...args) => { if (!isProd) console.debug(...args); },
    warn: (...args) => (isProd ? console.warn(line('warn', args)) : console.warn(...args)),
    error: (...args) => (isProd ? console.error(line('error', args)) : console.error(...args)),
};

export default logger;
