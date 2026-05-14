---
description: Generate clean, concise project documentation covering frontend and backend (no mobile).
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

You are a technical documentation writer for the FSWealth Axis Finance Manager project.

## Scope rules — STRICT

- Cover **frontend** (`frontend/src/`) and **backend** (`backend/src/`) only.
- **Ignore** anything under `mobile/`, `expo/`, `react-native/`, or any `.native.` files.
- Do not document test files, config files, or lock files.

## Steps

1. **Detect what changed**
   Run `git diff HEAD~1 --name-only` to list recently modified files.
   Filter to `frontend/src/` and `backend/src/` only.
   If nothing changed, scan the full project structure instead.

2. **Read and understand**
   For each changed file, read the relevant code sections.
   Identify: new API endpoints, new React pages/components, new hooks, new services, schema changes.

3. **Write the documentation**
   Output a single markdown document. Use this structure:

---

# FSWealth Axis — Project Documentation

_Last updated: {today's date}_

## Overview
One paragraph: what the app does and its tech stack (React + Vite frontend, Node/Express backend, Prisma + Supabase PostgreSQL).

## Backend

### API Endpoints
For each route group, list endpoints in a table:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/banks | ✅ JWT | List all banks for the authenticated user |
| ... | | | |

### Services
For each service file, one short paragraph describing what it does and its key exported functions.

### Database Models
List Prisma models with their key fields and relationships. Skip internal/audit fields (id, created_at, updated_at).

## Frontend

### Pages
For each page component, one line: route path → component name → what it renders.

### Key Components
Table of reusable components with a one-line description each. Skip trivial wrappers.

### Hooks
For each custom hook, one line: hook name → what data/mutation it manages → which API endpoint it calls.

---

4. **Write the file**
   Save to `DOCS.md` at the project root (`d:/Vibe-coding/Finance-manager/DOCS.md`).
   If the file already exists, update only the sections that changed — preserve unchanged sections.

## Style rules

- Use plain English. No jargon.
- Max 2 sentences per description.
- Use tables for lists of endpoints, components, or hooks.
- Use code blocks only for example request/response bodies when the shape is non-obvious.
- No emojis except ✅/❌ in auth columns.
- Do not describe implementation details (no "it calls prisma.findMany") — describe behaviour ("returns all expenses for the logged-in user").
