# DevBiz Client Tracker

A secure client, payment, and project-delivery workspace for the DevBiz team. It uses a React/Vite frontend, an Express API, Supabase Auth, and PostgreSQL with Row Level Security.

## Features

- Shared team access code with a signed, HTTP-only session cookie
- Dashboard summarising financials, at-risk projects, and workspace activity
- Dedicated Clients, Tasks, and Payments sections, each with search, filters, and sorting
- Client create, edit, and archive workflows
- Multiple payment records with calculated totals and remaining balances
- Per-client Kanban boards with drag-and-drop tasks, plus a keyboard "Move to" menu
- Task priorities, due dates, multiple assignees, comments, and activity history
- Command palette (`Cmd`/`Ctrl` + `K`) for search and navigation
- Light and dark themes that follow the system setting until overridden
- Responsive layout with skeleton loading, empty, toast, and error states

## Frontend structure

The client lives in `src/client`:

- `styles/` — the design system. `tokens.css` holds every colour, type, spacing, and
  motion token for both themes; `base.css`, `layout.css`, `components.css`, and
  `pages.css` build on it. Components reference semantic tokens only, never raw values.
- `components/ui/` — reusable primitives (button, field, modal, menu, badge, toast,
  skeleton) shared by every page.
- `components/` — app-level composites: the shell, command palette, forms, board.
- `pages/` — one file per route.
- `hooks/` — data fetching (`useResource`), storage, debounce, and hotkeys.

Typography is self-hosted Montserrat (UI) and Orbitron (wordmark), matching devbiz.site.
Fonts are bundled rather than loaded from Google so the production `helmet` CSP applies
without exceptions.

## Architecture and security

The browser never receives a Supabase key or the team access code. Express verifies the access code and issues a signed, HTTP-only, SameSite cookie that expires after 12 hours. The service-role key remains server-only, and every non-health application API route requires a valid session cookie.

RLS is enabled on every application table as defense in depth. Application data is accessed only by the protected Express API.

## Local setup

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env`.
3. Fill in the project URL and server-only service-role key from Supabase project settings.
4. Set `TEAM_ACCESS_CODE` to the private code shared by your team.
5. Set `ACCESS_TOKEN_SECRET` to a unique random value of at least 32 characters.
6. Install dependencies with `npm install` (or `pnpm install`).
7. Run `npm run dev` and open `http://localhost:5173`.

The Express API runs at `http://localhost:3001`; Vite proxies `/api` requests to it. The unauthenticated health check is available at `GET /api/health`.

## Deploying to Vercel

The frontend is static-hosted on Vercel's CDN and the Express API runs as a
serverless function at `/api/*`. `vercel.json` wires the two together.

1. **Apply the login-limiter migration first.** Run
   `supabase/migrations/202608260006_serverless_login_limiter.sql` in the
   Supabase SQL editor. Until it exists the limiter falls back to per-instance
   in-memory counting, which is weak on serverless — see the note below.
2. Import the repository in Vercel. The Vite preset is detected; the build
   command and output directory are already set in `vercel.json`.
3. Set these environment variables in the Vercel project (all environments):
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TEAM_ACCESS_CODE`,
   `ACCESS_TOKEN_SECRET`, and `NODE_ENV=production`.
   `PORT` and `CLIENT_ORIGIN` are unused on Vercel and have safe defaults. The
   `VITE_*` variables are not needed: the browser never talks to Supabase
   directly, everything goes through the API.
4. Deploy, then sign in with `TEAM_ACCESS_CODE`.

Notes on how this differs from a single-process deployment:

- `src/server/index.js` is not used on Vercel. `api/index.js` exports the same
  Express app as a request handler instead, since serverless has nothing to
  keep a `listen()` call alive.
- Static file serving inside `createApp()` is skipped when `process.env.VERCEL`
  is set, because the CDN already serves `dist`.
- Security headers are declared twice on purpose. Helmet covers API responses;
  `vercel.json` covers the static HTML, which never passes through Express and
  would otherwise have no CSP at all. Keep the two in sync. `style-src` needs
  `'unsafe-inline'` because the UI uses React inline `style` attributes.
- `trust proxy` is enabled behind Vercel so `req.ip` is the visitor rather than
  the proxy — without it the rate limiter would bucket everyone together.
- Rate limit state lives in Postgres (`login_attempts`) so all instances share
  one budget. If that call fails the middleware degrades to in-memory counting
  and logs a warning rather than locking the team out.

## Deploying as a single process

Any host that runs a persistent Node process — Render, Railway, Fly.io, Docker,
a VPS — needs no special configuration:

```bash
pnpm install && pnpm build
NODE_ENV=production pnpm start
```

One process then serves both the API and the built SPA on one port and one
origin. `vercel.json` and `api/index.js` are simply ignored.

## Team access

Share `TEAM_ACCESS_CODE` privately with Erman, Jasmine, and Jonhyl. The migration seeds those names with distinct avatar colors for task assignment. A shared code does not provide individual audit identities; actions and comments appear as “DevBiz Team.” Change the code immediately if it is disclosed outside the team.

## Database

The migration is stored at `supabase/migrations/202608250001_initial_schema.sql` and creates:

- `profiles`
- `team_members`
- `clients`
- `payments`
- `kanban_columns`
- `tasks`
- `task_assignees`
- `task_comments`
- `activity_logs`
- `client_summaries` computed view

Creating a client automatically adds Backlog, To Do, In Progress, For Review, and Completed columns. Client progress is calculated from tasks in columns marked as completed. Payment totals and remaining balances are calculated by the database view rather than trusted from browser input.

## Commands

```text
npm run dev       Start the frontend and API in watch mode
npm run dev:api   Start only the API
npm run build     Create the production frontend bundle
npm start         Serve the API and production frontend
npm run lint      Run ESLint
npm test          Run the test suite
```

For production, set `NODE_ENV=production`, use an HTTPS origin in `CLIENT_ORIGIN`, and store all secrets in the hosting platform's encrypted environment settings.

## REST API

All application routes require the signed session cookie. `/api/health`, `/api/auth/access`, and `/api/auth/logout` are public.

- `/api/clients` and `/api/clients/:id`
- `/api/clients/:id/archive`
- `/api/clients/:clientId/payments` and `/api/payments/:id`
- `/api/clients/:clientId/board`
- `/api/tasks`, `/api/tasks/:id`, and `/api/tasks/:id/move`
- `/api/tasks/:taskId/comments` and `/api/comments/:id`
- `/api/clients/:clientId/columns` and `/api/columns/:id`
- `/api/team-members`
- `/api/clients/:clientId/activity`
- `/api/dashboard/summary`
