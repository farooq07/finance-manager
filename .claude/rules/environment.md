# Environment & Secrets Management

## This project uses Doppler — never create .env files

All secrets are managed in Doppler: project `fs-wealth-axis`, config `dev`.
The `.doppler.yaml` in `backend/` links the folder automatically.

**Never write, create, suggest, or reference a `.env` file.** The gitignored
`backend/.env` on the main dev machine is a legacy local backup only — Doppler
is the source of truth.

## Running the backend

```bash
cd backend && npm run dev          # doppler run -- nodemon server.js
```

Doppler must be authenticated first. On a new machine:

```bash
winget install Doppler.Doppler     # install CLI (Windows)
doppler login                      # opens browser — approve once
cd backend && npm run dev          # .doppler.yaml wires up project/config
```

## Adding or changing a secret

1. Open dashboard.doppler.com → fs-wealth-axis → dev
2. Add / update the value there
3. Restart `npm run dev` — new value is picked up instantly

Do NOT add secrets to any file, commit them, or hardcode them in source.

## Key secrets

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Pooled Supabase URL (queries via Prisma) |
| `DIRECT_URL` | Direct Supabase URL (migrations only) |
| `JWT_SECRET` | Must be identical across all machines/envs |
| `GMAIL_USER` | OTP and email sender address |
| `GMAIL_APP_PASSWORD` | Gmail app password for SMTP |
| `GEMINI_API_KEY` | AI categoriser + RAG engine |
| `GROQ_API_KEY` | Fallback AI provider |
| `AI_PROVIDER` | `gemini` or `groq` |
| `AI_CHAT_PROVIDER` | `gemini` or `groq` |
| `FRONTEND_URL` | Allowed CORS origin (Vercel URL in prod) |

## Deploy environments

| Env | How secrets are injected |
|-----|--------------------------|
| Local dev | Doppler CLI (`doppler run --`) |
| Railway (backend) | Set vars directly in Railway dashboard |
| Vercel (frontend) | `VITE_` vars set in Vercel dashboard |

Railway and Vercel do **not** use Doppler — their own dashboard env vars are used.
Only local development uses the Doppler CLI.
