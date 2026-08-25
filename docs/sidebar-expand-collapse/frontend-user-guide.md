# Frontend User Guide - Sidebar Component (Expanded & Collapsed)

## 1. Overview
Component `Sidebar` trong `@/shared/layout` cung cấp thanh điều hướng chính cho hệ thống với khả năng Mở rộng (Expanded - 280px) và Thu gọn (Collapsed - 72px) mượt mà, chuẩn SaaS.

## 2. Component Props

### `SidebarProps`
- `activeItemId?: string`: ID mục đang được chọn (`'dashboard' | 'employees' | 'evaluation-config'`).
- `collapsed?: boolean`: Điều khiển trạng thái thu gọn từ component cha (Controlled).
- `defaultCollapsed?: boolean`: Trạng thái thu gọn ban đầu khi dùng state nội bộ (Uncontrolled, mặc định `false`).
- `onToggleCollapse?: (collapsed: boolean) => void`: Callback khi người dùng chuyển đổi trạng thái thu gọn/mở rộng.
- `onSelectItem?: (id: string) => void`: Callback khi người dùng click vào một mục menu.
- `onGenerateReport?: () => void`: Callback khi người dùng click nút "+ Generate Report".

### `AppLayoutProps`
- `sidebarCollapsed?: boolean`: Chuyển tiếp prop `collapsed` xuống `Sidebar`.
- `defaultSidebarCollapsed?: boolean`: Chuyển tiếp prop `defaultCollapsed` xuống `Sidebar`.
- `onToggleSidebarCollapse?: (collapsed: boolean) => void`: Chuyển tiếp callback toggle.

## 3. Code Examples

```tsx
import { AppLayout } from '@/shared/layout';

export function ExamplePage() {
  return (
    <AppLayout
      activeMenuItem="evaluation-config"
      pageTitle="Configure Evaluation"
      onGenerateReport={() => console.log('Generate report')}
    >
      <div>Content here</div>
    </AppLayout>
  );
}
```

## 4. Visual & Interaction Behaviors
1. **Nút Toggle:** Nút `<` ở góc phải header để thu gọn; nút `>` ở giữa header khi thu gọn để mở rộng.
2. **Hover Tooltip:** Khi thu gọn, hover vào icon bất kỳ sẽ hiển thị tên menu.
3. **Cân đối thị giác:** Logo (36px) và icon (32x32px) căn thẳng hàng với khoảng cách hài hòa.
