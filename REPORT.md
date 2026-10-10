# Rebuild report

For Chongbo. This explains what changed between the original platform and this rebuild, why, what was checked, and what is left for you to decide. Everything here was done in one overnight session, and every claim below was checked by running the code.

- **Original:** [CBcbbb/Helen-Hamlyn-Centre-Platform](https://github.com/CBcbbb/Helen-Hamlyn-Centre-Platform). Create React App, JavaScript, Tailwind 3, D3 7. Not modified.
- **Rebuild:** this repository. Next.js 16 (App Router), TypeScript (strict), Tailwind 4, d3-force and d3-zoom. Not deployed.

## Summary

| Goal | Status |
|---|---|
| 1. Parity migration to Next.js and TypeScript | Done |
| 2. SEO and static generation | Done |
| 3. New entry point | Done |
| 4. Visual refresh | Done |
| 5. Accessibility, verified | Done, with the limits listed below |
| 6. Tests and build | Done: lint, typecheck, 49 unit tests, 40 browser tests, build all pass |
| 7. Admin panel | Done, with one hosting limit you need to decide about |

## 1. What changed and why

### Before and after

| | Before | After |
|---|---|---|
| Framework | Create React App (deprecated), JavaScript | Next.js 16 App Router, TypeScript strict |
| Rendering | Empty HTML shell; everything drawn in the browser after two fetches | Every page generated as HTML at build time |
| URLs | One URL, `/`. No way to link to a project | 48 entity pages, 4 index pages, map, table, about |
| Homepage | The full force-directed graph of all 48 entries | One project explained, then a step outwards at a time |
| Data | CSV to JSON for nodes; links parsed from a second CSV in the browser with `split(',')` | One build step merges nodes and links, typed, with a wider quality report |
| Graph | Free force layout (a "hairball"), 28px bold labels, not keyboard-operable | Four ordered columns, readable labels, every entry reachable by keyboard |
| Admin password | Hard-coded in the client bundle, also printed in ADMIN_GUIDE.md | Environment variable only, checked on the server, signed session cookie |
| Tests | Jest component tests | Vitest unit and component tests, plus Playwright and axe in a real browser |

### The parity migration

Everything the public side of the old app did still works: graph and table views, `Cmd/Ctrl+E` to switch, `Cmd/Ctrl+K` for search, type filters, the details panel (resizable by drag or `Cmd/Ctrl + ← →`), `?` for keyboard help, focus handling in dialogs, live announcements, skip link, and the four sidebar texts (Introduction, How to use it, Accessibility, Translation help), now on `/about`.

Two things were changed on purpose:

- **`Cmd/Ctrl+B` (toggle sidebar) is gone**, because the sidebar is gone. Its contents moved to the site navigation and `/about`.
- **The Reset button is gone.** It reloaded the page. Clearing search is now a button in the search field and the filters are visible checkboxes, so there is nothing hidden to reset.

The conversion script is now TypeScript (`src/lib/convert.ts`, run by `scripts/convert.ts`) and keeps the original behaviour: the same header mapping, `a|b` cells becoming lists, rows without an ID or name skipped and reported, duplicate IDs stopping the build. It now also merges the links (which the browser used to parse), and the report adds:

- placeholder cells such as `/` treated as empty (there is one: Critical User Forums' templates);
- links that point to missing IDs (there is one: `PR012 → M005` in LINKS.csv, but the Autism at Kingwood project's ID in PROJECTS.csv is `PD012`, which looks like a typo);
- links whose declared type disagrees with the entity, duplicate links, entries with no links, and slug collisions (none today);
- the real file line for each problem, even when cells contain line breaks.

`LINKS.csv` moved from `public/data/` to `data/` to sit with the other source files. The original CSVs were copied unchanged.

### The entry point: overview first, turned around

You found while teaching that people learning from past research start from one real example, not from the whole network. The original homepage did the opposite: it opened on all 48 entries at once, which is Shneiderman's "overview first" mantra applied to people who have no reason yet to care about the overview.

The new homepage walks outwards from one project, and a thin rail down the left marks how far out you are:

1. **Start here.** One project, explained on its own: its description, legacy, the partners named in its record, and a link to its archive.
2. **One step out.** The four methods it used and the three people involved, each with a line from their own record.
3. **Two steps out.** Other projects that share those people or methods (with what they share), and the partner organisations around those people.
4. **Browse.** Every project and every method, with links to the people and partners.
5. **Everything.** Only now, the full network as a map or a table, on its own route (`/explore`).

The featured project is **Design Bugs Out** (`PR004`). It was chosen from the data because it is a concrete, well-documented example with a spread of connections: three people, four methods, a stated legacy, a public archive link and a named list of partners. The Research Associate Programme has more connections (13), but it is a programme rather than one project, so it is a weaker first example. Changing `FEATURED_PROJECT_ID` in `src/lib/data.ts` is all it takes to feature another.

### The SEO fix

The old site sent search engines and link previews an empty `<div id="root">`. All content arrived later via JavaScript and `fetch`, under a single URL, so no project, method or person could be found, linked to or shared.

Now:

- Each of the 48 entries has its own statically generated page with real HTML: an `<h1>`, the recorded fields under semantic headings, and its connections as ordinary links. Following links from any page reaches every other page.
- Each page has its own `<title>`, meta description (from its own text, or from its connections when it has none), canonical URL, Open Graph and Twitter tags, and a generated Open Graph image (type shape, name and site name).
- `sitemap.xml` lists all 56 public URLs. `robots.txt` points to it and keeps `/admin` out of the index.
- Pages work with JavaScript switched off. The map is drawn on the server too, and each entry in it is a plain link to its page. Search and filters are hidden without JavaScript rather than shown and broken.

### The visual refresh

The direction is editorial and quiet so the research is the subject, not the interface.

- **Type:** Archivo (a grotesque, set slightly condensed for headings) and Source Serif 4 for reading text. Both come from npm, so there are no font requests to Google.
- **Colour:** white paper, near-black ink and one muted grey. The brand colours are kept exactly but used as accents: a small shape and label for each type, the filter checkboxes and the map marks. Large coloured buttons and tinted cards are gone.
- **Shapes as well as colour:** people circles, partners squares, projects diamonds, methods triangles, everywhere, including the map. This is both an accessibility fix and a quiet visual system.
- **The map:** the free force layout became four ordered columns (partners, people, projects, methods), following the shape of the data. d3-force still arranges entries within each column to reduce crossing lines, and a minimum gap keeps labels from overlapping. The layout is deterministic, so it is identical on every visit and between server and browser. Hovering or focusing an entry shows only its connections, and search dims non-matches.
- **Motion:** only in response to actions (panel opening, dialog appearing) and switched off for people who ask for reduced motion.
- **Narrow screens:** works down to 320px with no sideways scrolling. The navigation scrolls horizontally rather than wrapping, the map opens zoomed to readable labels, the table is suggested as the easier view, and details open full-screen.

Screenshots are in [`docs/screenshots/`](docs/screenshots/) at 1440px and 390px: `home-*.png`, `project-*.png`, `explore-*.png`.

## 2. Accessibility: checks and results

### What was built

- Landmarks on every page (header, main navigation, main, footer), a skip link, one `<h1>` per page, headings in order, breadcrumbs with `aria-current`.
- A visible focus indicator everywhere: an accent outline with a white halo, and a ring around the focused entry in the map.
- **Map by keyboard.** The map is one stop in the tab order (a roving tabindex). The arrow keys move to the nearest entry in that direction, `Home`/`End` jump to the first and last, `Enter`/`Space` open the details, and the view pans to keep the focused entry visible. Each entry is announced as, for example, "Chris McGinley, person, 10 connections". Zoom buttons have names.
- **Table as the equivalent.** `/explore/table` is offered next to the map at all times and in the map's instructions. It is one real table per entity type, with a caption, column headers and row headers, and the same search and filters.
- **Focus management.** Dialogs use the native `<dialog>` element with `showModal()`, so the browser makes the rest of the page inert and handles Escape. Focus goes into each dialog and panel when it opens and back to what opened it when it closes. On wide screens the details panel is non-modal (`complementary`) so the map stays usable; on narrow screens it is a modal dialog.
- **Announcements.** Search result counts (debounced so screen readers aren't flooded while typing), filter changes and view switches are announced through a polite live region. The count is also shown on screen.
- **Reduced motion, forced colours and high-contrast preferences** are respected.

### Automated checks (Playwright + @axe-core/playwright)

axe was run with the WCAG 2.0, 2.1 and 2.2 A/AA rule sets plus best practices, in Chromium 141, at 1440×900 and 390×844:

| Page | 1440px | 390px |
|---|---|---|
| `/` | 0 violations | 0 violations |
| `/projects` | 0 | 0 |
| `/projects/design-bugs-out` | 0 | 0 |
| `/methods/critical-user-forums` | 0 | 0 |
| `/people/hua-dong` | 0 | 0 |
| `/partners/royal-college-of-art` | 0 | 0 |
| `/explore` | 0 | 0 |
| `/explore/table` | 0 | 0 |
| `/about` | 0 | 0 |
| Details panel open | 0 | 0 |
| Keyboard shortcuts dialog open | 0 | (keyboard only, not run) |
| `/admin` sign-in, list and edit | 0 (run separately) | not run |

The same suite also checks, in a real browser: pages render their content with JavaScript off; the sitemap and robots; a 404 for unknown entries; the skip link moves focus; arrow keys, Enter and Escape in the map with focus returning to the entry; `Cmd/Ctrl+K`, search announcements and `Cmd/Ctrl+E`; filter announcements; the mobile details dialog returning focus; and no horizontal scroll at 360px. 320px was checked by script too.

axe found nothing to fix by the time it first ran, because the contrast check below had already caught the one real colour problem. The tests caught other issues along the way, which were fixed: the details panel's focus return, the CSV line numbers in the report, and the admin writing multi-line cells without quotes.

### Contrast

`npm run contrast` (`scripts/contrast.ts`) reads the values from `globals.css` and checks every text and mark pairing the site uses. It found one failure on its first run: the outline of an unchecked filter checkbox was 1.67:1, too faint to see the control. A new `--color-control` token (#8A8796, 3.51:1) fixed it.

| Foreground | Background | Used for | Ratio | Needs | Result |
|---|---|---|---|---|---|
| `--color-ink` #22212A | `--color-paper` #FFFFFF | Body text, headings | 15.92:1 | 4.5:1 (text) | Pass |
| `--color-ink` #22212A | `--color-surface` #F6F6F8 | Text on footer and search field | 14.75:1 | 4.5:1 (text) | Pass |
| `--color-ink-muted` #5B5966 | `--color-paper` #FFFFFF | Secondary text, metadata, nav | 6.85:1 | 4.5:1 (text) | Pass |
| `--color-ink-muted` #5B5966 | `--color-surface` #F6F6F8 | Secondary text on footer, placeholder | 6.35:1 | 4.5:1 (text) | Pass |
| `--color-paper` #FFFFFF | `--color-ink` #22212A | Primary button, skip link | 15.92:1 | 4.5:1 (text) | Pass |
| `--color-accent-text` #006D69 | `--color-paper` #FFFFFF | Body links | 6.19:1 | 4.5:1 (text) | Pass |
| `--color-accent-text` #006D69 | `--color-surface` #F6F6F8 | Links in footer | 5.74:1 | 4.5:1 (text) | Pass |
| `--color-focus-ring` #00837F | `--color-paper` #FFFFFF | Focus outline | 4.61:1 | 3:1 (non-text) | Pass |
| `--color-focus-ring` #00837F | `--color-surface` #F6F6F8 | Focus outline on surface | 4.27:1 | 3:1 (non-text) | Pass |
| `--color-control` #8A8796 | `--color-paper` #FFFFFF | Control borders: buttons, checkboxes, search field | 3.51:1 | 3:1 (non-text) | Pass |
| `--color-control` #8A8796 | `--color-surface` #F6F6F8 | Search field border on its fill | 3.25:1 | 3:1 (non-text) | Pass |
| `--color-people-text` #5F5BA3 | `--color-paper` #FFFFFF | People label and links | 5.98:1 | 4.5:1 (text) | Pass |
| `--color-partners-text` #B01E68 | `--color-paper` #FFFFFF | Partners label | 6.50:1 | 4.5:1 (text) | Pass |
| `--color-projects-text` #A8470F | `--color-paper` #FFFFFF | Projects label | 5.88:1 | 4.5:1 (text) | Pass |
| `--color-methods-text` #107052 | `--color-paper` #FFFFFF | Methods label and links | 6.07:1 | 4.5:1 (text) | Pass |
| `--color-people-text` #5F5BA3 | `--color-people-tint` #F4F3F8 | People text on its tint | 5.42:1 | 4.5:1 (text) | Pass |
| `--color-partners-text` #B01E68 | `--color-partners-tint` #FFF6FB | Partners text on its tint | 6.14:1 | 4.5:1 (text) | Pass |
| `--color-projects-text` #A8470F | `--color-projects-tint` #FFFAF3 | Projects text on its tint | 5.66:1 | 4.5:1 (text) | Pass |
| `--color-methods-text` #107052 | `--color-methods-tint` #EEF9F6 | Methods text on its tint | 5.64:1 | 4.5:1 (text) | Pass |
| `--color-people` #5F5BA3 | `--color-paper` #FFFFFF | People shape | 5.98:1 | 3:1 (non-text) | Pass |
| `--color-partners` #DC2680 | `--color-paper` #FFFFFF | Partners shape | 4.53:1 | 3:1 (non-text) | Pass |
| `--color-projects` #EB631A | `--color-paper` #FFFFFF | Projects shape | 3.32:1 | 3:1 (non-text) | Pass |
| `--color-methods` #148D66 | `--color-paper` #FFFFFF | Methods shape | 4.17:1 | 3:1 (non-text) | Pass |
| `--color-paper` #FFFFFF | `--color-people` #5F5BA3 | Tick on People checkbox | 5.98:1 | 3:1 (non-text) | Pass |
| `--color-paper` #FFFFFF | `--color-partners` #DC2680 | Tick on Partners checkbox | 4.53:1 | 3:1 (non-text) | Pass |
| `--color-paper` #FFFFFF | `--color-projects` #EB631A | Tick on Projects checkbox | 3.32:1 | 3:1 (non-text) | Pass |
| `--color-paper` #FFFFFF | `--color-methods` #148D66 | Tick on Methods checkbox | 4.17:1 | 3:1 (non-text) | Pass |

Brand colours that are **not** used for text because they fail 4.5:1: projects orange on white (3.32:1), methods green on white (4.17:1), partners pink on its tint (4.28:1), accent teal on the grey surface (4.27:1). That is why the `*-text` variants exist. Three of them are your existing hover colours; only the projects one (#A8470F) is new.

### What was not checked

- **No screen reader testing.** VoiceOver, NVDA and JAWS couldn't be run here. The ARIA is standard and tested in jsdom and Chromium, but it needs a real pass, especially the map's roving tabindex in VoiceOver.
- **Only Chromium.** Firefox and Safari were not available. Native `<dialog>` and `:has()` need Safari 15.4+ or Firefox 121+.
- **No testing with disabled people**, and no formal audit. The About page says this plainly and does not claim conformance.
- **Zoom to 400%** was not checked separately (320px reflow was, which is the equivalent width).
- **Lighthouse** wasn't run. It isn't installed, and axe covers most of its accessibility rules.

## 3. Tests and build

All of these pass:

| Check | Result |
|---|---|
| `npm run lint` | 0 problems |
| `npm run typecheck` | 0 errors (strict) |
| `npm test` | 49 tests in 5 files |
| `npm run test:e2e` | 40 passed, 6 skipped (keyboard-only tests skipped at mobile width) |
| `npm run contrast` | 27 of 27 pairings pass |
| `npm run build` | 110 static outputs (pages, sitemap, robots, OG images) |

The original Jest tests were rewritten rather than ported line by line, keeping what they protected: dialog semantics and Escape, focus return, backdrop clicks, the focus trap (now the browser's), real checkboxes for filters, accessible names on zoom buttons, non-modal versus modal details by screen width, the table structure, and announcing zero results rather than staying silent. New tests cover the conversion and report, the layout (deterministic, no overlapping labels), arrow-key navigation, the dataset's integrity, the admin's auth and its CSV round trip.

## 4. Admin panel

Ported, with the security fixed.

- The password is read from `ADMIN_PASSWORD` on the server. Nothing is hard-coded. With the variable unset, the admin is off and says so.
- Signing in sets an httpOnly, SameSite=Strict cookie with an expiry signed using `ADMIN_SESSION_SECRET`. Every admin page and every save, add and delete action checks it on the server. A forged cookie is rejected (tested).
- Edits go to the CSVs in `data/`, the single source of truth, then the JSON and report are rebuilt. The original admin overwrote the generated JSON instead, so the next `data:build` threw the edits away.
- A save only changes the cells you edited. Untouched files and cells stay byte-identical, which keeps git diffs readable. This is covered by a test that rewrites all five CSVs and compares them byte for byte.
- Connections are not editable in the admin (they weren't before either); edit `data/LINKS.csv`.

Tested end to end on a throwaway copy of the repo: wrong password rejected, sign in, edit a field, add an entry, delete it, sign out, forged cookie. axe found 0 violations on the sign-in, list and edit pages.

## 5. What is not done

- **Saving from the admin on Vercel.** Vercel's file system is read-only at runtime, so the admin there can show data but not save it. The original had the same problem: its serverless save wrote to a file that is thrown away. See decision 2.
- **Editing connections in the admin.**
- **Screen reader, Firefox and Safari testing** (see above).
- **Deployment.** Nothing was deployed, as asked. `NEXT_PUBLIC_SITE_URL` must be set for correct canonical and Open Graph URLs on any domain other than the Vercel production one.
- **The UKRI and EU co-funded logos** in the original `public/` folder were not used anywhere in the original app either, so they were left out rather than guessing where funder credits belong.
- **Data typos were not corrected**, since the content belongs to the Centre: for example "PearsoLloyd", "scaerios", "persons", "Autism at Kingood", and the `PR012`/`PD012` mismatch. The report flags the link; the rest are for the Centre to fix in the spreadsheet.
- **Dark mode.** Not asked for, and the brand palette was designed for white.

## 6. Decisions for you

1. **The featured project.** Design Bugs Out was chosen for the reasons above. You know which project works best as a first example when you teach. It is one constant to change.
2. **How the admin should save in production.** Options: (a) keep editing locally and deploy by pushing to git, which needs nothing new; (b) have the admin commit the CSV changes to GitHub through its API, so Vercel redeploys automatically, which is a small, well-understood addition; (c) move the data to a hosted store. Suggestion: (a) now and (b) if non-technical colleagues need to edit.
3. **The `PR012`/`PD012` ID.** One link to Workshops is dropped because the IDs don't match. Fixing the ID in PROJECTS.csv or the link in LINKS.csv restores it.
4. **Whether the old `/admin` password should be rotated.** It is in the public original repo, both in the client code and in ADMIN_GUIDE.md, so anyone can read it.
5. **Domain and launch.** Whether this replaces the live site, sits beside it, or stays a portfolio piece. The URLs are new, so if it replaces the original, nothing old needs redirecting except `/`.
6. **Removing `Cmd/Ctrl+B` and Reset.** Both were deliberate (see above); say if the Centre relied on them.

## 7. Run it locally

```bash
git clone https://github.com/CBcbbb/helen-hamlyn-centre-for-design-data-platform.git
cd helen-hamlyn-centre-for-design-data-platform
npm install

npm run dev                  # development, http://localhost:3000

npm run build && npm start   # production build, http://localhost:3000

npm run lint
npm run typecheck
npm test
npm run contrast
npm run data:build           # after editing data/*.csv

npx playwright install chromium   # once
npm run build && npm run test:e2e

# Admin (optional)
cp .env.example .env.local   # then set ADMIN_PASSWORD and ADMIN_SESSION_SECRET
npm run dev                  # sign in at http://localhost:3000/admin
```

## 8. How to talk about this rebuild

Five honest points for an interview:

1. **"I turned 'overview first' around because of what I saw while teaching."** Students learning from past research start from one real example, so the homepage now explains one project and walks outwards a step at a time; the full graph is still there, just at the end. It's a design decision grounded in observation, and it changed the information architecture, not just the styling.
2. **"I fixed an invisible problem: the site had no URLs."** Everything lived in client-side state under `/`, so no project could be found, linked to or shared. Static generation gave each of the 48 entries a real page, and the same change made the site work without JavaScript and made it faster.
3. **"I made the graph keyboard-operable instead of only pointing people to the table."** Ordering the layout into columns gave it a reading order, which made arrow-key navigation meaningful. The table is still offered as an equal alternative, and both share search and filters.
4. **"I used tooling to keep myself honest."** A contrast script that reads the real CSS caught a 1.67:1 checkbox border, and axe runs at desktop and mobile widths in the browser tests. The limits are clear too: no screen reader or Safari testing yet.
5. **"I treated the data as the source of truth."** The original admin overwrote generated JSON, so edits were lost on the next build; the new one edits the spreadsheets and leaves untouched cells byte-identical. The conversion now reports data problems, such as one link dropped because of an ID typo, instead of hiding them. The rebuild was done with an AI coding assistant working from my brief, and I can walk through every decision and trade-off.
