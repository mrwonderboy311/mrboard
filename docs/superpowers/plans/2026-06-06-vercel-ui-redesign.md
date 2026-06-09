# Vercel-Style UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply Vercel-style modern design across all mrboard pages via CSS variables and component style changes, with rich micro-animations.

**Architecture:** Rewrite CSS custom properties for Vercel color system, update shadcn/ui component styles for shadow-based cards and physics-feedback buttons, add CSS keyframe animations for entry/shimmer effects. No new dependencies.

**Tech Stack:** React 19, shadcn/ui 4.9, Tailwind CSS 4.3, Geist Variable font

---

### Task 1: Color System & Animations (`src/index.css`)

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Replace the full CSS custom properties with Vercel color system**

Replace the entire `:root` and `.dark` blocks, and add animation keyframes after the `@layer base` block:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@import "@fontsource-variable/geist";

@custom-variant dark (&:is(.dark *));

@theme inline {
    --font-heading: var(--font-sans);
    --font-sans: 'Geist Variable', sans-serif;
    --color-sidebar-ring: var(--sidebar-ring);
    --color-sidebar-border: var(--sidebar-border);
    --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
    --color-sidebar-accent: var(--sidebar-accent);
    --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
    --color-sidebar-primary: var(--sidebar-primary);
    --color-sidebar-foreground: var(--sidebar-foreground);
    --color-sidebar: var(--sidebar);
    --color-chart-5: var(--chart-5);
    --color-chart-4: var(--chart-4);
    --color-chart-3: var(--chart-3);
    --color-chart-2: var(--chart-2);
    --color-chart-1: var(--chart-1);
    --color-ring: var(--ring);
    --color-input: var(--input);
    --color-border: var(--border);
    --color-destructive: var(--destructive);
    --color-accent-foreground: var(--accent-foreground);
    --color-accent: var(--accent);
    --color-muted-foreground: var(--muted-foreground);
    --color-muted: var(--muted);
    --color-secondary-foreground: var(--secondary-foreground);
    --color-secondary: var(--secondary);
    --color-primary-foreground: var(--primary-foreground);
    --color-primary: var(--primary);
    --color-popover-foreground: var(--popover-foreground);
    --color-popover: var(--popover);
    --color-card-foreground: var(--card-foreground);
    --color-card: var(--card);
    --color-foreground: var(--foreground);
    --color-background: var(--background);
    --radius-sm: calc(var(--radius) * 0.6);
    --radius-md: calc(var(--radius) * 0.8);
    --radius-lg: var(--radius);
    --radius-xl: calc(var(--radius) * 1.4);
    --radius-2xl: calc(var(--radius) * 1.8);
    --radius-3xl: calc(var(--radius) * 2.2);
    --radius-4xl: calc(var(--radius) * 2.6);
}

:root {
    --background: #fafafa;
    --foreground: #0a0a0a;
    --card: #ffffff;
    --card-foreground: #0a0a0a;
    --popover: #ffffff;
    --popover-foreground: #0a0a0a;
    --primary: #0070f3;
    --primary-foreground: #ffffff;
    --secondary: #f5f5f5;
    --secondary-foreground: #0a0a0a;
    --muted: #f5f5f5;
    --muted-foreground: #666666;
    --accent: #f5f5f5;
    --accent-foreground: #0a0a0a;
    --destructive: #ee0000;
    --border: #eaeaea;
    --input: #eaeaea;
    --ring: rgba(0, 112, 243, 0.2);
    --chart-1: #0070f3;
    --chart-2: #0ea5e9;
    --chart-3: #8b5cf6;
    --chart-4: #f59e0b;
    --chart-5: #ef4444;
    --radius: 0.625rem;
    --sidebar: #0a0a0a;
    --sidebar-foreground: #ededed;
    --sidebar-primary: #3291ff;
    --sidebar-primary-foreground: #0a0a0a;
    --sidebar-accent: #1a1a1a;
    --sidebar-accent-foreground: #ededed;
    --sidebar-border: #333333;
    --sidebar-ring: rgba(50, 145, 255, 0.3);
}

.dark {
    --background: #0a0a0a;
    --foreground: #ededed;
    --card: #111111;
    --card-foreground: #ededed;
    --popover: #111111;
    --popover-foreground: #ededed;
    --primary: #3291ff;
    --primary-foreground: #0a0a0a;
    --secondary: #1a1a1a;
    --secondary-foreground: #ededed;
    --muted: #1a1a1a;
    --muted-foreground: #888888;
    --accent: #1a1a1a;
    --accent-foreground: #ededed;
    --destructive: #ff4444;
    --border: #333333;
    --input: #333333;
    --ring: rgba(50, 145, 255, 0.3);
    --chart-1: #3291ff;
    --chart-2: #38bdf8;
    --chart-3: #a78bfa;
    --chart-4: #fbbf24;
    --chart-5: #f87171;
    --sidebar: #0a0a0a;
    --sidebar-foreground: #ededed;
    --sidebar-primary: #3291ff;
    --sidebar-primary-foreground: #0a0a0a;
    --sidebar-accent: #1a1a1a;
    --sidebar-accent-foreground: #ededed;
    --sidebar-border: #333333;
    --sidebar-ring: rgba(50, 145, 255, 0.3);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground antialiased;
  }
  html {
    @apply font-sans;
  }
}

