# Prompt Era

Premium mobile-first AI prompt discovery prototype.

## Run
Open `index.html` in a browser or deploy the folder to Netlify, GitHub Pages, Cloudflare Pages, or another static host.

## Structure
- `index.html` — main shell, SEO metadata, global ad script
- `styles.css` — responsive premium dark UI
- `app.js` — demo posts, search, filtering, modal post pages, unlock timer, copy/share

## Ad configuration
The direct link is centralized in `app.js` as `ADSTERRA_DIRECT_LINK`.

The 10-second unlock is client-side elapsed-time logic only. It does not claim verification by the advertising network. For a production secret-prompt system, store prompt data server-side and release it only after server-side verification.

## Blogger adaptation
The UI/data layer is intentionally dependency-light. The `posts` array can later be replaced with Blogger feed/API data or individual Blogger post templates.
