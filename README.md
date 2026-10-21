# Boardroom · XO & Chess

Two games, one picker, two people on the same device. Open `index.html` directly
or host this static site. There is no backend, account, CDN, or runtime install.
This is local multiplayer, with no online matchmaking or computer opponent.

## Games

**XO Party** keeps its animated nine-space board, names, player-based win totals,
draw count, icon selection each round, saved icon preferences, and result actions.
Continue keeps scores; Restart resets them; Pick other icon returns to the result
screen after selection. X always starts, whichever player chooses it.

**Chess Club** includes:

- Full legal move validation, check, checkmate, castling, en passant and all four
  promotion choices, powered by the bundled chess.js 1.4.0 engine.
- Tap-to-move and dragging, legal move hints, last-move and check highlights,
  board flipping, coordinates, captured pieces, material difference and optional sound.
- Optional 3+2, 5+0, 10+0 and 15+10 clocks. Clocks start after White's first move;
  the game picker pauses them. Promotion and history review keep clocks running.
- Move history with position review, agreed takebacks with clock restoration,
  agreed draws, resignation, PGN download and rematches with new color selection.
- Scores attached to each player across color swaps. Scores last for the open
  session; optional preferences remember names, colors and time control.
- Automatic stalemate, insufficient material, threefold repetition and 50-move
  draws. Online material conventions are also used for timeout results.

The responsive interface includes keyboard navigation, visible focus, dialog focus
management, screen-reader labels and reduced-motion support. It is an independent
local game; it does not connect to Chess.com services.

## Deploy on GitHub Pages

1. In the repository, open **Settings → Pages**.
2. Set **Source** to **GitHub Actions** (if it is not selected already).
3. Push to `main`, or run **Test and deploy Boardroom** under **Actions**.

The workflow installs test dependencies, runs the checks, builds `dist/`, and
deploys only the finished site. It replaces the earlier workflow that uploaded
the entire repository. A failing test prevents deployment.

The expected project URL is https://abu1hussain.github.io/XO-Game/ once deployment
has succeeded. All paths are relative, so project subdirectories work correctly.
You may also deploy from a branch using the repository root; `index.html`, `xo.html`,
`assets/`, `vendor/` and `.nojekyll` are all that the runtime needs.

## Develop and verify

Use Node.js 24 (the version used in CI):

```sh
npm ci --ignore-scripts
npm test
npm run build
npm start
```

The preview is http://127.0.0.1:4173. `dist/XO-Party.html` is a combined, standalone
download with both games embedded; it works without the other files.

Tests exercise the actual game scripts in a DOM environment: rule-engine reference
counts, special moves, checkmate and draws, promotion, clocks, score assignment,
rematches, takebacks, modal flow, history review, and the original XO scenarios.
DOM checks do not replace visual browser testing or prove the absence of all bugs.

## Rule references and license

- [chess.js documentation](https://jhlywa.github.io/chess.js/)
- [Chess.com timeout material conventions](https://support.chess.com/en/articles/8557986-my-opponent-ran-out-of-time-why-was-it-a-draw)
- [Chess.com insufficient-material conventions](https://support.chess.com/en/articles/8705277-what-does-insufficient-mating-material-mean)

The bundled engine retains its BSD-2-Clause notice in `vendor/chess.js` and
`THIRD_PARTY_NOTICES.md`. Piece SVGs and the interface are included locally.
