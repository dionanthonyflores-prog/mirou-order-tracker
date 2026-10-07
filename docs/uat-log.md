# User acceptance testing (UAT) log

The owner uses the tracker for real after each phase and decides whether it is accepted.
Each session records what she did, what worked and what didn't. Problems become bugs or change requests.

**How it works**

1. She uses the tracker for her real orders for about a week, next to her usual chats (nothing is lost if something goes wrong).
2. At the end of each day she tells us anything confusing, slow or wrong. We write it down here exactly as she said it.
3. At the end of the week she goes through the acceptance criteria in [requirements.md](requirements.md) and signs off each one, or says what's missing.

> **Status, 7 Oct 2026: on hold.** Phase 1 is live, but the owner has no time to try new apps right now. It's ready whenever she is.
> In the meantime, the tester walked through it on a real phone (below). That shows it works on a real phone, but it is not her sign-off.

## Tester walkthrough on a real phone (while UAT is on hold)

7 Oct 2026 · Samsung Galaxy S24 Ultra, Chrome · the live app. Orders were only added in the demo, so the walkthrough put nothing into her data (see the note below for one test order that did get in earlier, and how it was removed).

| ID | Check | Where | Expected | Result |
| --- | --- | --- | --- | --- |
| TW-01 | Log in with her account, then log out | Real app | Today opens after logging in; logging out goes back to the login screen | ✅ Passed |
| TW-02 | Enter an order from a pretend Messenger chat (2× Matcha latte 16 oz oatmilk, 1× Hor-jicha, delivery, ₱50 fee), timed | Demo | Takes under 1 minute; total ₱660 | ✅ Passed |
| TW-03 | Move it New → Preparing → Out for delivery → Done, then mark it paid by GCash | Demo | One step per tap; it leaves "To do"; "To collect" drops by ₱660 | ✅ Passed |
| TW-04 | "Copy for driver", then paste it into a chat, before and after marking it paid | Demo | Address, drinks with size and milk, "Collect: ₱660 (drinks ₱610 + delivery ₱50)"; after paying, "Paid already by GCash: nothing to collect" | ✅ Passed |
| TW-05 | Download the backup and open it in Google Sheets | Live app | One row per order, readable columns and peso amounts | ✅ Passed |
| TW-06 | Add it to the home screen and open it from the icon | Real app | Opens straight to the tracker | ✅ Passed |

**Test data note:** before the walkthrough, one test order (#101, "Test") was saved to her real database while trying the live app. It was found with a read-only query, then removed with a delete that matched only that order's number and name (1 row), so her first real order will still be #101. The rule since then: on the real app, only log in and out; everything else is checked in the demo.

## Phase 1: orders, status, payment, driver message, Today

| Date | What she did | What worked | Problems or wishes | Logged as |
| --- | --- | --- | --- | --- |
| | | | | |

**Sign-off**

| Requirement | Accepted? | Notes |
| --- | --- | --- |
| T-REQ-01 Log an order quickly | | |
| T-REQ-02 Status and payment | | |
| T-REQ-03 Copy for driver | | |
| T-REQ-04 Today screen | | |
| T-REQ-08 Only she can see her data | | |
| Assumptions (see requirements.md) | | |
