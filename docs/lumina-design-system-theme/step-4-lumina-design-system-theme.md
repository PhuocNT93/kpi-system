# Step 4: Plan

Status: reconstructed from approved response

## Objective
Detail step-by-step implementation plan for theme tokens, components, and showcase.

## Inputs Reviewed
- Design system requirements and project paths.

## Actions and Evidence
1. Configure path alias in `vite.config.ts` and `tsconfig.app.json`.
2. Define theme tokens (`COLORS`, `TYPOGRAPHY`, `RADII`, `SHADOWS`) in `src/shared/theme/` and `src/lib/theme.ts`.
3. Implement UI components: `Button`, `SearchInput`, `ProgressBar`, `Badge`, `IconButton`, `NavDock`.
4. Build Design System Showcase page.

## Decisions and Rationale
- Use pure inline styles and CSS variables mapped directly from `COLORS` to guarantee 100% adherence to theme without external heavy CSS framework dependencies.

## Risks / Blockers
- None

## Next Step
- Step 5: Define Test Cases
