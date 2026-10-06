# mirou matcha order tracker

A private order tracker for [mirou matcha](https://dionanthonyflores-prog.github.io/mirou-matcha/), a home-based matcha bar. It replaces tracking orders in Messenger chats: the owner logs each order, moves it along (New → Preparing → Out for delivery or Ready for pickup → Done), marks it paid, and copies a ready-made message for the delivery driver.

The public version is a **demo with made-up orders**, saved only in your own browser. The owner's real orders live in a private database that only she can log in to. No real customer appears anywhere in this repository.

## Status

| Phase | What | Status |
| --- | --- | --- |
| 1 | Orders, status, payment, "Copy for driver", Today screen | Built in demo mode. Next: her private database (Supabase), then UAT with the owner |
| 2 | Matcha and hojicha stock, and an "order by" reminder that allows for online delivery time | Planned |
| 3 | Bestsellers, and pasting the website's Messenger order to fill in an order | Planned |

## QA

- [Requirements and acceptance criteria](docs/requirements.md), gathered from the owner before building, each linked to its tests
- [UAT log](docs/uat-log.md) for the owner's real-world trial after each phase
- **Unit tests** (`tests/unit/`, UT-01 to UT-10): prices, totals, status steps, "today" in Manila time, the driver message, and what's needed before an order can be saved
- **End-to-end tests** (`tests/e2e/`, TT-01 to TT-20) with Playwright on an Android phone, an iPhone and a desktop, including security (typed text never runs as code) and accessibility basics
- **The tests were checked against deliberate bugs:** 7 different mistakes were put into the app one at a time (for example, counting cancelled orders as sales, or a double tap skipping a step), and the tests caught every one

## Run it on your computer

```bash
npm install
npx playwright install chromium webkit
npm run serve        # open http://localhost:5176
npm test             # unit tests, then end-to-end tests
```
