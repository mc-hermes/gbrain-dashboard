# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

An interactive, themeable knowledge-base dashboard — a single self-contained HTML file (`index.html`) that reads a JSON data file. **Open-source, zero dependencies, zero build step, bring your own data.**

- Upload your `gbrain-data.json` via the ⚙️ gear icon
- Or load from URL, or add `?source=https://...` to the page URL
- Everything stays in your browser's `localStorage` — nothing is sent to any server

**Live demo:** `mc-hermes.github.io/gbrain-dashboard`
**Remote:** `https://github.com/mc-hermes/gbrain-dashboard.git`

## Quick start

1. Clone the repo
2. Open `index.html` in a browser (or serve with `python3 -m http.server 8080`)
3. Click the ⚙️ gear icon and upload your own `gbrain-data.json`

That's it. No build step, no dependencies, no server required.

## Data schema (`gbrain-data.json`)

```
gbrain-data.json
├── updated_at: ISO timestamp
├── summary: { page_count, person_count, company_count, ... }
├── pages[]: array of page objects
│   ├── slug: string (unique identifier, e.g. "concepts/hermes-agent")
│   ├── title: string
│   ├── type: "concept" | "person" | "company" | "meeting" | "newsletter" | "article" | "bookmark" | "digest"
│   ├── body: string (markdown content)
│   ├── tags[]: string array (optional)
│   ├── links_out[]: array of { to: string, type: string, text: string } or plain slugs
│   ├── backlinks[]: array of { from: string, type: string, text: string } or plain slugs
│   └── embedding: float[] (optional — enables similarity search)
├── graph_links[]: edges for the force-directed graph
│   ├── source: string (slug)
│   ├── target: string (slug)
│   └── type: string
├── entities: { people: [slug...], companies: [slug...] }
├── doctor: { checks: [{name, status, category, message}...] }
└── artifacts[]: { slug, name, type, size, preview_url }
```

## Architecture

### `index.html`

The main interactive dashboard — a single self-contained HTML file (~2900 lines). No framework, vanilla JS throughout.

**Data flow:** `loadData()` fetches `gbrain-data.json` at page load → `renderAll()` populates global `DATA` → lazy render functions fire per-view as the user navigates.

**View system:** `showView(name)` swaps `.view-panel` visibility. Views render lazily (guarded by render state flags). Views: `today`, `graph`, `browse`, `entities`, `health`, `artifacts`.

**Graph:** Force-directed physics on a `<canvas>`. `initGraph()` builds node/edge arrays from `DATA.pages` and `DATA.graph_links`. `runPhysics()` runs spring/repulsion simulation. Supports pan/zoom/drag, touch, fullscreen.

**Themes:** 6 CSS variable sets toggled by `applyTheme(name)` — `library` (default, warm academic with Playfair Display serif headings + Crimson Text body), `dark` (Tokyo Night), `light`, `catppuccin-mocha`, `catppuccin-latte`, `tokyo-night`. Persisted in `localStorage('gbrain-theme')`.

**Modals:** `openModal(title, subtitle, bodyHtml)` is the generic modal. `openPageModal(slug)` and `openCheckModal(name)` are the two callers.

## Deploy to GitHub Pages

```bash
git add . && git commit -m "message" && git push
```

GitHub Pages serves `main` directly. Changes are live within ~60 seconds of push.

## How to contribute

See `CONTRIBUTING.md`.
