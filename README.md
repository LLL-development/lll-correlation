# Guess the Correlation

Statistical intuition trainer. Read a scatter plot, guess how correlated the two variables
are, and find out how close you were — with feedback that explains what the number means.

**Live:** https://lll-correlation.pages.dev/

Three pages: **Play** (the game), **Tutorial** (a five-step hands-on walkthrough), and
**Learn** (the reference).

## Pages

| Page | File | What it's for |
|------|------|---------------|
| Play | `index.html` | The game: four modes, scoring, and your calibration report |
| Tutorial | `tutorial.html` | Five interactive steps, from "what is a dot" to a real round |
| Learn | `learn.html` | Reference: reading plots, the strength ladder, r's blind spots, causation |

Navigation uses the `.lll-nav` component already defined in `shared/brand.css`, so the
chrome matches the rest of the LLL Series.

## The tutorial

Five steps, each with one interaction and one idea. Every dataset is seeded, so the lesson
is identical on every visit and in every language.

1. **Every dot is one thing, measured twice** — 14 students, hours revised against mark.
   Tap a dot and it reads out. Concrete before abstract; no "x and y" until step 2.
2. **r is one number for the whole cloud** — drag a slider from −1 to +1 and the *same 44
   points* deform smoothly. Reusing one x/z draw across every r means the only thing
   changing on screen is r itself.
3. **Strength is tightness, not steepness** — two clouds on the same line (slope a = 1),
   differing only in noise. Since `r = a/√(a²+s²)`, holding a fixed and moving s isolates
   spread as the thing r actually reads. Lands at 0.95 vs 0.54.
4. **r only sees straight lines** — the three trap types, side by side, all near +0.8.
5. **Your turn** — one real round with the game's own mechanics and truth marker.

## Features

- **Type it or drag it** — the value readout is an editable input, so you can type an exact r or drag the slider; both are always live, with no mode to switch. Enter checks, arrow keys nudge
- **Honest scoring** — the answer is the real Pearson correlation of the dots on screen, computed live, so the number always matches the picture
- **The truth on the slider** — the real r is marked directly on the track, with the gap back to your guess shaded in. The number is abstract; the distance is not
- **Dots that track your guess** — the plot is tinted along the same blue → grey → orange scale as the strength guide, following the slider as you drag, then sliding across to the true colour on reveal
- **Bias report** — tracks whether you systematically under- or overestimate strong correlations, a well-documented human tendency, and tells you by how much
- **Trap rounds** — occasional datasets with r ≈ 0.8 that are not remotely linear, because r only measures the straight-line part of a relationship
- **Daily challenge** — five plots seeded from the date, identical for every player worldwide, with a shareable result grid
- **Reverse mode** — given an r value, pick which of three plots matches it
- **Trend line reveal** — the line of best fit draws itself across the points when you check
- **Plain-language feedback** — every result is labelled (weak / moderate / strong, positive / negative) and explained in words
- **Difficulty levels** — Easy, Normal, and Hard change both the correlations shown and how many points are plotted
- **60-second challenge** — answer as many as you can before the timer runs out
- **Streak & best score** — best score saved locally across visits
- **Scatter plot primer** — live example plots showing strong positive, none, and strong negative
- **Learning sections** — a correlation strength guide, a "what is correlation?" explainer, and a "correlation ≠ causation" reminder
- **Dark mode** — follows the device setting, remembered across visits
- **Six languages** — Japanese (default), English, Simplified/Traditional Chinese, Korean, Malay
- **Accessible motion** — dot stagger, line draw, confetti and count-ups all respect `prefers-reduced-motion`
- **Live-measured teaching plots** — every example on the Learn page is generated and measured at runtime, so a caption can never drift out of sync with its picture
- **Fully client-side** — no build step, no dependencies, no data leaves the browser

## Game modes

**Practice** — untimed. Play as long as you like, one plot at a time.

**Challenge** — 60 seconds. Answer as many plots as you can; the timer turns orange for the
last ten seconds. At the end you see how many you answered and your final score.

**Daily** — five plots, once a day. The dataset is generated from a `mulberry32` PRNG seeded
with today's date, so every player in the world gets byte-identical plots. Finishing gives
you a share grid:

```
Guess the Correlation 2026-07-16
🟩🟨🟩🟧⬜
412/500 · Avg. miss 0.11
```

Results are stored locally; the day's plots don't change if you come back.

**Reverse** — an r value is shown and you pick which of three plots matches it. The three
plots are always at least 0.25 apart in r, so exactly one answer is defensible. All three
are tinted by the *asked* r rather than their own, so the colour poses the question without
giving away the answer.

