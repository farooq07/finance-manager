# Security Rules

## user_id must come from JWT only

Never use `user_id`, `userId`, or any user identifier from `req.body`, `req.query`, `req.params`, or AI-generated arguments in Prisma queries.

Always use `req.user.id` (set by `verifyToken` middleware from the JWT).

**Why:** Past audit found that passing user_id from the request body lets any authenticated user read or modify another user's data.

**How to apply:** Every Prisma query that filters by user must include `user_id: req.user.id`. Check controllers by grepping for `req.body.userId` or `req.params.userId` paired with Prisma queries.

## Secrets must be encrypted at rest

API keys, tokens, and credentials stored in the DB must go through `encryptSecret()` from `backend/src/utils/crypto.js` (AES-256-GCM).

**Why:** Plain-text secrets in the DB are exposed by a DB dump or a single SQL injection.

**How to apply:** Any controller that stores a user-provided API key or credential must call `encryptSecret()` before `prisma.create/update` and `decryptSecret()` before returning it to the client.

## No raw SQL with string interpolation

Never build `$queryRaw` or `$executeRaw` calls with template literal interpolation using untrusted values. Use Prisma's tagged template literals with parameterised values only.

**Wrong:**
```js
prisma.$queryRaw(`SELECT * FROM users WHERE email = '${email}'`)
```

**Right:**
```js
prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`
```

**Why:** String interpolation in raw SQL is a SQL injection vulnerability.

## Rate limit auth and AI endpoints

All auth endpoints (`/api/auth/*`) and AI/chat endpoints (`/api/chat/*/message`) must have express-rate-limit applied.

**How to apply:** Check `backend/src/routes/` for any new route files that expose these paths without a rate limiter.
