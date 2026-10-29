# Tactical Baseball

A tactical baseball board game for your phone, inspired by the Swiss baseball leagues. Manage a club through a season against a bot that learns your habits.

**Play:** https://dusiaclaw.github.io/tactical-baseball/

On Android, open the link in Chrome and tap **Install on this phone** on the title screen (or Chrome menu → Add to Home screen).

## How it plays

- Every pitch, you and the bot choose at the same time.
- **Batting:** tap the field to aim. Your aim is your guess: pull side = expecting inside, opposite field = outside, deep = high, short = low. Then swing Contact, Power, Take or Bunt.
- **Pitching:** throw inside or outside, high or low, or waste one off the plate. Shift or drag your fielders, and go to the bullpen when your pitcher tires.
- **Managing:** steals, sending runners on close plays, pinch hitters, intentional walks.
- **Campaign:** a 7-week season against eight clubs, playoffs for the top four, player XP and training, free agents. Progress saves on the device after every pitch, with backup export and restore.

## Development

The game ships as a single self-contained `index.html`. Source pieces live in `src/`; rebuild with:

```
python3 src/build.py
```

## Disclaimer

Independent, open-source fan project. Not affiliated with, endorsed by, or associated with the Swiss Baseball and Softball Federation (SBSF) or any club. Club names are used only to evoke the league; badges are simple original shields, not official logos. All players are fictional.

## Licence

GNU General Public License v3.0. See [LICENSE](LICENSE).
