import { useState } from 'react';
import { LayoutTemplate } from 'lucide-react';
import { AppLayout } from '@/shared/layout';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';

export function App() {
  const [activeMenu, setActiveMenu] = useState('evaluation-config');

  return (
    <AppLayout
      activeMenuItem={activeMenu}
      onSelectMenuItem={(id) => setActiveMenu(id)}
      pageTitle="Configure Evaluation"
      onGenerateReport={() => alert('Generate Report clicked')}
      footerProps={{
        // Chỗ để import các nút cho các UI sau (leftActions / rightActions / actions)
      }}
    >
      {/* Content Slot Placeholder */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: COLORS.neutral.white,
          borderRadius: RADII['2xl'],
          border: `1.5px dashed ${COLORS.primary[200]}`,
          padding: '48px 24px',
          boxSizing: 'border-box',
          gap: '16px'
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: RADII.xl,
            backgroundColor: COLORS.primary[50],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: COLORS.primary.DEFAULT
          }}
        >
          <LayoutTemplate size={24} />
        </div>

        <div style={{ textAlign: 'center' }}>
          <h2
            style={{
              margin: '0 0 8px 0',
              fontFamily: TYPOGRAPHY.fontFamily.headline,
              fontSize: TYPOGRAPHY.fontSize.xl,
              fontWeight: TYPOGRAPHY.fontWeight.bold,
              color: COLORS.neutral.textPrimary
            }}
          >
            Main Content Slot (Draft Ready)
          </h2>
          <p
            style={{
              margin: 0,
              fontFamily: TYPOGRAPHY.fontFamily.body,
              fontSize: TYPOGRAPHY.fontSize.sm,
              color: COLORS.neutral.textSecondary,
              maxWidth: '480px',
              lineHeight: TYPOGRAPHY.lineHeight.relaxed
            }}
          >
            Khung layout (Sidebar Menu Tree, Header, Bottom Action Bar) đã sẵn sàng.
            Phần nội dung (Stepper cấu hình tiêu chí & trọng số KPI) sẽ được cắm vào khu vực này ở bước tiếp theo.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}

export default App;
