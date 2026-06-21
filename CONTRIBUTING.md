# Contributing

The dashboard is built from modular source files in `src/`. Edit those, not the built `index.html`.

## Source structure

```
src/
├── index.html         # HTML skeleton with INJECT markers
├── css/               # Stylesheets (5 files)
│   ├── tokens.css     # Design tokens and theme variables
│   ├── base.css       # Base, typography, grid
│   ├── layout.css     # Header, nav, sections, tabs
│   ├── components.css # Table, feed, graph, modals, chat, etc.
│   └── mobile.css     # Responsive/mobile styles
├── js/                # JavaScript (15 files)
│   ├── core.js        # Globals, view system, stats
│   ├── mcp.js         # MCP client connectivity
│   ├── data.js        # Data loading and storage
│   ├── feed.js        # Today feed and digest
│   ├── graph.js       # Force-directed link graph
│   ├── browse.js      # Pages, entities, health, artifacts
│   ├── modal.js       # Modal system
│   ├── crud.js        # Edit, delete, tags, bulk operations
│   ├── crm.js         # LinkedIn CRM tier and health badges
│   ├── theme.js       # Theme switching and settings
│   ├── docs.js        # Help overlay and keyboard shortcuts
│   ├── chat.js        # Chat bubble and mobile ask
│   ├── live-query.js  # Live query search
│   ├── write.js       # Write composer and autocomplete
│   └── logs.js        # Activity logs view
└── build.sh           # Concatenation script
```

## Building

```bash
./build.sh
```

This concatenates all source files into the single `index.html` that users consume. No dependencies required — just bash and cat.

The built `index.html` is committed to the repo so users can clone and open it directly with zero build step.
