# LUMÉI — UI Template & Component Reference

Companion file to `lumei_app_context.md`. This one is the practical
"how do I build the pieces" reference — design tokens, component patterns,
and the UX-performance patterns (lazy loading, infinite scroll, loading
states) that weren't fully spec'd in the original brief.

---

## 1. Visual reference note (uploaded neumorphic banking UI)

The reference image supplied (soft neumorphic banking app — embossed card
component, toggle switch, circular donut "Statistic" chart, pill-shaped
period selector, rounded icon-button bottom nav) is a **light, neumorphic**
style. That's a different surface treatment than LUMÉI's spec'd dark-glass
palette (`--background: #0a0a0a`, translucent white surfaces, blur) — so
don't import it wholesale. What's genuinely useful to borrow is the
**structure**, translated into the dark palette:

| Pattern in reference image | Translate to LUMÉI as |
|---|---|
| Embossed card with soft dual shadow | `.surface` card using `--surface` fill + `backdrop-filter: blur()` + a faint 1px `--border`, no heavy shadow |
| Pill-shaped "Last 30 days" dropdown selector | Reusable `.pill-select` — same shape/padding, used for size/category filters |
| Circular icon buttons in bottom nav | Mobile bottom nav icon buttons — soft glass circle, not neumorphic emboss |
| Donut chart + center accent button | Not needed for v1 (no analytics screen), but the "ring with a center focal action" idea maps well to a **circular progress ring around the AI-generation loading state** if that's ever built out |
| Toggle switch (on/off, colored thumb) | Reusable `.toggle` component for filter/preference screens |
| Category row: icon + label + % + amount | Reusable list-row pattern for order history / size-guide breakdowns later |

Keep this as a **component-shape reference only** — color treatment stays
dark/glass per the main spec.

---

## 2. Design tokens
```css
:root {
  --background: #0a0a0a;
  --surface: rgba(255,255,255,0.06);
  --surface-hover: rgba(255,255,255,0.1);
  --text: #f7f7f5;
  --muted: #9b9b9b;
  --border: rgba(255,255,255,0.12);

  --radius-lg: 24px;
  --radius-md: 16px;
  --radius-pill: 999px;

  --transition-fast: 200ms ease;
  --transition-base: 400ms ease;
  --transition-slow: 500ms ease;
}
```

## 3. Core component patterns

**Glass surface card**
```css
.surface {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(20px);
}
.surface:hover { background: var(--surface-hover); }
```

**Product image (hover + transition)**
```css
.product-image {
  transition: opacity var(--transition-base), transform var(--transition-slow);
}
.product-image:hover { transform: scale(1.02); }
```

**Pill selector** (borrowed shape from the "Period: Last 30 days" control)
```css
.pill-select {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 16px;
  border-radius: var(--radius-pill);
  background: var(--surface);
  border: 1px solid var(--border);
  font-size: 14px;
}
```

**AI Preview badge**
```html
<span class="badge">✦ AI PREVIEW</span>
```
```css
.badge {
  font-size: 11px; letter-spacing: .08em; text-transform: uppercase;
  color: var(--muted);
  padding: 4px 10px; border-radius: var(--radius-pill);
  background: var(--surface); border: 1px solid var(--border);
}
```

**Verify CTA** (the signature interaction — deserves the most visual weight)
```html
<button class="verify-cta">Verify it →</button>
```
```css
.verify-cta {
  border-radius: var(--radius-pill);
  padding: 12px 24px;
  background: #fff; color: #000;
  font-weight: 600;
  transition: transform var(--transition-fast);
}
.verify-cta:hover { transform: scale(1.03); }
```

---

## 4. Lazy loading

- Use Next.js `<Image>` with `loading="lazy"` (default for anything not
  marked `priority`) for all product/grid imagery — only the Home hero
  image should be `priority`.
- Serve responsive `sizes` so mobile doesn't download desktop-resolution
  images.
- Video: always set a `poster` (compressed still frame) and don't load the
  video source until the user taps "Watch real" / "Verify it" — don't
  autoplay/preload video on scroll-into-view for the demo.
- Blur-up placeholder while the real asset loads:
```css
.image-placeholder { filter: blur(20px); transform: scale(1.05); }
```
  Cross-fade to the loaded image with `transition: filter var(--transition-base)`.
- Below-the-fold sections (e.g. "New This Week" row beyond the first few
  cards) can mount lazily via `IntersectionObserver` if using plain
  React/Next without a heavier data-fetching library — no need for a
  dedicated lazy-load package.

## 5. Infinite scroll feel

Goal: feels continuous, never shows a jarring "Load More" button unless
JS fails.

- Sentinel-element pattern: an empty `<div ref={sentinelRef} />` placed
  after the last product card; `IntersectionObserver` fires the next page
  fetch when it enters the viewport (~200px root margin so the next batch
  starts loading *before* the user hits the bottom).
- Keep pagination **cursor-based**, not offset-based, so results stay
  stable if products are added/removed between fetches.
- While the next batch loads, render 2–4 skeleton cards in the grid
  (same `.surface` shape, no image) rather than a spinner — keeps the
  grid rhythm intact instead of interrupting it.
- Cap in-memory product list length for a long session (e.g. drop
  off-screen items beyond ~60 loaded products) only if this becomes a
  real perf issue — not a v1 concern with 6–8 demo products.
- New batch should fade/slide in with the same `var(--transition-base)`
  timing as everything else — no separate animation system.

## 6. Loading state copy (from main spec, for reuse across components)
```
CREATING YOUR PREVIEW
Preparing the silhouette
Refining the garment
Finishing the look

✓ Garment detected
✓ Model matched
◌ Rendering preview
```
Use this narrative pattern (not a generic spinner) anywhere the app is
"generating" something conceptually — reinforces the AI-preview framing
established on the product page.
