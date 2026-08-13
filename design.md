# Design — 小小做到 / Little Wins

Locked design system. Future product-page changes read this file first and
defer to it. Amend intentionally; this file is the rule.

## System

- Genre · modern-minimal, warm and humane
- Theme · Coral, adapted to the existing warm-paper brand
- Axes · light paper / serif display + sans body / restrained warm coral
- Product promise · 温柔，但有力量；安静，但会为用户亮起来

## Macrostructure family

- Marketing pages · Long Document or Workbench; real product captures only
- App pages · Map / Diagram family with one persistent shell and distinct canvases
- Content pages · Long Document; typography first
- Dashboard variants · Today timeline / Week journey / Month calendar / Six-month chapters / Year panorama

## Tokens

`tokens.css` is canonical. Product styles must reference semantic tokens and
must not introduce one-off colour or font values inside components.

```css
:root {
  --color-paper: oklch(97.5% 0.008 70);
  --color-paper-2: oklch(95.5% 0.012 66);
  --color-paper-3: oklch(92.5% 0.014 62);
  --color-ink: oklch(35% 0.025 48);
  --color-ink-2: oklch(44% 0.022 48);
  --color-rule: oklch(89% 0.012 62);
  --color-muted: oklch(56% 0.018 52);
  --color-accent: oklch(72% 0.11 32);
  --color-accent-ink: oklch(27% 0.035 38);
  --color-focus: oklch(48% 0.15 30);

  --font-display: "Noto Serif SC", "Songti SC", ui-serif, serif;
  --font-body: "Inter", "PingFang SC", "Microsoft YaHei", ui-sans-serif, sans-serif;
  --font-outlier: "Inter", ui-sans-serif, sans-serif;

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --dur-micro: 120ms;
  --dur-short: 220ms;
  --dur-long: 420ms;

  --radius-card: 18px;
  --radius-pill: 999px;
  --radius-input: 12px;
}
```

## Typography

- Display · Noto Serif SC, 600, roman only
- Body · Inter, 400; Chinese fallback PingFang SC / Microsoft YaHei
- Labels and numeric metadata · Inter, tabular numbers
- Body copy · 16 px minimum, 1.6 line height, 45–75 character measure
- Headings · no italic emphasis; hierarchy comes from size, weight and spacing

## Spacing and depth

- 4-point named scale from `--space-3xs` to `--space-4xl`
- One containment layer; no card-inside-card layouts
- Depth uses borders, weight and one restrained shadow token
- Accent occupies less than 5% of a viewport

## CTA voice

- Primary · ink fill / paper text / pill radius / specific verb
- Secondary · paper surface / rule border / same height and radius
- Every touch action · at least 44 × 44 CSS px and one-line label

## Motion stance

- Motion-cut by default
- Allowed primitives · button press / saved-entry settle
- Animate transform and opacity only
- Reduced-motion fallback · opacity only, at most 150 ms

## Feedback stance

- Saving succeeds visibly where the entry appears; no generic success toast
- Errors name what failed and retain the draft
- Encouragement cites the recorded action or real aggregate evidence
- No streak pressure, completion percentage, ranking or fabricated metric

## Per-page allowances

- App pages use no decorative enrichment; the user’s own records carry the page
- Today keeps full detail; longer periods progressively reduce information density
- Empty days and months are quiet space, never failure states
- All five period views share tokens, shell, controls and content voice

## Exports

### `tokens.css`

The project-root `tokens.css` is the source of truth.

### Tailwind v4 `@theme`

```css
@theme {
  --color-paper: oklch(97.5% 0.008 70);
  --color-paper-2: oklch(95.5% 0.012 66);
  --color-paper-3: oklch(92.5% 0.014 62);
  --color-ink: oklch(35% 0.025 48);
  --color-ink-2: oklch(44% 0.022 48);
  --color-rule: oklch(89% 0.012 62);
  --color-muted: oklch(56% 0.018 52);
  --color-accent: oklch(72% 0.11 32);
  --color-focus: oklch(48% 0.15 30);
  --font-display: "Noto Serif SC", ui-serif, serif;
  --font-body: "Inter", ui-sans-serif, sans-serif;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

### DTCG `tokens.json`

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "paper": { "$value": "oklch(97.5% 0.008 70)", "$type": "color" },
    "ink": { "$value": "oklch(35% 0.025 48)", "$type": "color" },
    "accent": { "$value": "oklch(72% 0.11 32)", "$type": "color" },
    "focus": { "$value": "oklch(48% 0.15 30)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Noto Serif SC, Songti SC, ui-serif, serif", "$type": "fontFamily" },
    "body": { "$value": "Inter, PingFang SC, ui-sans-serif, sans-serif", "$type": "fontFamily" }
  },
  "space": {
    "md": { "$value": "1rem", "$type": "dimension" },
    "lg": { "$value": "1.5rem", "$type": "dimension" }
  }
}
```

### shadcn/ui CSS variables

```css
:root {
  --background: 97.5% 0.008 70;
  --foreground: 35% 0.025 48;
  --card: 95.5% 0.012 66;
  --card-foreground: 35% 0.025 48;
  --primary: 35% 0.025 48;
  --primary-foreground: 97.5% 0.008 70;
  --secondary: 92.5% 0.014 62;
  --secondary-foreground: 44% 0.022 48;
  --muted: 89% 0.012 62;
  --muted-foreground: 56% 0.018 52;
  --accent: 72% 0.11 32;
  --accent-foreground: 27% 0.035 38;
  --border: 89% 0.012 62;
  --input: 89% 0.012 62;
  --ring: 48% 0.15 30;
  --radius: 18px;
}
```
