# Local operation and future LAN deployment

## Current application

Run `npm start` (Node 22+; no dependency installation needed), then open http://127.0.0.1:8080. Keep that exact origin for subsequent use. ES modules need HTTP; opening index.html directly is no longer the supported workflow. The server binds loopback only and is a development preview, not an authenticated LAN service.

The supported frontend has no CDN calls, framework runtime or remote fonts. It uses locally available Segoe UI/Tahoma and optional installed Noto Naskh Arabic for shaped Pashto text. A reviewed, licensed Noto font can later be bundled to make typography identical across operating systems. Native print creates a localized full-inventory report. Downloads are JSON.

Deploy only index.html, app/, assets/inventory.svg, manifest.webmanifest and optional compatibility redirect pages. **Do not publish archive/, tests/, tools/ or old js/ modules.** The development server blocks archive/tests/tools. The archived code is reference material with known obsolete UI/security patterns, not a second supported application.

## Shared inventory plan (not implemented)

Serving these static files over a LAN does **not** share records. Each browser/profile/origin holds its own unencrypted inventory; no login, roles, authoritative audit trail or cross-device synchronization exists. Stale-tab detection reduces accidental overwrites, but the read/compare/write sequence is not a cross-tab transaction and cannot guarantee simultaneous writes. Use one editing tab.

Given this JavaScript-only project, a small **Node HTTP API plus SQLite database on the server's local disk** is a suitable next step for a modest staff workload. Clients would use HTTP endpoints, never a shared SQLite file over a network drive. SQLite documents this application-server pattern and the limits of concurrent/network-file access: [SQLite appropriate uses](https://www.sqlite.org/whentouse.html). A supported Node version and SQLite driver should be pinned when implementation starts; [Node's SQLite documentation](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html) describes its built-in API.

Proposed implementation sequence:

1. Add staff authentication, reader/editor/admin authorization, secure sessions and HTTPS at the university reverse proxy. Restrict access to the intended LAN/VPN.
2. Introduce tables for materials/categories/suppliers with foreign keys, uniqueness rules, quantities and monetary values with explicit rounding. Add server revisions for optimistic concurrency. Keep stock changes and their audit entries inside one database transaction.
3. Replace the Repository boundary with asynchronous API methods; retain the DOM components, translations and validation rules. Enforce validation and authorization again on the server.
4. Export every participating browser's current and legacy data, inventory their origins, and reconcile conflicting IDs and duplicate real assets. Follow MIGRATION.md; do not silently merge or convert currency. Validate an import into a staging database and compare counts, totals and sampled equipment records with owners.
5. Back up the server database, import the approved dataset in one transaction, make old clients read-only, and cut over to one authoritative API. Keep original exports and the rollback database snapshot. Confirm restoration from scheduled backups before production use.

Essential next features are authorized staff access, transactional stock movements with reasons, a reliable audit trail and server backups. Purchasing should only return as a supported module if the department needs it; the retained legacy history does not require rebuilding its old purchasing interface now.

## PWA readiness

The manifest and local SVG icon are present. `service-worker.js` is an **unregistered draft** with an explicit public-shell asset allowlist. It never caches inventory exports, localStorage records, arbitrary URLs or API responses. No offline-installability claim is made, and the preview server must remain running for normal use.

Before enabling PWA installation: supply target-browser PNG/maskable icons, establish HTTPS, review shared-machine data policy, test cache versioning/update prompts and rollback, and test offline behavior in supported browsers. Service workers require a secure context, with localhost permitted for development: [MDN service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers). An ordinary HTTP LAN IP is not the localhost exception. Keep authenticated inventory data out of indiscriminate service-worker caches.
