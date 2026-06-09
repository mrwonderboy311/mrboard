# Vercel-Style UI Redesign Design

**Date:** 2026-06-06
**Status:** Design approved

## Overview

Global UI upgrade for mrboard K8s management platform. Apply Vercel-style modern design across all pages via CSS variables and component style changes. No new dependencies. Follows system dark/light mode preference.

## Design Decisions

| Dimension | Choice |
|-----------|--------|
| Scope | All pages, global component optimization |
| Style | Vercel-style modern (black/white primary, refined shadows, subtle gradients) |
| Dark mode | Follow system preference, auto-switch via prefers-color-scheme |
| Motion | Rich (transitions, hover micro-animations, stagger fade-in, shimmer skeletons, physics feedback) |

## 1. Color System

### Light Mode
```css
--background: #fafafa        /* micro-gray white, not pure white */
--foreground: #0a0a0a        /* near-black */
--primary: #0070f3           /* Vercel blue */
--primary-foreground: #ffffff
--card: #ffffff              /* pure white with subtle shadow */
--border: #eaeaea            /* very light gray */
--muted: #f5f5f5
--muted-foreground: #666666
--destructive: #ee0000
--success: #0070f3
--warning: #f5a623
--ring: rgba(0, 112, 243, 0.2)
```

### Dark Mode
```css
--background: #0a0a0a
--foreground: #ededed
--primary: #3291ff           /* lighter blue */
--primary-foreground: #0a0a0a
--card: #111111
--border: #333333
--muted: #1a1a1a
--muted-foreground: #888888
--destructive: #ff4444
--ring: rgba(50, 145, 255, 0.3)
```

**Key principle:** All grays have a subtle blue tint (not pure gray) for tech feel.

## 2. Typography

- **Font:** Geist Variable (already installed, Vercel's official font)
- **Headings:** `font-bold tracking-tight`
- **Body:** `font-normal text-sm leading-relaxed`
- **Helper:** `text-xs text-muted-foreground`
- **Numbers:** `font-mono tabular-nums` for aligned numeric data

## 3. Spacing System

| Element | Value |
|---------|-------|
| Page padding | `p-6 lg:p-8` |
| Card gap | `gap-4` (16px) |
| Card padding | `p-5` (20px) |
| Compact card | `p-3.5` (14px) |
| List row | `py-3` (12px vertical) |

## 4. Shadows (Vercel-style micro-shadows)

| State | Shadow |
|-------|--------|
| Card default | `shadow-[0_2px_8px_rgba(0,0,0,0.04)]` |
| Card hover | `shadow-[0_4px_16px_rgba(0,0,0,0.08)]` |
| Popup/dropdown | `shadow-[0_8px_30px_rgba(0,0,0,0.12)]` |

**Key:** No visible borders on cards. Use shadows for separation instead of `border`.

## 5. Component Styles

### Card
- Rounded `rounded-xl`, white bg + micro-shadow (no border)
- Hover: shadow deepens + micro-lift `translate-y-[-1px]`
- Clickable cards: add `cursor-pointer`

### Button
- Primary: `bg-[#0070f3] text-white rounded-lg`, hover darkens
- Secondary: white bg + gray border, hover gray bg
- Ghost: no border, hover gray bg
- All buttons: `active:scale-[0.98]` physics press feedback

### Table
- No outer border, rows separated by `border-b border-[#eaeaea]`
- Header: `text-xs font-semibold text-muted-foreground uppercase tracking-wider`
- Row hover: `bg-[#fafafa]`

### Badge
- `rounded-full`, small text `text-[11px]`
- Status colors: blue=success, orange=warning, red=error, gray=info
- `font-medium` not `font-bold`

### Input
- `rounded-lg`, light gray border
- Focus: blue ring `ring-2 ring-[#0070f3]/20 border-[#0070f3]`
- Placeholder: `text-muted-foreground/50`

## 6. Animation & Micro-interactions

### Entry Animations (CSS only, no new library)
```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```
- Card entry: `animate-[fadeInUp_0.3s_ease-out]`
- List stagger: `animation-delay: calc(var(--index) * 50ms)`

### Hover Micro-interactions
- Card: `transition-all duration-200` + shadow deepen + `translate-y-[-1px]`
- Button: `transition-colors duration-150` + `active:scale-[0.98]`
- Link: `transition-colors duration-150`

### Skeleton Shimmer
```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```
- Loading state: shimmer skeleton, not spinner
- Button loading: `animate-spin` icon + disabled state

### Reduced Motion
- `@media (prefers-reduced-motion: reduce)` disables all animations

## 7. Files to Modify

| File | Changes |
|------|---------|
| `src/index.css` | Full color system rewrite, add animations, shimmer keyframes |
| `src/components/ui/card.tsx` | Shadow-based styling, hover effects |
| `src/components/ui/button.tsx` | Vercel-style buttons with physics feedback |
| `src/components/ui/table.tsx` | Borderless table with shadow separation |
| `src/components/ui/badge.tsx` | Pill badges with status colors |
| `src/components/ui/input.tsx` | Focus ring, placeholder styling |
| `src/components/ui/tabs.tsx` | Underline-style active tab |
| `src/pages/HomePage.tsx` | Card shadows, stagger animation |
| `src/layouts/MainLayout.tsx` | Already updated, verify consistency |

## 8. Testing

- Visual regression: compare before/after screenshots of key pages
- Dark mode: verify all components render correctly in both modes
- Accessibility: ensure contrast ratios meet WCAG AA
- Reduced motion: verify animations disabled when preference set
- Mobile: verify responsive behavior unchanged
