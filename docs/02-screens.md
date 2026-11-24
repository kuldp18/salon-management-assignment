# Screens and Design

## Design system

- Canvas: warm ivory #FAF7F2. Cards and form surfaces: white #FFFFFF.
- Primary actions: aubergine #4D285F with white text.
- Selected surfaces: soft lilac #EFE6F5 with dark aubergine text.
- Main text: #241C28. Secondary text: #655C6A.
- Use jade for available and successful states, amber for delays, and rose for
  destructive actions. Pair every status color with a label or icon.
- Use DM Sans for English and Noto Sans Gujarati for Gujarati, with appropriate
  fallbacks. Use tabular numerals for tokens, timers, and statistics.
- Use consistent spacing, clear section hierarchy, visible keyboard focus, and
  a minimum 44 × 44 px touch target on phones. Support reduced motion.
- Reuse buttons, status chips, form fields, cards, and feedback components.
  Provide loading, empty, error, and retry states where data is fetched.
- Fit the customer and barber screens from 360 px wide. Design reception for a
  10-inch landscape tablet and check the TV view at 1920 × 1080.
- Keep English and Gujarati available from the same toggle. Let labels wrap
  without clipping, especially on service cards and primary buttons.

## 1. Home (/)

- Show the salon name, logo, language toggle, and current opening status.
  When open, show today's closing time.
- Feature a live queue card with the number waiting and the estimated wait
  for “Any barber.” Label the wait as an estimate.
- Show barber availability with names and labels such as Available, Serving,
  or On break.
- Make “Join queue” the primary action. If online joining is closed, disable it
  and show the reason. If the queue is empty, show “No one waiting. Walk right in!”

## 2. Join Queue (/join)

- Collect customer name and a validated 10-digit phone number.
- Keep the guest form focused on the queue. Ask for service and barber choices
  alongside the name and phone number.
- Show active services in selectable cards with localized names, duration, and
  price in ₹. Allow one to three services.
- Seed examples: Haircut, 30 min, ₹150. Beard trim, 15 min, ₹80.
  Hair spa, 45 min, ₹400.
- Show “Any barber · first available” as the default. Also show selectable
  cards for Ravi, Amit, and Imran when they are on duty. Label breaks clearly.
- Update the total duration, total price, and estimated wait as selections
  change. Keep the summary and “Confirm” easy to reach on a phone.
- Show errors next to the relevant field. Prevent repeated submissions while
  the request is pending. Open My Status after the API confirms the entry.

## 3. My Status (/status/:id)

- Use a private status link. Show the token prominently, followed by position
  and an estimated wait such as “About 35 min.”
- Use a restrained circular progress graphic. Keep the estimate readable as
  text and refresh it as the live queue changes.
- At second in line, show “Start coming to the salon.” At first, show
  “You're next.” When called, open a full-screen aubergine state with the
  token, “It's your turn,” and the assigned barber's name.
- Give the called state a gentle pulse when reduced motion is off. Attempt
  one short vibration when the device supports it.
- Offer “Cancel my spot” with confirmation while the entry is Waiting.
- Show clear states for In chair, Done, Cancelled, and No-show. On a temporary
  connection failure, show when the last live update was received.

## 4. Reception Dashboard (/reception)

- Require staff access. Put “Add walk-in” in the header with queue totals
  and a connection indicator.
- On a landscape tablet, show up to three barber cards across the top. Each
  card shows availability, the current token, remaining service time as
  text and a progress bar, and an eligible “Call next” action.
- Below the cards, show the waiting list in arrival order with token, name,
  services, barber preference, wait so far, and actions.
- Highlight waits over 60 minutes with an amber label. Show called entries
  and their elapsed time in the relevant barber card.
- Use an inline panel or drawer for walk-ins. Support Cancel for waiting
  entries and No-show for called entries once they are eligible.

## 5. Barber View (/barber/:name)

- Require staff access for the assigned barber. The server verifies access
  even when a user edits the URL.
- Show the current customer's name, token, and services. Show the elapsed
  service timer after Start.
- Use one large primary action at a time: Start when Called, Done when
  In chair. Show the next eligible customer as a compact preview.
- Include an Available / On break control. Show a clear idle state when there
  is no current customer.

## 6. Waiting Area TV (/display)

- See the [TV layout sketch](tv-sketch.png) for the barber and waiting-list
  hierarchy.
- Use a dark aubergine canvas #24162E, ivory text, and lilac emphasis for
  newly called tokens. Keep the two main sections visible together on a TV.
- Show each on-duty barber, their status, and their current token. Show the
  next five waiting tokens with approximate times.
- When a new token is called, briefly highlight it. Play one short, quiet
  buzzer tone if sound is enabled through the “Enable buzzer” control.
- Show tokens only for customers. Use large type readable from five metres.
  Check the layout at 1080p and verify viewing distance on the actual TV.

## 7. Owner Settings (/admin)

- Require owner access. Show today's customers served, average wait, and
  no-shows at the top.
- Provide a services editor for English and Gujarati names, duration, price,
  and active status. Save changes with clear feedback.
- Let the owner set barbers on duty and toggle online joining.
- Make the consequences of each change clear, such as “Online joining is
  closed. Reception can still add walk-ins.”

## Staff sign-in (/login)

- Use the same bilingual email and password form for receptionists, barbers,
  and owners. Support password managers and show a generic message for
  rejected credentials.
- After sign-in, return staff to the page they requested if their role allows
  it. Otherwise, open Reception, the barber's own view, or Owner Settings
  according to the account's role.
- Offer Sign out on every protected screen, including the shared reception
  tablet. Keep Home, Join, My Status, and the TV outside the staff sign-in flow.

## Staff account setup

- In Owner Settings, let the owner invite individual receptionists and
  barbers using a display name, work email address, and role. For a barber
  account, also select the corresponding barber profile.
- Let invited staff set their own password using a private setup link.
  Provide a clear message when a link is expired or already used.
