# gbrain-dashboard

A beautiful, interactive dashboard for your [gbrain](https://github.com/garrytan/gbrain) knowledge base.

**One HTML file. Zero dependencies. No build step. No server.**

Connect it directly to your running gbrain, upload a JSON file, or load from a URL — just open in any browser.

## How to use

### If you run gbrain MCP

The dashboard connects directly to your running gbrain for live access to your knowledge base. You'll need two things: a **URL** (where your gbrain lives) and an **access token** (like a password).

**Getting your access token depends on where gbrain is running:**

- **🖥️ On your own computer (local):** When you run `gbrain serve --http`, it prints a bootstrap token in the terminal. Copy it — that's your access token. Your URL is `http://localhost:3131/mcp` (unless you changed the port with `--port`).
- **☁️ On a server (VPS / remote):** Ask whoever runs the server for the MCP URL and an access token. They'll generate one from the gbrain admin panel at `https://<server-address>/admin`.

> 💡 **Are you the server admin?** Log into your gbrain's admin panel at `https://<your-server>/admin`, register an OAuth client, and generate a `read`-scoped access token. Send the MCP URL and token to your user.

**Connecting the dashboard:**

1. Start gbrain (if local): `gbrain serve --http`
2. Open `index.html` in your browser
3. Click the data badge in the top-right corner (look for 📄 or ⚡, next to the gear icon)
4. Enter your MCP URL and access token
5. Click **Connect to gbrain**

Your dashboard loads live from your brain. The connection is saved so it works again next time you open the page — no reconnecting needed.

### If you have a gbrain-data.json file

1. Open `index.html` in your browser
2. Click ⚙️ → drag your JSON file onto the upload area
3. Or paste a URL to your JSON file

Your data stays in your browser. Nothing is sent to any server.

### If you don't have gbrain yet

Open `index.html` and you'll see an empty dashboard ready for your data. Once you set up gbrain and have pages, return and connect it.

## What you get

- **Today** — A running feed of your latest pages, with links, tags, and source filtering
- **Graph** — An interactive force-directed graph of how your ideas, people, and companies connect
- **Browse** — Search through every page, see people and companies, check brain health, view files
- **Ask** — Type a question and get answers from your knowledge base (uses gbrain's query engine when connected to MCP)
- **6 themes** — Pick from Library (default, warm academic), Dark, Light, Catppuccin Mocha, Catppuccin Latte, or Tokyo Night

## Data stays with you

- When you upload a file, it's saved in your browser's local storage
- When you connect to gbrain MCP, data is fetched live each time you refresh
- Your access token is saved in your browser — it never touches any server
- Click "Reset everything" in the gear menu to clear everything

## JSON format

If you're building your own `gbrain-data.json`, it follows this structure:

```json
{
  "updated_at": "timestamp",
  "summary": { "page_count": 42, "person_count": 5, ... },
  "pages": [
    {
      "slug": "people/alice",
      "title": "Alice",
      "type": "person",
      "body": "Alice is a software engineer...",
      "tags": ["team", "engineering"],
      "links_out": [
        { "to": "companies/acme", "type": "wikilink", "text": "Acme Corp" }
      ]
    }
  ],
  "graph_links": [
    { "source": "people/alice", "target": "companies/acme", "type": "link" }
  ],
  "entities": { "people": ["people/alice"], "companies": ["companies/acme"] }
}
```

## License

MIT — see [LICENSE](LICENSE).
