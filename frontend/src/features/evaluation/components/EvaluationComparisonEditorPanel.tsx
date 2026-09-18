import type React from 'react';
import { FileText } from 'lucide-react';
import { COLORS } from '@/lib/theme';
import { RADII, SHADOWS, TYPOGRAPHY } from '@/shared/theme';

type EvaluationComparisonEditorPanelProps = {
  previousValue: string;
  currentValue: string;
  onPreviousChange: (value: string) => void;
  onCurrentChange: (value: string) => void;
  onCopyPreviousToCurrent: () => void;
  onClearCurrent: () => void;
};

export function EvaluationComparisonEditorPanel({
  previousValue,
  currentValue,
  onPreviousChange,
  onCurrentChange,
}: EvaluationComparisonEditorPanelProps) {
  const previousWords = previousValue.trim() ? previousValue.trim().split(/\s+/).length : 0;
  const currentWords = currentValue.trim() ? currentValue.trim().split(/\s+/).length : 0;
  const previousChars = previousValue.length;
  const currentChars = currentValue.length;

  return (
    <section style={panelStyle}>
      <div style={sectionHeaderStyle}>
        <div>
          <div style={eyebrowStyle}>Evaluation Compare</div>
          <h2 style={sectionTitleStyle}>Previous Evaluation vs This Evaluation</h2>
          <p style={descriptionStyle}>
            Viết song song để đối chiếu điểm mạnh, khoảng trống và quyết định hướng phản hồi cho kỳ này.
          </p>
        </div>

        <div style={statsRowStyle}>
          <div style={statPillStyle}>
            <span style={statLabelStyle}>Previous</span>
            <strong style={statValueStyle}>{previousChars} chars</strong>
            <span style={statSubStyle}>{previousWords} words</span>
          </div>
          <div style={statPillStyle}>
            <span style={statLabelStyle}>This</span>
            <strong style={statValueStyle}>{currentChars} chars</strong>
            <span style={statSubStyle}>{currentWords} words</span>
          </div>
        </div>
      </div>

      <div style={gridStyle}>
        <div style={{ ...editorCardStyle, borderColor: '#c7d2fe', background: 'linear-gradient(180deg, #ffffff 0%, #eef2ff 100%)' }}>
          <div style={editorHeaderStyle}>
            <div>
              <div style={editorLabelStyle}>Previous Evaluation</div>
              <div style={editorHintStyle}>Dùng để ghi lại nhận định, kết luận hoặc nội dung tham chiếu của kỳ trước.</div>
            </div>
            <FileText size={16} color="#4f46e5" />
          </div>
          <textarea
            value={previousValue}
            onChange={(event) => onPreviousChange(event.target.value)}
            placeholder="Paste or write the previous evaluation here..."
            style={textareaStyle}
          />
        </div>

        <div style={{ ...editorCardStyle, borderColor: '#bbf7d0', background: 'linear-gradient(180deg, #ffffff 0%, #ecfdf5 100%)' }}>
          <div style={editorHeaderStyle}>
            <div>
              <div style={editorLabelStyle}>This Evaluation</div>
              <div style={editorHintStyle}>Soạn bản hiện tại, so sánh trực tiếp với cột bên trái để phát hiện thay đổi nhanh hơn.</div>
            </div>
            <FileText size={16} color="#059669" />
          </div>
          <textarea
            value={currentValue}
            onChange={(event) => onCurrentChange(event.target.value)}
            placeholder="Write the current evaluation here..."
            style={textareaStyle}
          />
        </div>
      </div>
    </section>
  );
}

const panelStyle: React.CSSProperties = {
  background: COLORS.neutral.white,
  border: `1px solid ${COLORS.neutral[200]}`,
  borderRadius: RADII['2xl'],
  boxShadow: SHADOWS.card,
  padding: '22px',
};

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '16px',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: TYPOGRAPHY.fontSize.xs,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: COLORS.primary.DEFAULT,
  fontWeight: TYPOGRAPHY.fontWeight.semibold,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: '8px 0 8px',
  fontSize: TYPOGRAPHY.fontSize['2xl'],
  fontWeight: TYPOGRAPHY.fontWeight.bold,
};

const descriptionStyle: React.CSSProperties = {
  margin: 0,
  maxWidth: '760px',
  color: COLORS.neutral.textSecondary,
  fontSize: TYPOGRAPHY.fontSize.sm,
  lineHeight: 1.6,
};

const statsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
};

const statPillStyle: React.CSSProperties = {
  minWidth: '120px',
  padding: '12px 14px',
  borderRadius: RADII.xl,
  border: `1px solid ${COLORS.neutral[200]}`,
  background: COLORS.neutral[50],
  display: 'grid',
  gap: '2px',
};

const statLabelStyle: React.CSSProperties = {
  fontSize: TYPOGRAPHY.fontSize.xs,
  color: COLORS.neutral.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const statValueStyle: React.CSSProperties = {
  fontSize: TYPOGRAPHY.fontSize.lg,
  color: COLORS.neutral.textPrimary,
};

const statSubStyle: React.CSSProperties = {
  fontSize: TYPOGRAPHY.fontSize.xs,
  color: COLORS.neutral.textSecondary,
};

const gridStyle: React.CSSProperties = {
  marginTop: '18px',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: '16px',
};

const editorCardStyle: React.CSSProperties = {
  borderRadius: RADII['2xl'],
  border: '1px solid',
  padding: '16px',
  boxShadow: '0 10px 24px rgba(15,23,42,0.06)',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const editorHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  alignItems: 'flex-start',
};

const editorLabelStyle: React.CSSProperties = {
  fontSize: TYPOGRAPHY.fontSize.lg,
  fontWeight: TYPOGRAPHY.fontWeight.bold,
  color: COLORS.neutral.textPrimary,
};

const editorHintStyle: React.CSSProperties = {
  marginTop: '4px',
  fontSize: TYPOGRAPHY.fontSize.xs,
  color: COLORS.neutral.textSecondary,
  lineHeight: 1.5,
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '280px',
  resize: 'vertical',
  borderRadius: RADII.xl,
  border: `1px solid ${COLORS.neutral[200]}`,
  padding: '14px',
  background: COLORS.neutral.white,
  color: COLORS.neutral.textPrimary,
  fontSize: TYPOGRAPHY.fontSize.sm,
  lineHeight: 1.7,
  fontFamily: TYPOGRAPHY.fontFamily.body,
  boxSizing: 'border-box',
  outline: 'none',
};
