# Articles of Faith Jumble

A phone-first word puzzle PWA for Griggware, based on the 13 LDS Articles of Faith.

## Gameplay

- Select Article 1 through Article 13 from an index.
- Drag scattered tiles around a full-screen assembly mat.
- Each tile contains a fixed chunk of lowercase text with spaces and punctuation removed.
- Correct consecutive tiles or assembled groups snap together when their matching ends are close enough.
- Joins are permanent; incorrect neighbors produce no response.
- Merged groups restore internal word spacing, retain partial words at their outer edges, and wrap into taller tiles.
- Completing an article reveals its full capitalization and punctuation, with Replay and Return to Articles actions.
- Completion marks persist in local storage. Unfinished arrangements are discarded when leaving an article.

## Direction

React and TypeScript PWA, with potential iOS and Android packaging through Capacitor later.

Article text and ordered, provisional chunks will live in a replaceable configuration file. Original chunk sets can be substituted when recovered.

Phone support comes first, followed by desktop and tablet layouts.

## Development

Use Node 22.12 or newer (an `.nvmrc` is included).

```sh
nvm use
npm ci
npm run dev
```

Vite prints local and LAN addresses. On a phone, open the LAN address while connected to the same network. Installation and service workers require HTTPS, or localhost for local testing; use HTTPS hosting to test installation on a physical phone.

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run preview
```

Browser tests use the production build, so run `npm run build` first. They cover joining, victory/replay, completion persistence, unfinished discard, offline reload, and viewport resizing. Physical iPhone/Android testing remains necessary before release.

## Content configuration

Edit `src/articles.json`. Each entry has `id`, full formatted `text`, and an ordered `chunks` array. Chunks must contain at least three lowercase ASCII letters each; their concatenation must equal the source text with punctuation, spaces, and capitalization removed. Startup and unit tests validate this. Chunk boundaries are fixed in the file, never generated during play. Current divisions are provisional.

Source text: [Articles of Faith, Church scripture edition](https://www.churchofjesuschrist.org/study/scriptures/pgp/a-of-f/1?lang=eng). The historical text was written in 1842.

## Controls and offline use

Drag a tile so its gold end approaches the matching end of its neighbor, then release. Tiles can briefly extend past the mat edge while dragging, allowing connections to wide groups. Joined tiles wrap at a maximum of two-thirds of the viewport width and settle inside the mat. Drag near the top or bottom edge to scroll long mats; swipe the empty background to scroll normally.

Keyboard: focus a tile, use arrow keys to move it, then Enter or Space to attempt a join.

The first online load caches the app and all articles. Subsequent visits work offline. Updates display a refresh action. Only completed article IDs are stored locally; arrangements are discarded on leaving or refreshing.

## Deployment

Build and serve `dist/` from an HTTPS static host. This project currently assumes deployment at the domain root. No backend, account, or API keys are required.