## Difficulty

| Level  | Points plotted | Correlations shown |
|--------|----------------|--------------------|
| Easy   | 60             | Only clear-cut cases — either strong (\|r\| ≥ 0.7) or near zero (\|r\| ≤ 0.15). No traps |
| Normal | 44             | The full range, from −0.98 to +0.98 |
| Hard   | 24             | Mostly middling (0.25 ≤ \|r\| ≤ 0.75), and fewer points, so the pattern reads noisier |

Difficulty applies to Practice and Challenge. Daily and Reverse set their own.

## Scoring

| Guess error | Verdict   | Points  | Daily mark |
|-------------|-----------|---------|------------|
| ≤ 0.05      | Spot on!  | 95–100  | 🟩 |
| ≤ 0.15      | Close!    | 85–95   | 🟨 |
| ≤ 0.35      | Not bad   | 65–85   | 🟧 |
| > 0.35      | Off       | 0–65    | ⬜ |

Points are `100 − error × 100`, rounded, with a minimum of zero. A guess within 0.15
extends your streak. The result card is tinted by the tier you landed in.

## Trap rounds

Roughly one round in seven (Normal and Hard only, never Easy) is a dataset with |r| around
0.8 that is emphatically not a straight line. This is the point of the exercise: r measures
only the *linear* component of a relationship, so a high r never proves the relationship is
a line.

| Kind      | What it is | Why r lies |
|-----------|------------|------------|
| `curve`   | A clean parabola, vertex near the top of the x range (Anscombe II in spirit) | The linear fit still climbs, so r stays high while the real shape is a curve |
| `lever`   | A shapeless cloud plus one far-away point | That single point invents the entire correlation |
| `cluster` | Two blobs with no internal trend, offset along the diagonal | The correlation is *between* groups, not inside them |

For `cluster`, blobs at ±d with independent noise s give `r = d²/(d²+s²)`, so s ≈ 0.5d puts
it in the same band as the others.

Trap rounds are deliberately misleading, so they are **excluded from the bias report** —
everyone lowballs them, which would poison the reading.

## Bias report

People systematically underestimate |r|: a plot that looks only mildly tilted is usually
more correlated than it feels. The calibration panel tracks whether you do it too.

It records `|guess| − |actual|` over rounds where `|actual| ≥ 0.5`. A persistently negative
mean means you shade strong correlations toward zero, and the panel names the number:
*"You tend to underestimate strong correlations by 0.14."* Needs five scored rounds to
appear, and five strong ones for the bias line. Resettable, and stored only in
`localStorage`.

## How to play

1. Look at the scatter plot.
2. Type your best guess of the correlation coefficient (r), or drag the slider.
3. Press **Check**, or just hit Enter. The real r is marked on the slider and the gap to
   your guess is shaded.

## Entering a guess

The readout and the slider are one bound value — either can drive, both stay in sync.

| Input | Does |
|-------|------|
| Type `0.5`, `-.75`, `+0.3` | Sets the guess; the slider follows as you type |
| Enter | Checks the answer |
| ↑ / ↓ | Nudge by 0.01 |
| Shift + ↑ / ↓ | Nudge by 0.10 |
| `±` button | Flips the sign |
| Drag the slider | Updates the readout |

The parser takes what people actually type, not just what `parseFloat` likes: a real minus
sign (−) or a dash, a comma decimal (`0,5`), and **fullwidth digits and punctuation**
(`０．５`, `－０．７５`) straight out of a CJK IME — which matters, since the default
language is Japanese. Out-of-range values clamp to ±1; unparseable text is ignored and the
field reverts on blur rather than throwing the guess away. Text is never reformatted
mid-keystroke.

The `±` button is not decoration: **iOS shows no minus key on a decimal keypad**, so on a
touch device it is the only way to type a negative r.

## Running locally

No build step and no dependencies — plain HTML, CSS, and JavaScript.

```bash
npx serve -p 5500 .
```

Pin the port explicitly rather than letting it pick one at random. The service worker is
scoped per-origin (host **and** port), so a fresh random port every restart means a fresh,
unrelated registration every time — mostly harmless, but it multiplies stale registrations
in DevTools and makes "did the SW update?" harder to reason about while developing.
`python -m http.server 5500` works the same way.

Then open the printed `localhost` URL. A static server is required: the pages load
`shared/`, `site.css` and the JS as separate files, and `localStorage` is unreliable on an
opaque `file://` origin, so best score and the daily would silently fail to persist.

## Progressive Web App

