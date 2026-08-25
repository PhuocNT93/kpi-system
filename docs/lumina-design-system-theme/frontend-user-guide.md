# Lumina HR Design System & Theme Frontend User Guide

## Overview
This document guides developers on how to use the Lumina HR Theme tokens (`COLORS`, `TYPOGRAPHY`, `RADII`, `SHADOWS`) and UI component primitives in the Employee Performance Evaluation Management System.

## Theme Tokens Usage

Always import colors from `@/lib/theme` or `@/shared/theme`:
```tsx
import { COLORS } from '@/lib/theme';
import { TYPOGRAPHY, RADII, SHADOWS } from '@/shared/theme';
```

### Color Palettes
- **Primary:** `COLORS.primary.DEFAULT` (`#7C3AED`) and shades 50 to 900.
- **Secondary:** `COLORS.secondary.DEFAULT` (`#2563EB`) and shades 50 to 900.
- **Tertiary:** `COLORS.tertiary.DEFAULT` (`#0F172A`) and shades 50 to 950.
- **Neutral:** `COLORS.neutral.DEFAULT` (`#F8F9FC`), `COLORS.neutral.white` (`#FFFFFF`), `COLORS.neutral.border` (`#E2E8F0`), etc.
- **Semantic:** `COLORS.semantic.danger` (`#DC2626`), `COLORS.semantic.success` (`#16A34A`), `COLORS.semantic.warning` (`#D97706`), `COLORS.semantic.info` (`#2563EB`).

### Strict Rule
- **Do not hardcode hex colors** in component styles or inline styles. Always reference `COLORS.*`.

## Reusable UI Components

### 1. Button
```tsx
import { Button } from '@/shared/ui';

<Button variant="primary">Primary Button</Button>
<Button variant="secondary">Secondary Button</Button>
<Button variant="inverted">Inverted Button</Button>
<Button variant="outlined">Outlined Button</Button>
```

### 2. SearchInput
```tsx
import { SearchInput } from '@/shared/ui';

<SearchInput
  placeholder="Search employees, templates..."
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  onSearch={(val) => handleSearch(val)}
/>
```

### 3. ProgressBar
```tsx
import { ProgressBar } from '@/shared/ui';

<ProgressBar variant="primary" value={75} />
<ProgressBar variant="secondary" value={60} />
<ProgressBar variant="tertiary" value={40} />
```

### 4. Badge / Label
```tsx
import { Badge } from '@/shared/ui';

<Badge variant="primary" icon={<EditIcon />}>Label</Badge>
```

### 5. IconButton
```tsx
import { IconButton } from '@/shared/ui';

<IconButton shape="square" colorVariant="tertiary" icon={<PencilIcon />} aria-label="Edit" />
<IconButton shape="circle" colorVariant="primary" icon={<WandIcon />} aria-label="Action" />
<IconButton shape="circle" colorVariant="danger" icon={<TrashIcon />} aria-label="Delete" />
```

### 6. NavDock
```tsx
import { NavDock } from '@/shared/ui';

<NavDock activeId={currentTab} onChange={(id) => setCurrentTab(id)} />
```

## Running Locally
To preview the design system:
```bash
npm --prefix frontend run dev
```
Open [http://localhost:4001](http://localhost:4001) or [http://localhost:5173](http://localhost:5173).