/* Vercel-style micro-shadows */
:root {
  --shadow-card: 0 2px 8px rgba(0, 0, 0, 0.04);
  --shadow-card-hover: 0 4px 16px rgba(0, 0, 0, 0.08);
  --shadow-popup: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.dark {
  --shadow-card: 0 2px 8px rgba(0, 0, 0, 0.2);
  --shadow-card-hover: 0 4px 16px rgba(0, 0, 0, 0.3);
  --shadow-popup: 0 8px 30px rgba(0, 0, 0, 0.4);
}

/* Entry animation */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Skeleton shimmer */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /root/mrboard/frontend && npx tsc --noEmit 2>&1`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add frontend/src/index.css
git commit -m "style: Vercel color system with micro-shadows and animations"
```

---

### Task 2: Card Component (`src/components/ui/card.tsx`)

**Files:**
- Modify: `frontend/src/components/ui/card.tsx`

- [ ] **Step 1: Update Card to use shadow-based styling with hover effects**

Replace the entire file:

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-4 overflow-hidden rounded-xl bg-card text-card-foreground shadow-[var(--shadow-card)] transition-all duration-200 has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        "hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-[1px]",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-5 py-4 group-data-[size=sm]/card:px-3.5 group-data-[size=sm]/card:py-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-semibold tracking-tight group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground leading-relaxed", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-5 group-data-[size=sm]/card:px-3.5", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl border-t bg-muted/30 p-5 group-data-[size=sm]/card:p-3.5",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /root/mrboard/frontend && npx tsc --noEmit 2>&1`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/card.tsx
git commit -m "style: shadow-based cards with hover lift effect"
```

---

### Task 3: Button Component (`src/components/ui/button.tsx`)

**Files:**
- Modify: `frontend/src/components/ui/button.tsx`

- [ ] **Step 1: Update Button variants with Vercel styling and physics feedback**

Replace the `buttonVariants` definition:

```tsx
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all duration-150 outline-none select-none active:scale-[0.98] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground dark:border-input dark:bg-transparent dark:hover:bg-input/30",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-muted hover:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3 text-[0.8rem] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-2 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-md",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /root/mrboard/frontend && npx tsc --noEmit 2>&1`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/button.tsx
git commit -m "style: Vercel-style buttons with physics feedback"
```

---

### Task 4: Table Component (`src/components/ui/table.tsx`)

**Files:**
- Modify: `frontend/src/components/ui/table.tsx`

- [ ] **Step 1: Update Table with borderless shadow-separated rows**

Replace the entire file:

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b [&_tr]:border-border", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t border-border bg-muted/30 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border transition-colors hover:bg-muted/40 data-[state=selected]:bg-muted/60",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-2 text-left align-middle text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2.5 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /root/mrboard/frontend && npx tsc --noEmit 2>&1`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/table.tsx
git commit -m "style: borderless table with refined header typography"
```

---

### Task 5: Badge Component (`src/components/ui/badge.tsx`)

**Files:**
- Modify: `frontend/src/components/ui/badge.tsx`

- [ ] **Step 1: Update Badge with pill shape and refined sizing**

Replace the `badgeVariants` definition:

```tsx
const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-[11px] font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary:
          "bg-secondary text-secondary-foreground",
        destructive:
          "bg-destructive/10 text-destructive dark:bg-destructive/20",
        outline:
          "border-border text-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /root/mrboard/frontend && npx tsc --noEmit 2>&1`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/badge.tsx
git commit -m "style: pill badges with refined typography"
```

---

### Task 6: Input Component (`src/components/ui/input.tsx`)

**Files:**
- Modify: `frontend/src/components/ui/input.tsx`

- [ ] **Step 1: Update Input with Vercel-style focus ring**

Replace the entire file:

```tsx
import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1 text-base transition-all outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /root/mrboard/frontend && npx tsc --noEmit 2>&1`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/input.tsx
git commit -m "style: Vercel-style input with blue focus ring"
```

---

### Task 7: Tabs Component (`src/components/ui/tabs.tsx`)

**Files:**
- Modify: `frontend/src/components/ui/tabs.tsx`

- [ ] **Step 1: Update TabsList default variant with cleaner styling**

Replace the `tabsListVariants` definition:

```tsx
const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-9 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted/50",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /root/mrboard/frontend && npx tsc --noEmit 2>&1`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/tabs.tsx
git commit -m "style: refined tabs with lighter background"
```

---

### Task 8: Build & Deploy

- [ ] **Step 1: Build frontend image**

Run: `cd /root/mrboard/frontend && nerdctl build -t xkube-frontend:latest -f Dockerfile . 2>&1 | tail -3`

- [ ] **Step 2: Restart deployment**

Run: `kubectl rollout restart deployment/xkube-frontend -n mrboard && kubectl rollout status deployment/xkube-frontend -n mrboard --timeout=120s`

- [ ] **Step 3: Verify deployment**

Run: `kubectl get pods -n mrboard -l app=xkube-frontend`
Expected: 1/1 Running

- [ ] **Step 4: Commit all changes**

```bash
git add -A
git commit -m "style: Vercel-style UI redesign complete"
```
