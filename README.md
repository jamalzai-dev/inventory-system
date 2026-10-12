# University IT Inventory

A lightweight English/Pashto inventory application for a university IT department. Modular vanilla JavaScript; no production dependencies or build step.

## Run locally

Use Node.js 22 or later. From this folder:

```powershell
npm start
```

Open **http://127.0.0.1:8080**. Keep the same browser and origin to retain access to your local inventory. Stop the server with Ctrl+C. Do not open index.html directly: the application uses ES modules.

If port 8080 is occupied, choose another port (PowerShell):

```powershell
$env:PORT = '8091'
npm start
```

The server always binds to `127.0.0.1`; `PORT=0` selects an available port and prints its URL. Invalid ports and occupied ports produce a clear error. Changing ports changes the browser storage origin: export at the original origin before moving records. To return to the default, run `Remove-Item Env:PORT` in that terminal.

**Before moving from the old file:// location or a different hostname/port, export your inventory there.** Opening the updated index.html directly at its original file path displays an export-only recovery screen. Browser storage does not move with the project files. See [migration and recovery](docs/MIGRATION.md).

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

`npm run test:browser` runs the full regression suite; `npm run test:qa` adds deployment, resource, accessibility and Android touch-emulation checks. Set `TEST_BASE_URL` to the printed server URL if using a different port. The QA HTTP-origin test maps a synthetic hostname inside its disposable browser; it does not change Windows DNS or expose the server to the LAN. See [the final QA review](docs/QA-REVIEW.md).
