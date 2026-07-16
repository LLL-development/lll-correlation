# Guess the Correlation

A quick game that builds statistical intuition. Look at a scatter plot, guess the
correlation between the two variables, and see how close you were — with feedback
that explains what the number means.

**Live:** https://lll-correlation.pages.dev/  (after first deploy)

## Features

- **Guess the correlation** — drag the slider from −1 to +1 to estimate the relationship
- **Honest scoring** — the answer is the real correlation of the points on screen, computed live; the closer your guess, the higher the score
- **Trend line reveal** — the best-fit line is drawn when you check your answer
- **Plain-language feedback** — every result is labelled (weak / moderate / strong, positive / negative) and explained
- **Streak & best score** — best score saved locally across visits
- **Learning sections** — what correlation is, a strength guide, and a "correlation ≠ causation" reminder
- **Dark mode** — follows the device setting, remembered across visits
- **Six languages** — Japanese (default), English, Simplified/Traditional Chinese, Korean, Malay

## How to play

1. Look at the scatter plot.
2. Drag the slider to your best guess of the correlation coefficient (r).
3. Press **Check**. The closer your guess to the real value, the more points you score.

## Running locally

No build step and no dependencies — plain HTML, CSS, and JavaScript.

```bash
npx serve .
```

Then open the printed `localhost` URL. A static server is required because the page
loads shared files from `shared/`; opening `index.html` over `file://` will not work.

## How it works

Each round generates points with a random target correlation, then computes the
**actual** Pearson correlation of those exact points and scores your guess against
that — so the answer always matches the picture. Because correlation is unchanged
when each axis is scaled independently, the points can be mapped freely into the
plot area without affecting the value.

## Architecture

```
lll-correlation/
├── index.html                  the game — plot, scoring, and teaching sections
├── shared/                     shared with the other LLL tools
│   ├── brand.css               palette, dark theme, common UI
│   ├── i18n.js                 language list, translations, switcher
│   ├── theme.js                light/dark theme engine
│   ├── logo.svg
│   └── favicon.svg
└── .github/workflows/deploy.yml  deploys to Cloudflare Pages on merge to main
```

## License

MIT
