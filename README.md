# Connect Dump Analyser V1.2

A modern, mobile-friendly web portal for exploring and analyzing course dumps from USIS. Designed for students and faculty to quickly view, search, and compare course offerings across semesters.

## Features

- **Live Data**: Always fetches the latest semester data from CDN (with fallback to local file).
- **Multi-Semester Support**: Instantly switch between Summer 2025, Spring 2025, Fall 2024, and Summer 2024.
- **Search**: Real-time, persistent search by course code, faculty, section, or schedule.
- **Sorting**: Click any table header to sort by that column (ascending/descending).
- **Responsive UI**: Fully mobile-friendly with horizontal table scrolling and compact design.
- **Faculty Match**: Shows potential faculty for TBA sections based on previous semesters.
- **Pagination**: Fast navigation for large course lists.
- **Status Indicators**: Clear data source status (Live, Local, Offline).
- **Dark Purple Highlight**: Current semester button is highlighted in purple.

## Usage

1. **Open `index.html` in your browser** (no server required).
2. Use the semester buttons to switch between available dumps.
3. Use the search bar to filter courses. The search persists when switching semesters.
4. Click any table header to sort by that column. Click again to reverse the order.
5. Use the pagination arrows to navigate between pages.
6. On mobile, scroll the table horizontally to see all columns.

## File Structure

```
fall-24.json         # Fall 2024 course dump
spring-25.json       # Spring 2025 course dump
summer-24.json       # Summer 2024 course dump
summer-25.json       # Summer 2025 course dump
favicon.ico          # Site icon
index.html           # Main web app
styles.css           # All styles (responsive)
README.md            # This file
js/
  app.js             # App entry point
  config.js          # Configuration (semesters, CDN, etc.)
  dataService.js     # Data loading, caching, sorting
  uiController.js    # UI logic, event handling
  utils.js           # Utility functions
```

## Development

- **Edit `js/` files** for logic/UI changes.
- **Edit `styles.css`** for design tweaks.
- **Add new semesters** by updating `config.js` and adding the JSON file.
- **No build step required** – just open `index.html`.

## Contribution

Pull requests and suggestions are welcome! Please:
- Use clear commit messages
- Follow the existing code style
- Test on both desktop and mobile

## License

MIT License