`manifest.json` and `sw.js` make the tool installable and give it an offline app shell.

**What's cached.** `sw.js` precaches the static assets — `site.css`, `corr.js`, `nav.js`,
`strings.js`, and each page's own JS, plus `shared/*` — cache-first once loaded. **HTML
pages are deliberately never cached or intercepted.** Every navigation (clicking a nav link,
typing a URL, hitting reload) goes straight to the network, exactly as if there were no
service worker at all. Page loads always show the current file; only the supporting assets
get offline treatment.

That trade-off exists because of a real failure mode: a service worker that *does*
intercept navigations has to have a correct answer for every navigation, forever, including
after the origin's cache has gone stale or missing. Get that fallback path wrong even once —
which the first version of this shipped with — and a page navigation resolves with
`undefined` instead of a response, which Chrome reports as `net::ERR_FAILED` and looks
exactly like a missing file. Excluding navigations from interception makes that entire class
of bug structurally impossible rather than merely less likely.

**If a page ever fails to load with `net::ERR_FAILED` while a service worker is registered**
(most likely from testing an older version of this tool, before the fix above), the fix is:
DevTools → **Application** → **Storage** → **Clear site data**, then open the page in a
**new tab** — an already-open tab stays controlled by whichever worker was active when it
loaded, so a plain reload isn't always enough to shake a bad one loose.

**Cache versioning.** `sw.js` has a `CACHE_VERSION` string. Bump it whenever any file in
`CORE_ASSETS` changes — old caches are deleted automatically on the next `activate`, but only
once a version bump makes the old one stop matching.

**Disabling it entirely.** Comment out the `serviceWorker.register(...)` call in `app.js`. No
other file depends on the service worker existing.

## How it works

Each round picks a target correlation for the chosen difficulty, then generates points as
`y = r·x + √(1−r²)·z`, where `x` and `z` are independent standard normals. The **actual**
Pearson correlation of those exact points is then computed and your guess is scored against
that — not against the target — so the answer can never disagree with what is on screen.
The same holds for trap rounds and for the r shown in Reverse mode: every number on screen
is measured from the dots you can see.

Because correlation is unchanged when each axis is scaled independently, the points can be
mapped freely into the plot area without affecting the value.

The daily uses the same generator driven by a seeded `mulberry32` instead of `Math.random`,
with the seed being an FNV-1a hash of the local date.

## Architecture

```
lll-correlation/
├── index.html                    Play — the game
├── tutorial.html                 Tutorial — five interactive steps
├── learn.html                    Learn — the reference
├── site.css                      tool-wide styles + the correlation palette
├── corr.js                       shared engine: maths, generators, palette, drawing
├── nav.js                        global navbar
├── strings.js                    all six language dictionaries
├── app.js                        game rules: difficulty, modes, scoring, calibration
├── tutorial.js                   tutorial steps
├── learn.js                      learn-page plots
├── shared/                       shared with the other LLL tools — do not fork
│   ├── brand.css                 palette, dark theme, navbar, common UI
│   ├── i18n.js                   language list, translations, switcher
│   ├── theme.js                  light/dark theme engine
│   ├── logo.svg
│   └── favicon.svg
└── .github/workflows/deploy.yml  deploys to Cloudflare Pages on merge to main
```

`corr.js` holds everything all three pages agree on — the generators, Pearson, the palette,
and the plot furniture — as pure functions with no DOM state. Each page's own JS owns only
its rules. Nothing is copy-pasted between pages.

The blue → grey → orange correlation scale is defined once, as `--r-neg` / `--r-mid` /
`--r-pos` in `site.css`, and drives the strength guide, the slider rail, and the dots on
every page. `corr.js` reads those variables back out of CSS rather than hardcoding them, so
changing the palette in one place changes everything, dark mode included.

### Seeded teaching plots

Sample r at n = 40 scatters by roughly ±0.15 around its target. That is fine for the game,
where the answer is whatever the dots say, but useless for a reference ladder — a band
aiming at 0.30 can easily land on 0.07 and get captioned "weak positive" while showing
nothing of the sort. `C.seekSeed()` walks seeds deterministically until the sample lands
within tolerance of the target, and the Learn page derives its labels from the *measured* r
rather than the target, so the caption can never contradict the picture.

## Adding a language

Add a locale block to `strings.js` with the same keys as `"en"` (156 of them), and add the
language to the list in `shared/i18n.js`. Every string across all three pages comes from
that file. `%s` in a value is a runtime placeholder — `calibUnder` and `calibOver` take one,
`t1Read` and `tutStep` take two, in order.

## License

MIT
