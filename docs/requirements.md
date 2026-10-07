# Requirements: mirou matcha order tracker

| | |
| --- | --- |
| **Product** | A private order tracker for mirou matcha, a home-based matcha bar in Bay, Laguna |
| **Owner** | The owner of mirou matcha (decides the requirements and signs off in UAT) |
| **Tester** | Dion Anthony Flores |
| **Status** | Phase 1 live since 7 Oct 2026, with her login and private database (Supabase). Her trial (UAT) is on hold because she has no time right now; a [tester walkthrough on a real phone](uat-log.md#tester-walkthrough-on-a-real-phone-while-uat-is-on-hold) passed 6 of 6. |

## Where the requirements came from

Asked the owner on 4 to 6 Oct 2026, before anything was built:

- Orders arrive in Messenger and are tracked only in the chats. The shop has its own delivery driver.
- Only the owner will use the tracker.
- Matcha powder runs out most. It is bought online in 100, 250 or 500 g bags and takes 3 to 5 days to arrive, sometimes 7. Hojicha uses the same grams per cup but sells slower. Milk is a quick grocery trip, so it isn't tracked.
- One cup uses 4 g of powder (12 oz) or 5.5 g (16 oz upsize). The upsize costs ₱35 more on any drink.
- Payment is by cash, GCash or bank transfer.

## Requirements and acceptance criteria

| ID | Requirement | Acceptance criteria (how we know it's done) | Phase | Tests |
| --- | --- | --- | --- | --- |
| T-REQ-01 | She can log an order from a chat quickly. | Pick drinks with size, milk and quantity (1–99). Prices: menu + ₱35 for 16 oz + ₱10 for oatmilk. The same drink, size and milk join one line. Name required; address required for delivery; delivery fee is 0 or more. Each line keeps the price it was sold at. Orders survive closing the app. | 1 ✅ | UT-01–03, 08, 09; TT-03–07, 15, 16 |
| T-REQ-02 | Each order moves through its steps and is marked paid. | Delivery: New → Preparing → Out for delivery → Done. Pick up: New → Preparing → Ready for pickup → Done. One tap per step, and a double tap moves only one step. Cancel asks first. Paid by cash, GCash or bank transfer, and can be undone. | 1 ✅ | UT-04; TT-08–12 |
| T-REQ-03 | "Copy for driver" gives the driver everything in one message. | Order number, name, contact (if any), address, drinks with size and milk, and either the exact amount to collect (with the delivery fee shown) or "paid already". Notes if any. Pick up orders have no driver section. | 1 ✅ | UT-07; TT-13, 14 |
| T-REQ-04 | The Today screen shows what to do and how the day is going. | Open orders, oldest first. Sales (drinks only), amount still to collect, cups and open orders. "Today" is the day in Manila, whatever time zone the phone uses. Cancelled orders are left out. | 1 ✅ | UT-05, 06; TT-01, 02, 08, 11 |
| T-REQ-05 | Bestsellers for the week and the month. | | 3 | |
| T-REQ-06 | Matcha and hojicha stock in grams. | Bags of 100, 250 or 500 g added on arrival; each cup uses its size's grams; the count can be corrected. | 2 | |
| T-REQ-07 | "Order by" reminder for each powder. | Order-by date = run-out date − delivery days (7 by default, editable), using the busier of the last 7 or 14 days. Amber 3 days before, red on the day. With no sales yet it says it can't estimate. | 2 | |
| T-REQ-08 | Only she can see her data. | Login required. Someone with the app's address and public key but no login is refused when reading, adding, changing or deleting orders, and cannot create an account. Typed text is always shown as text, never run as code. The tracker stays out of search engines. | 1 ✅ | TT-06, 19, 24, 26 |
| T-REQ-09 | A public demo with made-up orders, for the portfolio. | No real customer appears anywhere public. The demo can be reset. | 1 ✅ | TT-01, 20 |
| T-REQ-10 | Paste the website's Messenger message to fill in an order. | Needs sizes on the website first (CR-02, approved, to follow). | 3 | |
| T-REQ-11 | A backup she owns. (The free database plan has no backups.) | "Download all orders" gives a spreadsheet file with every order, safe to open in Google Sheets or Excel (no text can run as a formula). A reminder shows when there has never been a backup, or the last one is 7 or more days old. | 1 ✅ | UT-11–13; TT-21–23 |
| T-REQ-12 | The database doesn't fall asleep. (Free projects pause after a week without use.) | A daily automatic check calls a harmless function that reads no data. | 1 ✅ | TT-25 |

## Assumptions (confirmed on 6 Oct 2026)

- Delivery fees are not counted as **sales** (they're shown separately and included in "to collect").
- The delivery fee is typed per order, because it varies.
- A cancelled order stays in the list as "Cancelled" instead of being deleted.
- New orders start as "Pick up" (same as the website); she switches to Delivery when needed.
- The contact number is optional and only used for the driver.

## Limits of the free database plan (checked 6 Oct 2026)

500 MB of data (years of orders for a shop this size), no automatic backups (hence T-REQ-11), and a pause after a week without use (hence T-REQ-12; a paused project keeps its data and can be resumed from the Supabase dashboard).

## Changes

| ID | Change | Status |
| --- | --- | --- |
| CR-02 (website) | Add the 16 oz upsize (+₱35) to the website's order builder and Messenger message | Approved by the owner, scheduled later |
