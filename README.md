# XO Party

Open **index.html** in a browser. Everything is included in this single file;
no installation, internet connection, or build step is needed.

Two people play on the same device, taking turns on a 3×3 board (nine spaces).
Player 1 selects X or O; Player 2 receives the other symbol. X always starts.
Names and wins belong to each person even when the symbols change.

- **Continue** keeps scores and asks players to confirm their icons for the next round.
- **Restart** on the result screen starts a fresh match with scores reset.
- **Pick other icon** opens selection, then returns to the same result screen.
  Continue then starts the next round using the chosen icons.
- **Save the current icon** remembers the preference on this browser when storage
  is available. Icon selection still appears each time the game opens.
- During play, **Restart round** keeps scores; **Reset scores** starts a fresh match.
  Both open icon selection first. Back cancels without changing the current board.

The page supports small screens, keyboard controls, dialog focus management,
screen-reader announcements, and the system's reduced-motion preference.

Run the dependency-free logic checks with Node.js:

```sh
node --test tests/game.test.cjs
```
