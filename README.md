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

## Barber View

Run `npm run seed:barbers` for development accounts `ravi@example.test`,
`amit@example.test`, and `imran@example.test`. Each uses `BarberDemo!2026`
and opens its own Barber View after sign-in.

To provision a real barber, set `STAFF_SETUP_EMAIL`, `STAFF_SETUP_PASSWORD`,
and `STAFF_SETUP_BARBER` to the barber's slug, such as `amit`, then run
`npm run staff:create-barber`. Remove the provisioning variables afterward.

## Owner Settings

Run `npm run seed:owner` for the development account `owner@example.test`
with password `OwnerDemo!2026!`. To provision a real owner, set
`STAFF_SETUP_EMAIL` and `STAFF_SETUP_PASSWORD` and run `npm run staff:create-owner`.

Owners can pause online joining and create private staff setup links from
`/admin`. Share each link with its intended staff member. A link expires
after 24 hours and can be used once.

Owners can also edit service names, durations, and prices, deactivate
services for new bookings, and set barber duty. Existing bookings keep their
service details. Clear a barber's current call or finish the service before
taking them off duty.

## Live updates

Express reads and writes the shared Atlas queue. Join, My Status, Reception,
and Barber View poll every three seconds by default. Set
`VITE_POLL_INTERVAL_MS` to change the interval. An accepted write refreshes
the initiating screen immediately. Confirming a join opens and immediately
loads the new My Status view.

## Online joining

Owners can pause or resume online joining from `/admin`. To configure the
timed cutoff, set `closingTime` in 24-hour `HH:mm` format on the
`salonSettings` document with `_id: "salon"`. Online joining closes 30 minutes
before that time in Asia/Kolkata. Without a closing time, there is no timed cutoff.
Set `openingTime` in the same format if online joining should also wait until
opening. When both times are set, a closing time earlier than opening means
the salon closes after midnight.

## Render

Create one Node Web Service from the project root. Set the build command to
`npm ci --include=dev && npm run build`, the start command to `npm start`, and
the health check path to `/api/health`. Set `MONGODB_URI` and `MONGODB_DB`
in Render's environment settings, and add the service's outbound IP ranges
to Atlas. The browser uses the same-origin `/api` path by default.
