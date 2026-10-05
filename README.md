# IvyJournal

IvyJournal is a MySQL-backed productivity journal for planning, reflection, habits, goals and learning. It uses a Vite/React client and a small Express API with JWT authentication.

## Requirements
- Node.js 20+
- MySQL 8+

## Setup
1. Copy `.env.example` to `.env` and set `DATABASE_URL` and `JWT_SECRET`.
2. Create the database and tables: `mysql -u root -p < server/schema.sql`.
3. Install dependencies with `npm.cmd install`.
4. Optional demo data: `npm.cmd run seed`.
5. Start both apps: `npm.cmd run dev`.

Open http://localhost:5173. The API runs at http://localhost:4000.

## Architecture
- `src/`: responsive React application and design system.
- `server/index.js`: Express API, authentication, authorization, CRUD and AI service fallback.
- `server/schema.sql`: MySQL-only relational schema with foreign keys and indexes.
- `server/seed.js`: explicit development-only seed script.

AI features accept optional server-only `AI_API_KEY`, `AI_MODEL`, and `AI_BASE_URL` values for an OpenAI-compatible chat-completions endpoint. Ivy AI chat and journal reflections use the configured provider and return a user-friendly error if it is unavailable; when `AI_API_KEY` is unset, they use built-in fallback responses. Other AI-assisted features retain their deterministic fallback behavior. Never expose these values in client code.

## Production
Run `npm.cmd run build`, serve the generated `dist` directory behind a reverse proxy, and run `npm.cmd start` for the API. Use HTTPS, a strong JWT secret, a managed MySQL instance, and a private upload volume in production. Do not commit `.env` or uploaded files.
