# Thevey Brand Concept — Current State

## Overview
This storefront is a single-page premium fashion preview built in static HTML, CSS, and JavaScript. The direction is a luxury editorial experience with a strong motion-led hero, clean mobile navigation, and a commerce-ready bag and checkout flow.

## Current UX direction
- One-screen showroom with a large motion image/video stage
- Immediate autoplay on initial page load for the hero video
- Still-image fallback with a soft blur/ghost effect instead of a harsh duplicate panel
- Premium editorial caption and compact product browsing cards
- How-to-buy tutorial section replacing the previous generic feature text
- Icon-based bottom navigation for smaller screens
- Bag and checkout flow with accepted payment method badges

## Completed implementation
- Fixed the showroom to a single media frame without duplicate ghost panels
- Kept the active video crisp while the fallback image uses a blended blur treatment
- Added a four-step buying journey section on the homepage
- Updated nav items to include icon-based labels and a bag link
- Built a bag page with order summary and payment method showcase
- Added a dedicated checkout page with shipping and payment inputs

## Files in play
- index.html — homepage, hero motion, tutorial section, product list
- cart.html — bag summary and accepted payment methods
- checkout.html — full purchase form and order summary
- styles.css — layout, typography, motion, responsiveness, mobile nav, checkout styling
- script.js — product data, cart state, showroom rotation, and page behavior

## Responsive notes
- The hero retains a taller proportion on mobile to show more of the product framing
- The mobile bottom nav remains visible and non-intrusive
- The layout stacks smoothly at tablet/mobile widths and keeps the visual stage readable

## Open consideration
- If the visual brand wants a more literal luxury payment card set, replace text badges with actual Mastercard, Visa, PayPal, and Apple Pay SVG/logo assets in the future.
- The storefront is still static; the next phase would include live cart persistence rules or a real back-end checkout flow if required.
