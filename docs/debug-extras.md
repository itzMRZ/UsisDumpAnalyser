# Debug / Test HTML Artifacts

The following standalone HTML pages exist for internal debugging. They are not required for normal usage (opening `index.html`). Keeping a short catalog here so they can be intentionally retained or pruned.

| File | Purpose | Keep? |
|------|---------|-------|
| `complete-debug.html` | Runs a sequence of smoke tests (config, load, normalization, filter, pagination, UI render) for Summer 25. | Optional (dev only) |
| `debug-state.html` | Interactive panel to inspect `DataService` internal state & pagination after loading a semester. | Optional (dev only) |
| `debug-summer.html` | Older ad‑hoc summer semester debug. | Candidate for removal |
| `final-debug.html` | Earlier combined debug page (likely superseded by `complete-debug.html`). | Candidate for removal |
| `test-summer25.html` | Simple loader / visual check for Summer 25. | Candidate for removal |

Removed in cleanup: `test-cdn.html` (CDN vs local harness) — CDN flow now validated & covered by core app plus caching logic.

## Recommendation

If repository footprint matters, keep only `complete-debug.html` and delete the others. They provide overlapping value.

## Note

No production code depends on these pages; they are safe to delete at any time.
