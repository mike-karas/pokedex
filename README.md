# Pokédex

A fast, feature-rich Pokédex built with React and Vite, powered by [PokéAPI](https://pokeapi.co). Browse all 1,025 Pokémon across nine generations with filtering, detailed stat views, type matchup analysis, and a Gameboy-inspired LCD overlay.

**Live site:** https://mike-karas.github.io/pokedex/

---

## Features

### Browsing & Filtering
- **Search** by name or Pokédex number
- **Type filter** — narrow to any of the 18 types
- **Habitat filter** — filter by in-game habitat (grassland, mountain, sea, urban, etc.)
- **Generation filter** — Gen I through Gen IX
- **Favorites** — heart any Pokémon and filter to favorites-only; persisted in localStorage
- **Reset** — clears all active filters in one click
- **Infinite scroll** — next page loads automatically as you approach the bottom of the grid

### Display Modes
- **Artwork / Sprite toggle** — switch between official artwork and pixel sprites
- **Shiny toggle** — view shiny variants across the entire grid, with a burst animation on enable
- **LCD overlay** — a Gameboy-inspired filter applied over the whole UI (on by default), toggled via the LCD checkbox. Three-layer effect: dot-matrix pixel grid, authentic DMG green tint, and animated grain

### Pokémon Detail Modal
Click any card to open a full detail view:

| Section | Details |
|---|---|
| **Header** | ID, species genus, name, sprite/artwork, type badges, favorite button |
| **Flavor text** | English Pokédex entry |
| **Info** | Height, weight, base experience, capture rate |
| **Base Stats** | All six stats with color-coded bar visualizations |
| **Abilities** | Standard and hidden abilities (hidden marked with ★) |
| **Evolution Chain** | Full linear chain with sprites; click any stage to jump to it |
| **Strong Against** | 3 random Pokémon this one has type advantage over, matched by comparable power level |

#### Strong Against
Uses a static Gen 1–9 type effectiveness chart to compute super-effective matchups. Candidates are sourced from PokéAPI, verified with real dual-type math, and filtered to within ±25% of the selected Pokémon's base stat total — so a 600-BST final form is matched against other high-BST Pokémon rather than base-stage weaklings. Each result shows the effectiveness multiplier (2× or 4×) and is clickable.

---

## Tech Stack

| | |
|---|---|
| Framework | React 19 |
| Build tool | Vite |
| Styling | CSS Modules + global CSS |
| Data | [PokéAPI v2](https://pokeapi.co/docs/v2) |
| Deployment | GitHub Pages via Actions |

No external UI libraries or state management dependencies — just React, Vite, and the browser.

---

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

The dev server runs at `http://localhost:5173/pokedex/` (or the next available port).

---

## Project Structure

```
src/
├── App.jsx                  # Root state, filtering logic, pagination
├── index.css                # Global styles, type badge colours, shiny/LCD animations
├── components/
│   ├── Header.jsx           # Search bar, all filter controls, display toggles
│   ├── Header.module.css
│   ├── PokemonGrid.jsx      # Infinite-scroll grid with IntersectionObserver
│   ├── PokemonGrid.module.css
│   ├── PokemonCard.jsx      # Individual card with lazy image load and favorite toggle
│   ├── PokemonCard.module.css
│   ├── Modal.jsx            # Full detail view: stats, abilities, evo chain, matchups
│   ├── Modal.module.css
│   ├── LCDOverlay.jsx       # Gameboy LCD filter overlay
│   └── LCDOverlay.module.css
└── utils/
    ├── api.js               # API base URL, fetchJson wrapper, generation ranges
    ├── typeChart.js         # Static Gen 1–9 type effectiveness chart + helpers
    ├── sprites.js           # Sprite URL selection (artwork vs sprite, shiny vs normal)
    ├── helpers.js           # ID padding, stat labels, stat bar colours
    └── burst.js             # Shiny toggle burst animation
```

---

## Data & API

All data comes from the public [PokéAPI v2](https://pokeapi.co) — no API key required. The app fetches:

- `/pokemon?limit=10000` — full Pokémon name/ID list on mount
- `/type?limit=100` and `/pokemon-habitat?limit=100` — filter option lists on mount
- `/type/{name}` and `/pokemon-habitat/{name}` — ID sets when a filter is selected
- `/pokemon/{id}` — card data as cards scroll into view (40 per page)
- `/pokemon/{id}` + `/pokemon-species/{id}` — full detail on modal open
- `/evolution-chain/{id}` — evolution chain per modal
- `/type/{name}` (cached) — matchup candidates when "Strong Against" loads

---

## Deployment

Pushes to `main` trigger a GitHub Actions workflow that builds and deploys to GitHub Pages automatically.
