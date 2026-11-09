# Production-readiness plan

This project is currently a Claude-hosted, single-file prototype. This plan tracks the steps required to make it a maintainable standalone application. Keep the existing artifact usable while migrating incrementally.

## P0 — Protect contact data and exports

- Decide which contact fields may be sent to each AI/search provider; minimize payloads and ask for consent before sending sensitive notes or communication history.
- Add spreadsheet-formula neutralization to CSV export and tests for values starting with `=`, `+`, `-`, and `@` (including leading whitespace/control characters).
- Validate and normalize URLs before rendering clickable links; retain safe escaping for all user-controlled HTML.
- Document data retention, deletion, and private-image handling. Never put real contacts or credentials in Git.

## P1 — Establish a testable baseline

- Extract pure contact, import/export, deduplication, and validation functions from `index.html` into small modules.
- Add unit tests for CSV quoting and delimiters, vCard round-trips, duplicate detection, malformed input, and formula injection.
- Add browser-level tests for add/edit/delete, keyboard navigation, dialogs, mobile layout, and error/loading states.
- Add CI to run tests and static checks on every pull request. Pin and periodically review third-party dependencies.

## P2 — Decouple the application from the Claude artifact host

- Replace direct host-provided storage, sampling, downloads, assets, and browser tools with explicit service interfaces.
- Build a server API for persistence, AI, and web search; keep provider keys server-side.
- Add authentication, per-user authorization, private file storage, input/upload limits, rate limiting, and audit-safe error handling.
- Keep AI-generated changes reviewable and require confirmation before they modify a contact.

## P3 — Scale and improve usability

- Add pagination or virtualized rendering and server-side search for larger address books.
- Add accessible dialog focus trapping/restoration, keyboard tests, and screen-reader status announcements.
- Test supported browsers and mobile devices; provide clear offline, unavailable-service, and partial-result states.
- Measure AI quality, latency, cost, and data sent; make incomplete search coverage explicit.

## Release gate

Do not describe a standalone deployment as production-ready until P0 and P1 are complete and P2 has authentication, authorization, privacy, and secure secret handling reviewed. The current Claude artifact may continue to be used with non-sensitive or appropriately consented data while this work is in progress.
