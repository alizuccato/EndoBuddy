# EndoBuddy

A cycle and symptom tracker built for the endometriosis community. React + Vite frontend, Node.js API backend, Turso (SQLite) database.

## Local development

Two processes run side by side:

```bash
npm install
npm run api    # starts the backend on http://localhost:3001
npm run dev    # starts the Vite dev server on http://localhost:5173, proxies /api to the backend
```

Visit `http://localhost:5173`.

## Production build

```bash
npm run build   # builds the frontend to dist/
npm run start   # starts the backend (node server.js)
```

`npm run build` output (`dist/`) needs to be served statically; `npm run start` serves the API separately on port 3001. Check your hosting platform's docs for how to run a static frontend + Node backend together (or as two separate services).

## Required environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NODE_ENV` | **Yes, in production** | Must be set to `production` on your host. Some safety checks (see below) key off this. |

**Important:** the `/api/seed/auth` endpoint (creates hardcoded test accounts with known passwords — `patient@endobuddy.test` / `test123`, `admin@endobuddy.test` / `admin123`) is only enabled when `NODE_ENV=development`. If your hosting platform doesn't set `NODE_ENV` automatically, set it explicitly to `production` in your environment variables — otherwise this endpoint stays open. Confirm this is actually set in your host's dashboard before going live; don't assume the platform does it for you.

## Notes on the seed endpoints

- `POST /api/seed/auth` — dev/testing only, creates fixed test accounts. Gated behind `NODE_ENV=development`.
- `POST /api/seed/:userId` — **this is normal product functionality**, not a test tool. It's called automatically during onboarding (`completeOnboarding()` in `src/services/dbService.js`) to populate 30 days of sample cycle/symptom data for every new user. It's safe to leave enabled in production: it only works for accounts that haven't completed onboarding and have zero existing logs, and requires session auth for any account with an email on file.

  Worth double-checking as a product decision: every new real user currently gets this auto-generated sample data mixed into their account on signup. If that's intentional (e.g. so users can see what Insights look like before logging real data), consider labeling it clearly in the UI so it isn't confused with the user's own entries.
