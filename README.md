# Kesh Studio

A bilingual salon queue with English/Gujarati and light/dark preferences.
Guests can join the queue and follow their token through a private link.

## Run locally

With Node.js 22.12 or newer, run these commands from the project root.

```sh
npm install
npm run dev
```

- Frontend: http://127.0.0.1:5173
- API health: http://127.0.0.1:3001/api/health

To run the two processes in separate terminals, use `npm run dev:web` and
`npm run dev:api`. Run `npm run build` followed by `npm start` to serve
the built frontend and API from the same Express process.

## Atlas

Copy `server/.env.example` to `server/.env` and set `MONGODB_URI` to your
Atlas connection string. Set `MONGODB_DB` if you want a database name other than
`salon`. Keep both settings on the server. The root `.env.example` shows
`VITE_API_URL`, which defaults to the same-origin `/api` proxy in development.

The frontend shell and API health endpoint work without Atlas credentials. Use
`GET /api/ready` to check Atlas connectivity and `npm run seed` to add the
sample services and barbers. The seed leaves existing matching records intact.

## Reception

Run `npm run seed:reception` with a development database to add eight sample
customers and the receptionist demo account. Then open `/reception` and sign
in with `reception@example.test` and `ReceptionDemo!2026`. The seed is
repeatable and preserves changes to existing demo entries. Use a separate
database for the live salon.

For a real receptionist, set `STAFF_SETUP_EMAIL` and `STAFF_SETUP_PASSWORD`
for the target database, then run `npm run staff:create`. Remove those
provisioning variables after creating the account. Demo sign-in is disabled
on Render and in production mode.

To configure online joining, use the `salonSettings` document with
`_id: "salon"`. Set `onlineJoiningOpen` to `false` to pause online joins.
Set `closingTime` in 24-hour `HH:mm` format to close online joining 30 minutes
before that time in Asia/Kolkata. Without a closing time, there is no timed cutoff.

## Render

Create one Node Web Service from the project root. Set the build command to
`npm ci --include=dev && npm run build`, the start command to `npm start`, and
the health check path to `/api/health`. Set `MONGODB_URI` and `MONGODB_DB`
in Render's environment settings, and add the service's outbound IP ranges
to Atlas. The browser uses the same-origin `/api` path by default.
