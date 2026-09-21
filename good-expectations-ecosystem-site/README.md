# Good Expectations — website

A static, no-build marketing site for **Good Expectations**, built to Cloudflare
Pages. Black + white + electric lime design system, GE Signal mark, hero
particle network, interactive ecosystem map, and an AI-demo interface — all
honestly labeled as concept/demo where nothing real is connected yet.

## What's in here

```
.
├── index.html          Homepage — full section set per the build spec
├── about.html, ecosystem.html, data.html, ai.html, ventures.html,
│   brands.html, toolkit.html, media.html, labs.html, signals.html,
│   projects.html, contact.html, 404.html
├── css/styles.css       Design tokens + all styles
├── js/main.js           Nav, loader, hero particles, ecosystem map,
│                        engine builder, Ask GE modal, easter egg, form
├── images/              Favicons, OG image, GE Signal mark (SVG + PNG)
├── functions/api/contact.js   Cloudflare Pages Function for the contact form
├── _headers, _redirects  Cloudflare Pages config
├── robots.txt / sitemap.xml
├── site.webmanifest
├── wrangler.toml         Local `wrangler pages dev` config
└── package.json
```

No build step, no framework — every page links directly to `css/styles.css`
and `js/main.js`.

## No fake functionality — by design

Per the build spec, nothing on this site pretends to be live when it isn't:

- The **AI** interactions (Ask Good Expectations, the AI prompt buttons) are
  labeled **AI Demo** — no AI backend is connected.
- **Data**, **Opportunity Radar**, **Signals**, and the **Good Expectations OS**
  dashboard are labeled **Concept** / **Coming Soon** / demonstration UI — no
  real statistics or live data are shown anywhere.
- **Brands**, **Media**, and most **Ideas Lab** / **GE Labs** entries are
  labeled **Concept** or **Exploring** — nothing is presented as an
  established product, brand, or partnership that doesn't exist.
- The one thing shown as actually in progress is the **Good Expectations
  Toolkit**, labeled **Building**.

Replace these labels only once the underlying thing is real.

## Before going live

- **Domain & email placeholders**: `goodexpectations.com` and
  `hello@goodexpectations.com` appear in canonical URLs, Open Graph tags,
  `sitemap.xml`, `robots.txt`, and the contact form's fallback error message.
  Update them to your real domain/email.
- **Contact form**: works end-to-end immediately (validates + returns
  success), but won't email anyone until you add Resend (or another
  provider) — see below.

## Wiring up the contact form

1. Sign up at [resend.com](https://resend.com) and verify a sending domain.
2. In the Cloudflare Pages dashboard → your project → **Settings →
   Environment variables**, add:
   - `RESEND_API_KEY`
   - `CONTACT_TO_EMAIL`
   - `CONTACT_FROM_EMAIL`
3. Redeploy. No code changes needed.

## Deploying to Cloudflare Pages

This site uses a Cloudflare Pages Function (`functions/api/contact.js`), so
it needs **Git integration** — Cloudflare's direct drag-and-drop "Upload
assets" flow does not support Pages Functions.

### Git integration (recommended)

1. Push this folder's contents to a GitHub repository.
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect
   to Git**, select the repo.
3. Build settings: **Build command** empty, **Build output directory** `/`
   (or the subfolder these files are in, if nested).
4. Cloudflare builds and redeploys automatically on every push.

### Wrangler CLI (alternative)

```bash
npm install
npm run dev      # preview locally at http://localhost:8788
npm run deploy   # deploy directly to Cloudflare Pages
```

### Custom domain

Once you have a real domain, add it under the Pages project's **Custom
domains** tab, then replace the placeholder `goodexpectations.com` in
`robots.txt`, `sitemap.xml`, and each page's `canonical`/`og:url` tags.

## Accessibility & performance

- Respects `prefers-reduced-motion` throughout — particles, reveals, and the
  custom cursor all fall back to static/simplified states.
- Semantic HTML, visible focus states, keyboard-reachable nav and modal.
- Fonts load from Google Fonts (Inter + IBM Plex Mono) with `preconnect`.
- No large media — everything is inline SVG, lightweight PNG, or canvas.
