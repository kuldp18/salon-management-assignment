# AGENTS.md — Salon Queue Management System

Build a bilingual salon queue that customers can join by phone and staff can
manage from a tablet or phone, with a live waiting-area TV display.

## Read first

- docs/01-brief.md for scope and users.
- docs/02-screens.md for routes, layouts, and design.
- docs/03-flows-rules.md for queue logic and acceptance checks.

## Stack and development

- Frontend: React, Vite, Tailwind CSS, and React Router.
- Backend: Node.js and Express with the MongoDB Node.js driver. Implement proper email/password login and also keep test demo accounts and add them in the readme.
- Cloud database: MongoDB Atlas (free tier). Use one reusable server-side client.
  Use collections for services, barbers, queue entries, and salon settings.
- Keep MONGODB_URI and database access credentials server-side. Document
  variable names in .env.example and use VITE_API_URL for the public API URL.
- Provide a root npm run dev command that starts the frontend and API,
  and a seed command for sample services and barbers.
- Keep MongoDB Atlas as the source of truth. Use configurable polling around
  three seconds for live screens and refetch after successful write actions.
- Host the frontend and API in one Render web service. Put the verified live
  demo URL directly below the README title, followed by demo staff access
  instructions if applicable.

## Working rules

- Implement the requested screen or feature and its required integration.
- Use the ivory, aubergine, and lilac design system in docs/02-screens.md.
- Put UI strings in shared EN/GU translation files.
- Centralize validation, queue transitions, wait estimates, and permissions
  in the API. Use atomic database operations and indexes for concurrency rules.
- Protect staff and owner routes. Keep private status links unguessable.
  Return only the fields each public screen needs.
- After each task, report the changed files, the checks you ran, and anything
  you could not verify.
