# Personal Finance & Investment Management System

A full-stack modern web application to track personal expenses, mutual funds, stock investments, and running dues ledgers.

## Tech Stack
- **Frontend**: React (Vite) + Tailwind CSS + CVA + Radix UI Primitives (Headless logic)
- **Design System**: Centralized UI component library inspired by the Untitled UI ecosystem (Strict TypeScripts arrays, Layered shadows, Custom Color Tokens).
- **Backend**: Node.js + Express
- **Database/ORM**: PostgreSQL (via Supabase) + Prisma ORM
- **Authentication**: JWT & bcrypt

---

## The UI Design System (`/src/components/ui`)
We have built a custom, enterprise-grade generic Design System to handle the atomic components of the application.
- **Phase 1 (Tokens)**: Found in `tailwind.config.js` with primary, error, warning, success, and grayscale color scales, plus complex elevation shadows and typography standardizations.
- **Phase 2 (Atomic)**: Includes `Button` (w/ loader states, icons, and variants using CVA), `Input` (w/ error logic), `Badge`, and custom styled `Checkbox`.
- **Phase 3 (Molecules)**: Includes a global `NavigationLayout`, a highly-reusable `DataTable` organism, and Context-Provider driven Modal and Toast pop-up systems using React Portals.

---

## Running Locally

### 1. Database Setup (Supabase)
Create a new Supabase project (which gives you a free Postgres database).
Find your connections strings (Pooler URL for connection, and Direct URL for migrations).

### 2. Backend Setup
1. `cd backend`
2. `npm install`
3. Edit the `.env` file with your Database URL and a random `JWT_SECRET` string.
4. Push Prisma schema: `npx prisma db push`
5. *Optional*: Create a default user profile by running: `node create-user.mjs`
6. Start server: `node server.js`

### 3. Frontend Setup
1. `cd frontend`
2. `npm install`
3. Edit the `.env.local` to point to the backend (`VITE_API_URL=http://localhost:5000/api`)
4. Start React app: `npm run dev`

---

*Designed and developed as a premium, highly-accessible Personal Finance Dashboard.*
