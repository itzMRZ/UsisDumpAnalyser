# Connect Dump Analyser

> Browse, search, and compare BRAC University course section data exported from USIS (Connect).

**Live:** <https://connect-dumps.itzmrz.xyz/>

---

## Features

| Feature | Description |
| --- | --- |
| Live data | Current semester fetched from CDN; falls back to bundled archive automatically |
| Multi-semester | Switch between Fall 2026, Spring 2026, Fall 2025, Summer 2025, Spring 2025, Fall 2024, Summer 2024 |
| Search | Real-time filter by course code, faculty name/initial, section, or schedule |
| Sort | Click any column header to sort ascending / descending |
| Faculty prediction | Suggests probable faculty for TBA sections based on historical data |
| Pagination | 50 rows per page with numbered navigation |
| Dark mode | System-aware toggle; preference persisted in `localStorage` |
| Responsive | Mobile-friendly with horizontal scroll and table zoom controls |

---

## Usage

1. Open `index.html` directly in a browser — no server or build step required.
2. Click a semester button to switch datasets. The current semester loads automatically.
3. Type in the search bar to filter rows. Search persists when switching semesters.
4. Click a column header to sort; click again to reverse.
5. Use `+` / `−` zoom buttons on mobile to adjust table scale.

---

## File Structure

```text
index.html              Entry point
styles.css              All styles (responsive, dark mode via CSS variables)
favicon.ico
img.png                 Open Graph preview image
data/
  fall-26.json          Fall 2026 course dump   ← current
  spring-26.json        Spring 2026
  fall-25.json          Fall 2025
  summer-25.json        Summer 2025
  spring-25.json        Spring 2025
  fall-24.json          Fall 2024
  summer-24.json        Summer 2024
backups/                Point-in-time snapshots (not loaded by the app)
js/
  config.js             Semester list, CDN URL, cache & pagination settings
  utils.js              Data normalisation, time helpers, localStorage cache
  dataService.js        Fetching, caching, and state management
  uiController.js       DOM wiring, rendering, event handling
  app.js                Entry point — initialises modules in order
docs/
  debug-extras.md       Developer debugging notes
.github/
  copilot-instructions.md   AI assistant context for this repo
```

---

## Adding a New Semester

1. Place the JSON dump in `data/` (e.g. `data/summer-26.json`).
2. Add an entry to `CONFIG.dataSources.semesters` in `js/config.js`.
3. Set `isCurrent: false` on the entry that was previously current.
4. No other changes required — semester buttons are generated dynamically.

Example:

```js
{
  id: 'summer26',
  name: 'Summer 2026',
  file: 'data/summer-26.json',
  year: '2026',
  dataFormat: 'spring25', // use 'old' for pre-Spring-2025 dumps
  isCurrent: true         // set false on the previously current entry
}
```

---

## Development

- All logic lives in `js/`. No framework, no bundler, no `npm`.
- `CONFIG.debug = true` enables verbose console output.
- To add an external resource, also whitelist it in the `Content-Security-Policy` meta tag in `index.html`.

---

## Automation

- `.github/workflows/update-active-semester.yml` runs once per day on a cron schedule and can also be triggered manually.
- `scripts/update-active-semester.mjs` fetches the CDN dump and refreshes the active archive in `data/`.
- A new semester is detected when any sentinel course section in `ENG101:01`, `MAT110:01`, or `CSE110:01` has a `midExamDate` shift greater than 10 days.
- When that happens, the workflow writes a new `data/<semester>.json`, promotes it to `isCurrent: true` in `js/config.js`, and commits the change automatically.
- The term progression is controlled by `TERM_SEQUENCE` in the workflow. It is currently set to `spring,fall,summer` to match the requested rule and can be changed without editing the script.

---

## Contributing

Pull requests and issues are welcome.

- Write clear commit messages.
- Follow the existing vanilla-JS style (no modules, no transpilation).
- Test on both desktop and a mobile viewport before opening a PR.

---

## License

[MIT](LICENSE)
