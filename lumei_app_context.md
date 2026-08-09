# LUMÉI — AI Fashion Showroom
### App Context File (digested from build prompt + chat log)

## 1. Product Vision
A lightweight, premium fashion e-commerce experience that creates the *illusion*
of an interactive 3D/virtual mannequin using AI-generated model images —
without building true 3D rendering.

**Formula:** AI-generated images (multiple angles) + smooth CSS transitions + a real product verification video.

**Customer experience in one line:** *See it. Explore it. Verify it.*

- The AI image shows how the garment *can* look.
- The real video proves what the physical garment *actually* looks like.
- The AI-generated nature of imagery must always be clearly disclosed —
  never presented as real photography.

**Core philosophy / signature interaction:**
```
IMAGINE → EXPLORE → VERIFY → BUY
```
The single most important interaction in the app is the transition from the
AI preview to the real product video ("Verify it →"). This should get more
design attention than any secondary feature.

---

## 2. Primary Priorities (in order)
1. **Keep the code light** — simplest implementation that gets the visual
   result. No unnecessary libraries, animation frameworks, 3D engines,
   WebGL, or premature backend infra. Prefer native CSS
   (`transition`, `backdrop-filter: blur()`) over pulling in a library.
2. **GitHub from day one** — clear conventional commits (`feat:`, `fix:`,
   `style:`), push before major changes, never treat local as source of truth.
3. **Security/legal tracked, not blocking** — maintain a visible `TODO.md`
   (full checklist below) and address after the UI is approved. Don't claim
   production-security until reviewed.
4. **Short explanations when reporting progress** — 1–3 sentences, no
   over-explaining architecture.

**Build order:** Appearance → UX → Performance → Reliability → Infrastructure.
Do not prematurely build Phase 4 (auth, payments, real AI backend, etc.).

---

## 3. Technical Direction
- **Stack:** Next.js, React, TypeScript, Tailwind CSS — don't introduce
  another framework unless necessary.
- Small, focused, reusable components:
  `<ProductCard product={product} />`, `<AIViewer images={product.aiImages} />`,
  `<ProductVideo video={product.realVideo} />`

### Data model
```ts
type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  colors: string[];
  sizes: string[];
  aiImages: string[];
  realVideo?: string;
  aiModel?: string;
  verified?: boolean;
};
```
Static product data + pre-generated assets are sufficient for the demo —
no AI generation backend needed yet. ~6–8 fictional products, each with an
AI model image, name, price, category, 3+ AI views, real video where
possible, and the AI Preview label.

---

## 4. UI Direction
**Feel:** Modern Apple-inspired UI + premium fashion editorial + the spatial
structure of a modern digital storefront. A **digital fashion showroom** —
not a generic Shopify store, not an AI dashboard, not a traditional
marketplace. Expensive, calm, intentional. Don't overuse gradients; don't
look like a crypto/AI startup.

**Visual language:** large typography, large product imagery, generous
negative space, rounded containers, soft shadows, subtle borders,
translucent/glass surfaces, gentle blur, minimal icons, restrained
animation, strong hierarchy.

**Base palette (dark):**
```css
:root {
  --background: #0a0a0a;
  --surface: rgba(255,255,255,0.06);
  --surface-hover: rgba(255,255,255,0.1);
  --text: #f7f7f5;
  --muted: #9b9b9b;
  --border: rgba(255,255,255,0.12);
}
```
See `lumei_ui_template.md` for the component-level reference (including a
secondary soft/neumorphic inspiration image) and loading-state patterns.

**Desktop:** persistent sidebar (Discover / Saved sections, not overloaded)
+ top nav (logo, Shop/Collections/Journal, profile). **Mobile:** simple
bottom nav (Home / Shop / AI / ♡ / Bag) — don't force the desktop sidebar
onto mobile; the AI button can be visually emphasized.

---

## 5. Core Screens (build only these)
1. **Splash** — "LUMÉI" / "SEE IT DIFFERENTLY." Short fade/scale transition.
2. **Onboarding** — 3 cinematic (not informational) screens:
   - AI, meet fashion.
   - One piece. Every angle.
   - Imagine. Then verify. → CTA "Enter Store →"
