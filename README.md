# Tactical Baseball

A dice-and-cards baseball board game for your phone, inspired by the Swiss baseball leagues. Run a club through a season against a bot, one roll at a time.

**Play:** https://dusiaclaw.github.io/tactical-baseball/

On Android, open the link in Chrome and tap **Install on this phone** on the title screen (or Chrome menu → Add to Home screen).

## How it plays

- Every at-bat is one roll of three dice. The **bat/glove die** picks whose card is read (bat: batter, glove: pitcher); the **two white dice** (2–12) point to a box on that card: single, double, home run, strikeout…
- Both cards are always on screen. Wider boxes are more likely, so you can see the odds.
- **Momentum ◆**: spend one to re-roll a single die, either to rescue your own out or to cancel the other team's big hit. The game shows the odds for each die before you choose. Earn ◆ with extra-base hits and strikeouts.
- **Tactics**: Swing, Power (singles become fly outs, doubles become home runs), Bunt, Steal. On defense: bullpen and intentional walks. Pitcher cards wear down as they tire.
- **Campaign**: a 7-week season against eight clubs, playoffs for the top four, player XP and training (better ratings mean better cards), free agents. A 3-inning game takes about 3–4 minutes. Progress saves on the device after every roll, with backup export and restore.

## Development

The game ships as a single self-contained `index.html`. Source pieces live in `src/`; rebuild with:

```
python3 src/build.py
```

## Disclaimer

Independent, open-source fan project. Not affiliated with, endorsed by, or associated with the Swiss Baseball and Softball Federation (SBSF) or any club. Club names are used only to evoke the league; badges are simple original shields, not official logos. All players are fictional.

## Licence

GNU General Public License v3.0. See [LICENSE](LICENSE).
