# University IT Inventory

A lightweight English/Pashto inventory application for a university IT department. Modular vanilla JavaScript; no production dependencies or build step.

## Run locally

Use Node.js 22 or later. From this folder:

```powershell
npm start
```

Open **http://127.0.0.1:8080**. Keep the same browser and origin to retain access to your local inventory. Stop the server with Ctrl+C. Do not open index.html directly: the application uses ES modules.

**Before moving from the old file:// location or a different hostname/port, export your inventory there.** Browser storage does not move with the project files. See [migration and recovery](docs/MIGRATION.md).

## Features

- Materials, categories and suppliers: add, edit, search and safely delete.
- Stock quantities, reorder levels, equipment condition, location, responsible person, serial, supplier, AFN price, purchase date and notes.
- Dashboard, stock/category/value reports and localized printing.
- English/Pashto, LTR/RTL, persistent light/dark themes, responsive tables and keyboard-accessible forms/dialogs.
- Validated JSON restore with preview and confirmation; recovery snapshot before each inventory change; raw archive export.
- Safe read-only inspection of legacy products, orders, adjustments and activity logs.

New installations start empty. Add a category, then materials; suppliers are optional. The interface does not translate stored names or descriptions.

## Data and deployment boundaries

Records remain in this browser's localStorage under the existing university_it_inventory_v2 key. Legacy ims_* keys remain untouched. There is no authentication or centralized shared database. Use one editing tab and download backups regularly. The latest recovery snapshot is not a substitute for external backups.

The manifest and an unregistered service-worker draft prepare for future PWA work; installability/offline caching is not enabled. Pashto translations need fluent staff review. Do not deploy the archive directory.

- [Audit and foundation decision](docs/AUDIT.md)
- [Migration and recovery](docs/MIGRATION.md)
- [LAN/backend and PWA plan](docs/DEPLOYMENT.md)
- [Changed files and fixes](docs/CHANGES.md)
- [Test results and commands](docs/TESTING.md)

## Tests

```powershell
npm test
```

For browser checks, start the local server, make Playwright available, then run `node tests/browser.mjs`. The suite defaults to installed Microsoft Edge; set `BROWSER_CHANNEL` to change it and `PLAYWRIGHT_MODULE` to point at an existing Playwright installation. It uses a disposable profile and never reads your normal browser data. Screenshots and test exports go to tests/artifacts (ignored by Git).
