# Flows, Queue Rules, and Verification

## Online customer flow

1. The customer opens Home, selects services and a barber preference, and
   confirms. The API creates their entry and returns a token and status link.
2. My Status shows their queue position and estimated wait. At second in
   line it shows “Start coming to the salon.” At first it shows “You're next.”
3. Reception calls the next eligible customer for a barber. The customer's
   phone displays their turn and assigned barber. The TV highlights the token.
4. The barber taps Start, then Done. The entry leaves the active queue and
   contributes to today's statistics.

## Walk-in flow

Reception enters the customer's name, phone, services, and optional barber
preference. The walk-in receives a fresh token and joins the same queue in
arrival order.

## Account and access rules

- Online joins and walk-ins are guest queue entries. A phone number alone
  never grants access to an existing entry. My Status requires the private
  link, and reception can assist customers who lose it.
- Provision the initial owner through server-side setup. The owner provisions
  individual reception and barber accounts and privately shares a single-use,
  expiring setup link so each staff member can set their own password.
- Use a normalized, unique email address for staff and owner login, store
  password hashes server-side, and rate-limit failed login attempts. Store
  sessions server-side and invalidate them on sign-out or account disablement.
- Enforce roles at the API. Reception manages the queue, barbers can access
  only their own barber profile and service actions, and owners manage salon
  settings and staff access.
- Seed separate demo accounts for reception, barber, and owner in test and
  demo environments. Document their sign-in instructions in the README and
  keep demo accounts and data isolated from the real salon.

## Status and assignment rules

- Allowed transitions: Waiting → Called → In chair → Done.
  Waiting → Cancelled. Called → No-show. Terminal states stay final.
- Use one first-come, first-served queue with deterministic ordering.
  “Call next” for a particular barber selects the oldest Waiting entry
  that chose that barber or “Any barber.”
- Keep specific barber requests assigned to that barber. Display a break
  notice when the preferred barber is on break.
- Call next requires an on-duty, available barber with no Called or
  In chair entry. A break blocks new calls and preserves existing assignments.
- Make assignment concurrency-safe. Two reception actions may run at the
  same time, so enforce booking and barber occupancy on the server with
  MongoDB guards and transactions where multiple records must change together.
- Normalize phone numbers before validation and comparison. Enforce one
  active entry per phone across Waiting, Called, and In chair, including
  simultaneous online and walk-in submissions.
- Let a returning customer recover their existing spot. Require proof of
  access to the existing entry, such as its private link or
  receptionist-assisted lookup, before showing its details.
- Record calledAt, startedAt, and completedAt when the corresponding action
  succeeds. Reception can mark No-show once 10 minutes have passed since
  calledAt. A returning no-show gets a new token at the end of the queue.
- Close online joining 30 minutes before the salon's closing time. The
  owner's Closed setting can close it earlier. Walk-ins remain available.
  Check the restriction on the server and reflect it on Home and Join.
- Hiding a service removes it from new bookings. Save the booked service
  names, durations, and prices on each queue entry for existing customers.

## Position, wait, and statistics

- For “Any barber,” show the customer's position in the full Waiting list.
  For a specific barber, show their position among Waiting entries that
  could be called by that barber. Label the latter as that barber's line.
- Estimate wait for “Any barber” as the total service minutes of waiting
  entries ahead divided by the number of on-duty barbers who are off break.
  Count busy barbers as working and add a delay when all working barbers
  are occupied, based on their estimated remaining service time.
- For a specific barber, use the service minutes of eligible entries ahead
  plus that barber's estimated remaining service time, when applicable.
- If no eligible barber is working, or the preferred barber is on break,
  show the reason and display “Wait estimate unavailable.” Label all
  estimates as approximate.
- Use the salon's Asia/Kolkata time zone for opening hours and today's
  statistics. Count completed entries as served. Calculate average wait
  from queue entry to service start for customers served today.

## Test checklist

- [ ] Customers can join with name and phone and open My Status with their
  private link without creating an account.
- [ ] Staff and owners sign in with email and password and reach the correct
  screen. Changing the URL cannot grant another role's or barber's access.
- [ ] Staff setup links expire and work once. Signing out ends the session.
- [ ] Two services produce the correct total duration and price.
- [ ] Repeated or concurrent joins with the same phone create one active spot.
- [ ] Amit skips a customer who specifically chose Ravi.
- [ ] Simultaneous calls cannot assign the same customer twice or put two
      active customers with the same barber.
- [ ] Call next updates the customer's phone and TV within five seconds
      during normal connected operation.
- [ ] Start and Done update Reception, My Status, and TV.
- [ ] No-show is disabled before 10 minutes. Re-adding later issues a fresh
      token and places the customer at the end.
- [ ] Cancel removes a Waiting entry from the queue and releases the phone
      number for a later join.
- [ ] Closing online joining disables the public flow while walk-ins work.
- [ ] A barber on break receives no new calls and affected customers see
      the notice.
- [ ] The wait estimate updates when people finish and degrades gracefully
      when no eligible barber is working.
- [ ] English and Gujarati work on all seven screens without clipped text.
- [ ] Public home and TV responses contain no customer names or phone numbers.
- [ ] Phone, tablet, and TV stay in sync in separate browser windows.
