# Salon Queue Management System — Prompts

## File-specific prompts

### P1 — Review docs/01-brief.md

Read docs/01-brief.md. Explain the app in five bullets covering the problem,
users, queue flow, staff workflow, and scope. List genuine ambiguities you
find. Do not write code yet.

### P2 — Scaffold from docs/01-brief.md

Read AGENTS.md and docs/01-brief.md. Set up React, Vite, and Tailwind with
placeholder routes for all seven screens. Apply the ivory, aubergine, and
lilac theme and a persistent EN/GU toggle. Set up the Express API and
server-only Atlas configuration. Report how to start both processes.

### P3 — Build Join Queue from docs/02-screens.md

Build /join with the sample services and Ravi, Amit, and Imran seeded in
MongoDB Atlas. Update the duration, price, and estimated wait as the customer
selects services and a barber. Validate the phone and the one-to-three-service
limit. Check the full form at 360 px in English and Gujarati.

### P4 — Build Reception from docs/02-screens.md

Build /reception for a 10-inch landscape tablet. Seed eight customers in
the development database, including entries with specific barber preferences
and a called entry old enough for No-show. Verify Call next, No-show, Cancel,
and Add walk-in against the actual API.

### P5 — Refine the called state from docs/02-screens.md

Refine the called state on /status/:id. Use a full-screen aubergine surface,
a large token, the assigned barber's name, and a gentle pulse. Respect
reduced motion and trigger one supported vibration per call. Limit the
change to the called state.

### P6 — Build the TV view from a sketch

[Attach a sketch.] Use this sketch to build /display. Keep the visual
hierarchy of the sketch and apply the palette from docs/02-screens.md.
Use large token numbers and fit the barber rows and next five tokens on
a 1080p screen. Verify that public TV data contains token numbers only
for customers.

### P7 — Connect the flow from docs/03-flows-rules.md

Connect Join, My Status, Reception, and Barber View through Express and
MongoDB Atlas. Use short polling with immediate refresh after a successful
write. Verify synchronization in separate browser windows and explain
the approach in three lines.

### P8 — Implement Call next from docs/03-flows-rules.md

Implement Call next in the API with ordered eligibility and concurrency
protection. Give me three manual scenarios: skipping another barber's
customer, selecting the older eligible entry, and two reception sessions
attempting to call at the same time.

### P9 — Verify against docs/03-flows-rules.md

Run the full checklist in docs/03-flows-rules.md. Report Pass, Fail, or
Not verified for each item, with the check performed. Fix failures and
rerun affected checks. Preserve the approved screen layouts.

### P10 — Check AGENTS.md

Read AGENTS.md and explain the working rules you'll follow, including the
stack, Atlas connection boundary, design system, translation files, and
where queue rules belong.

## Build sequence

### Step 1 — Understand and set up

Read AGENTS.md and all three docs. Summarize the app in eight bullets,
flag blockers, and scaffold the seven routes, theme, and EN/GU toggle.
Add the Express API, server-side Atlas connection, an .env.example,
and a development seed command. Check the frontend builds and the API
starts. Verify Atlas connectivity if credentials are available.

### Step 2 — Home and Join Queue

Build Home and Join Queue from docs/02-screens.md. Load service and barber
data from Atlas through the API. Add validation on both the form and API.
Verify the two-service total, the three-service cap, and the closed state
on a phone-sized viewport.

### Step 3 — My Status

On Confirm, create the queue entry in Atlas, assign a token, and open
its private status link. Implement position, estimated wait, “Start coming,”
“You're next,” and the called state. Verify reload recovery and duplicate
phone handling.

### Step 4 — Reception Dashboard

Build the reception dashboard, walk-in form, and Call next. Make new phone
joins appear automatically. Enforce barber preferences and concurrency
rules in the API. Test with separate customer and reception windows.

### Step 5 — Barber View and Waiting Area TV

Build /barber/:name and /display. Wire Start, Done, and On break to the API.
Check that Reception, My Status, and TV reflect updates within five seconds
during normal connected operation. Check the 1080p layout and the TV's
enable-sound interaction.

### Step 6 — Owner Settings

Build /admin with services, barbers on duty, the online-joining switch,
and today's statistics. Verify that deactivating a service hides it from
new bookings and that closing online joining still permits walk-ins.

### Step 7 — Edge cases, polish, and verification

Implement and verify cancellation, the 10-minute no-show rule, re-entry
at the end, and break handling. Add clear empty, reconnecting, and error
states. Check every screen in English and Gujarati, verify 44 px touch
targets on phone screens, and run the full checklist. Report the result
and evidence for each check.

### Step 8 — Deployment

Prepare the Vite frontend for Vercel and the Express API for Render.
Configure the API to use MongoDB Atlas with server-side environment
variables. Check production API URLs, CORS, and direct navigation to
React routes. Verify the deployed app on a phone and in separate staff
and TV windows. Put the verified live URL directly below the README title.
For a seeded demo environment, list the demo staff access steps underneath.

## Optional fixes, refinements, and checks

### Bug — Re-added customer jumps the queue

Mark S-14 as No-show, then re-add the same customer. Expected: a fresh token
at the end of the waiting list. Reproduce the issue, identify the ordering
problem, fix it, and verify the result.

### Bug — The estimated wait is zero

My Status shows 0 min while three active entries are ahead. Trace the
inputs and calculation, compare them with docs/03-flows-rules.md, and fix
the discrepancy. Verify the result for “Any barber” and a specific barber.

### Bug — TV only updates after refresh

On /reception, clicking Call next updates the dashboard but /display still
shows the old token until I refresh. Expected: the token appears within five
seconds. Reproduce the issue in separate windows, identify the cause, and fix it.

### UI refinement — Reception barber cards

The barber cards are too small on a 10-inch landscape tablet. Arrange them
in a three-column row and show the time remaining as text and a progress bar.
Check the layout with Gujarati labels and a populated waiting list.

### UI refinement — Service cards

On /join, use a two-column service grid where the card content fits.
Put the localized service name first, duration below, and price in bold.
Use a lilac surface and checkmark for selection. Switch to one column when
long Gujarati names or narrow screens need more room.

### Scope check — Build Home only

Read AGENTS.md and docs/02-screens.md. Build only the Home screen.
Use the sample salon data seeded in Atlas and check the open, closed,
and empty states. Stop after the route works and list the changed files.

### Scope check — Implement one step

Implement Step 3 only. Add the API and UI changes required to create a
queue entry and show My Status. List the files changed and the cases
you verified.

### Plan a larger change

Before editing, show the proposed approach, which files you expect to
change, and how you will verify the result. Pause for my review.

### Deployment readiness

Check the exact repo setup for Vercel, Render, and MongoDB Atlas. Identify
build and start commands, required environment variable names, Atlas network
access requirements, and any hard-coded local URLs. Give deploy steps for
this repository.

### Deploy bug — Blank page or route returns 404

The app works locally, but the Vercel URL is blank or refreshing
/status/:id returns 404. Browser console: [paste error]. Check the build
output, environment URL, and SPA routing. Fix the verified cause and test
both the root URL and a direct status URL.