3. **Home** — Hero: season + product name + tagline + "Explore" / "Watch real" CTAs, large AI model image. Below: "New This Week" horizontal scroll.
4. **Explore** — Category filters (All/Dresses/Tops/Bottoms/Sets/New). Image-forward product cards showing `✦ AI Preview · ✓ Real Video` status.
5. **Product Page** (most important screen) — AI image dominates. `✦ AI PREVIEW` badge + "swipe to explore" + Front/Side/Back tabs. Price, color, size selector, Add to Bag.
6. **Real Product Video** (verification layer) — appears after AI preview via "Verify it →". Shows `✓ VERIFIED` + the actual vertical/portrait product video.
7. **Cart** — Deliberately minimal: image, name, variant, price, subtotal, checkout. No complex checkout flow for v1.

---

## 6. AI Preview Experience
No true 3D. Just an array of AI images swapped via a lightweight viewer with
CSS-driven transitions, so the customer *perceives* an interactive model
(Front → Side → Back → Detail).
```ts
const aiImages = [
  "/products/sienna/front.webp",
  "/products/sienna/side.webp",
  "/products/sienna/back.webp",
  "/products/sienna/detail.webp",
];
```
Always labeled: `✦ AI PREVIEW` + "AI-generated visualization of this garment."

---

## 7. Loading States
Avoid generic "Loading...". For AI generation, use narrative micro-copy:
```
CREATING YOUR PREVIEW
Preparing the silhouette
Refining the garment
Finishing the look

✓ Garment detected
✓ Model matched
◌ Rendering preview
```
For normal images: blurred placeholder → transition to full resolution.
```css
.image-placeholder { filter: blur(20px); transform: scale(1.05); }
```

---

## 8. Performance
WebP/AVIF, responsive image sizes, lazy loading, video poster images,
compressed video, minimal JS, CSS transitions over JS animation,
server-rendered content where practical. Don't load every product
image/video immediately — first screen must load fast.
(See `lumei_ui_template.md` for concrete lazy-load / infinite-scroll notes.)

---

## 9. Development Phases
- **Phase 1:** Splash → Onboarding → Home → Explore → Product
- **Phase 2:** AI Preview viewer → Real Product Video → Cart
- **Phase 3:** Polish — transitions, loading states, responsive design, micro-interactions, typography, spacing
- **Phase 4 (after UI approval only):** Security, auth, admin, database, real AI generation integration, video upload, payments, analytics, SEO, legal

---

## 10. Security & Legal TODO (tracked, not blocking v1)
```md
## Security
- [ ] Authentication security
- [ ] Authorization / admin permissions
- [ ] Secure media uploads
- [ ] File type validation
- [ ] File size limits
- [ ] API key protection
- [ ] Environment variable protection
- [ ] Rate limiting
- [ ] Input validation
- [ ] XSS protection
- [ ] CSRF considerations
- [ ] Secure payment implementation
- [ ] Database security rules
- [ ] Backup strategy

## Legal / Trust
- [ ] AI-generated image disclosure
- [ ] Real-product-video verification policy
- [ ] Model/image usage rights
- [ ] Garment/product image ownership
- [ ] Privacy policy
- [ ] Terms of service
- [ ] Cookie/analytics consent where required
- [ ] Advertising disclosure requirements
- [ ] Refund/return policy
- [ ] AI representation disclaimer

## Production
- [ ] Performance audit
- [ ] Accessibility audit
- [ ] SEO audit
- [ ] Mobile testing
- [ ] Browser compatibility
- [ ] Production monitoring
```

---

## 11. Final Design Test (before calling the prototype "done")
- Does it immediately feel like a premium fashion product?
- Can a new user understand the AI Preview concept within seconds?
- Is the AI-generated nature of the imagery clearly disclosed?
- Does the AI → Real Video transition feel natural?
- Does the interface work beautifully on mobile?
- Does the site remain lightweight?
- Can the entire demo be understood in under one minute?
- Can the implementation be easily migrated or expanded later?

If yes to all: **stop adding features, polish instead.**
