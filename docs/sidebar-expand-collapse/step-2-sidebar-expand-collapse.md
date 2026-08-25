# Step 2: Investigate

Status: produced during this step

## Objective
Điều tra mã nguồn `Sidebar.tsx`, `AppLayout.tsx` và hệ thống token thiết kế.

## Inputs Reviewed
- `frontend/src/shared/layout/Sidebar.tsx`
- `frontend/src/shared/layout/AppLayout.tsx`
- `frontend/src/shared/theme/colors.ts`
- `frontend/src/shared/theme/typography.ts`

## Actions and Evidence
- Rà soát các thông số:
  - Width: 280px (Expanded), 72px (Collapsed).
  - Logo max-height: 36px.
  - Icon container: 32x32px.
  - Toggle button: 28x28px.
  - Màu sắc: `COLORS.primary`, `COLORS.neutral` (không hardcode mã màu hex).

## Changes Made
- Không có code changes.

## Decisions and Rationale
- Tái sử dụng các icon chuẩn từ `lucide-react` (`ChevronLeft`, `ChevronRight`).

## Risks / Blockers
- None.

## Next Step
- Step 3: Impact Analysis.
