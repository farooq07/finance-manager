---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces. Avoid generic "AI aesthetics" through intentional design choices.
source: https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md
---

# frontend-design

This skill enables creation of distinctive, production-grade frontend interfaces. The resource emphasizes avoiding generic "AI aesthetics" through intentional design choices.

## Key Principles

**Design Strategy** — Before coding, establish context: purpose, tone, constraints, differentiation.
> "Choose a clear conceptual direction and execute it with precision."

**Aesthetic Execution** — Four focus areas:

1. **Typography** — Distinctive choices that elevate the frontend's aesthetics. Don't default to Inter / system-ui for everything. Mix display + body fonts. Use real letter-spacing, line-height, and weight contrast.
2. **Cohesive color themes** — Use CSS variables. Build a palette with intent (mood, brand, contrast). Avoid the default purple/blue/cyan SaaS gradient.
3. **Purposeful motion** — Animations support meaning, never decoration. Subtle micro-interactions, smooth transitions, scroll-triggered reveals when they aid comprehension.
4. **Spatial composition** — Unexpected layouts. Use asymmetry, off-grid alignment, generous whitespace. Avoid the centered hero / 3-column features / 4-column footer template.

**Critical Rule**
> NEVER converge on common choices across generations. Generic fonts, predictable layouts, and cookie-cutter designs should be avoided.

**Implementation Approach** — Match code complexity to the vision:
- Maximalist designs → elaborate animations, layered effects, dense visual hierarchy
- Minimalist designs → precision in spacing, weight, alignment; restraint everywhere

## Pre-design checklist

Before writing JSX:

- [ ] **Purpose** — What is this page convincing the visitor of?
- [ ] **Audience** — Who is reading this, and what do they already know?
- [ ] **Tone** — Confident? Playful? Editorial? Technical? Pick one.
- [ ] **Differentiation** — What makes this NOT look like Stripe / Linear / Vercel?
- [ ] **Primary action** — What is the one thing the visitor should do?
- [ ] **Palette** — 1 brand color + 1 accent + 1 surface + 1 ink. No more.
- [ ] **Type pair** — A display family + a body family that contrast meaningfully.

## What to avoid

- Centered hero with gradient text + "Built for X" subheadline + side-by-side CTA buttons
- Three-column feature grid where every card has an icon-in-rounded-square-with-gradient-bg
- Generic "Trusted by" logo row in grayscale at 60% opacity
- Spinning gradient blob in the background
- The exact same `bg-gradient-to-r from-purple-600 to-blue-600` SaaS gradient
- Lucide / heroicons used as the entire visual language

## What to reach for

- Real product imagery rendered as fake-but-believable UI fragments
- Asymmetric grids (e.g. 5/12 + 7/12 with internal nesting)
- Typography as art direction (oversized headlines, mixed case, editorial pull-quotes)
- Distinct color palette (e.g. cream + charcoal + emerald, not white + indigo)
- Subtle physical materials (paper texture, soft shadows, frosted glass — used sparingly)
- Numbers as content (use real metrics in display weights)
