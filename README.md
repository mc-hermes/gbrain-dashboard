# gbrain-dashboard

A beautiful, interactive dashboard for your [gbrain](https://github.com/garrytan/gbrain) knowledge base. Browse, search, edit, and visualize everything your company knows — all from one file.

**One HTML file. Zero dependencies. No build step. No server.**

Open it in any browser. Connect it to your running gbrain, upload a file, or load from a URL.

---

## How to use

There are three ways to get your data into the dashboard. Pick the one that matches your setup:

### Option 1: Connect to a running gbrain (recommended)

If you have gbrain running on your computer or a server, the dashboard can connect directly to it. This gives you **live access** — changes you make in the dashboard save straight back to your brain.

**What you need:** the web address (URL) where your gbrain lives.

**Two ways to connect:**

**Connecting the dashboard:**

| Method | When to use |
|---|---|
| **Auto-connect (no password)** | Your gbrain was started with `--enable-dcr`. Just enter the URL and click Connect. |
| **With an access token** | You have a token from the person who runs the server. Enter both the URL and token. |

#### 📱 Accessing from your phone or outside your network

If your gbrain runs on a remote server, your phone's browser can't reach it directly — `localhost` and private IPs won't work. **[Tailscale](https://tailscale.com/download)** creates a private network (a "tailnet") that connects all your devices securely.

**Setup (one time):**

1. **Install Tailscale on your gbrain server:**
   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   ```

2. **Install Tailscale on your phone** from the App Store or Google Play, sign in with the same account.

3. **Find your server's Tailscale address.** On the server, run `tailscale status` — your server will have an address like `vm-0-8-ubuntu.tail25fd51.ts.net`.

4. **Construct your MCP URL:** `http://<tailscale-hostname>:<port>` (e.g., `http://vm-0-8-ubuntu.tail25fd51.ts.net:8787`)

> 🔒 **Security note:** Tailscale traffic is end-to-end encrypted via WireGuard. Your gbrain data never touches the public internet.

**Step by step:**

1. Open `index.html` in your browser
2. Click the `📄 default` badge in the top-right corner (next to the ⚙️ gear)
3. Enter your gbrain URL (e.g., `http://localhost:3131` or `https://your-server.com`)
4. If you have a token, paste it. If not, leave it empty — the dashboard will try to connect automatically
5. Click **Connect to gbrain**

That's it. Your dashboard now reads from and writes to your brain. Edit a page, add a tag, delete something — it all syncs back. Close the browser and come back — your connection is remembered.

> **💡 Running gbrain locally?** Start it with `gbrain serve --http --enable-dcr`. The auto-connect will work without any token.
>
> **💡 On a server?** The server admin can give you the URL. Auto-connect works if they enabled DCR; otherwise they'll give you an access token too.

### Option 2: Upload a JSON file

If you have a `gbrain-data.json` file exported from gbrain:

1. Open `index.html` in your browser
2. Click the ⚙️ gear icon → drag your file onto the upload area
3. Or paste a URL to where your JSON file lives

**Note:** Edits made this way are saved in your browser only. They won't sync back to gbrain. Upload again to refresh with new data.

### Option 3: No data yet

Open `index.html` and you'll see an empty dashboard ready for your data. Set up gbrain first, then come back and connect it.

---

## What you get

- **Today** — Your latest pages in a scrollable feed, with links, tags, and filters by type
- **Graph** — An interactive map of how your people, companies, and ideas connect. Drag, zoom, click
- **Library** — Browse every page, see people and companies with contact details, check brain health
- **Ask** — Type a question and get answers from your knowledge base
- **Edit and manage** — Click any page to edit it. Add or remove tags. Delete pages. Bulk-select to tag or delete many at once. All changes save back to gbrain when connected
- **6 themes** — Library (warm, book-like), Dark, Light, Catppuccin Mocha, Catppuccin Latte, Tokyo Night

---

## Your data stays with you

- **When connected to gbrain:** Data flows directly between your browser and your gbrain server. Nothing passes through us
- **When using a file:** Your file is stored in your browser's local storage. It never leaves your computer
- Your connection details (URL, token) live in your browser only
- Click "Reset everything" in the gear menu to wipe all stored data

---

## JSON format (for developers)

If you're generating your own `gbrain-data.json`:

```json
{
  "updated_at": "2026-06-21T00:00:00Z",
  "summary": {
    "page_count": 42,
    "person_count": 5,
    "company_count": 3,
    "meeting_count": 4,
    "total_links": 28,
    "score": "85",
    "score_label": "/100"
  },
  "pages": [
    {
      "slug": "people/alice",
      "title": "Alice Chen",
      "type": "person",
      "body": "Alice is a software engineer at Acme Corp...",
      "tags": ["engineering", "team-lead"],
      "links_out": [
        { "to": "companies/acme", "type": "wikilink", "text": "Acme Corp" }
      ]
    }
  ],
  "graph_links": [
    { "source": "people/alice", "target": "companies/acme", "type": "link" }
  ],
  "entities": {
    "people": ["people/alice"],
    "companies": ["companies/acme"]
  },
  "doctor": { "checks": [] },
  "artifacts": []
}
```

---

## Keyboard shortcuts

| Key | Action |
|---|---|
| `?` | Open help and documentation |
| `Esc` | Close any panel or modal |
| `Ctrl+K` | Jump to search |

---

## License

MIT — see [LICENSE](LICENSE).
