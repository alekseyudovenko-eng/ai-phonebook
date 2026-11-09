# Security policy

## Scope

This repository contains a single-page prototype intended to run inside the Claude artifact environment. It is not currently a standalone, production-ready web application. Do not deploy it publicly with real contact data until the controls below are implemented and reviewed.

## Sensitive data

Contact records can include personal data, business contact details, notes, and communication history. Treat exports, backups, prompts, logs, and uploaded business-card images as sensitive data.

- Use only data you are authorized to store and process.
- Before sending contact information to an AI or search provider, disclose what fields are sent and obtain the user's consent.
- Send only the minimum fields required for the requested operation. Avoid sending notes and conversation history by default.
- Define retention and deletion behavior for records, images, logs, and backups.
- Do not commit real contacts, exports, credentials, API keys, or uploaded images to this repository.

## Production deployment requirements

Before exposing a standalone deployment to users:

1. Move AI, web-search, and persistence credentials to a server-side API. Never put provider secrets in browser code.
2. Add authentication and authorization on every server operation; isolate each user's contacts and files.
3. Use TLS, secure session handling, rate limits, request-size limits, and server-side input validation.
4. Restrict image and document upload types and sizes; store uploads privately and serve them only after authorization.
5. Review third-party scripts and dependencies, pin versions, and update them through a tracked process.
6. Provide user-facing privacy information, export, deletion, and account/data-retention controls.
7. Test spreadsheet exports against formula injection. Untrusted values beginning with `=`, `+`, `-`, or `@` must not be interpreted as formulas by spreadsheet software.
8. Treat web pages and search results as untrusted input. Do not execute their contents or let them override system instructions.

## Reporting a vulnerability

Please do not publish contact data, credentials, or an unpatched vulnerability in a public issue. Contact the repository owner privately with a concise description, impact, and reproduction steps. Rotate any credentials that may have been exposed.
