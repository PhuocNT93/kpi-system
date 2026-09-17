import { Pool } from 'pg';
import { NotificationType } from '../../domain/notification.types.js';

export interface SeedTemplateDefinition {
  code: NotificationType;
  enSubject: string;
  enBody: string;
  viSubject: string;
  viBody: string;
}

interface EmailTemplateOptions {
  locale: 'en' | 'vi';
  headerBadge: string;
  badgeColor?: string;
  title: string;
  subtitle: string;
  greeting: string;
  leadMessage: string;
  tableTitle: string;
  tableRows: Array<{ label: string; value: string }>;
  ctaText: string;
  ctaLink: string;
  importantNote?: string;
}

function buildEmailHtml(opts: EmailTemplateOptions): string {
  const isVi = opts.locale === 'vi';
  const badgeBg = opts.badgeColor ?? '#2563eb';
  const systemName = isVi ? 'HỆ THỐNG ĐÁNH GIÁ HIỆU SUẤT' : 'EMPLOYEE PERFORMANCE SYSTEM';
  const securityHeader = isVi ? 'Lưu ý bảo mật (Rule 16)' : 'Security & Privacy Policy (Rule 16)';
  const securityNotice = isVi
    ? 'Để đảm bảo tính bảo mật và quyền riêng tư theo quy định, chi tiết điểm số, xếp loại và nhận xét đánh giá không được gửi qua email. Vui lòng đăng nhập cổng thông tin an toàn để tra cứu.'
    : 'To protect employee confidentiality and internal policy compliance, detailed ratings, score calculations, and evaluator feedback are never transmitted via email. Please sign in to the portal to view full records.';
  const autoNotice = isVi
    ? 'Đây là email tự động từ Hệ thống Đánh giá Hiệu suất Nhân viên. Vui lòng không trả lời trực tiếp email này.'
    : 'This is an automated system notification from the Employee Performance Evaluation System. Please do not reply directly to this email.';
  const copyright = isVi
    ? '© 2026 Hệ thống Đánh giá Hiệu suất KPI. Bảo lưu mọi quyền.'
    : '© 2026 Employee Performance Evaluation System. All rights reserved.';

  const tableRowsHtml = opts.tableRows
    .map(
      (row, idx) => `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #475569; width: 38%; border-bottom: 1px solid #e2e8f0; vertical-align: top;">
            ${row.label}
          </td>
          <td style="padding: 12px 16px; font-size: 13px; color: #0f172a; border-bottom: 1px solid #e2e8f0; font-weight: 500;">
            ${row.value}
          </td>
        </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="${opts.locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${opts.title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; line-height: 1.6; color: #334155;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container (max 600px) -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          
          <!-- Top Accent Gradient Line -->
          <tr>
            <td style="height: 5px; background: linear-gradient(90deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Header Section -->
          <tr>
            <td style="padding: 24px 32px 16px 32px; background-color: #ffffff; border-bottom: 1px solid #f1f5f9;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; color: #64748b; text-transform: uppercase;">
                      ${systemName}
                    </span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; color: #ffffff; background-color: ${badgeBg};">
                      ${opts.headerBadge}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 28px 32px 24px 32px;">
              <!-- Title & Subtitle -->
              <h1 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                ${opts.title}
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 13px; color: #64748b;">
                ${opts.subtitle}
              </p>

              <!-- Greeting & Lead -->
              <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #1e293b;">
                ${opts.greeting}
              </p>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #334155; line-height: 1.6;">
                ${opts.leadMessage}
              </p>

              <!-- Data Table Card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0 24px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; border-collapse: separate; border-spacing: 0;">
                <thead>
                  <tr style="background-color: #0f172a;">
                    <th colspan="2" style="padding: 10px 16px; font-size: 12px; font-weight: 600; text-align: left; color: #f8fafc; text-transform: uppercase; letter-spacing: 0.05em;">
                      ${opts.tableTitle}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRowsHtml}
                </tbody>
              </table>

              ${
                opts.importantNote
                  ? `<div style="margin: 0 0 24px 0; padding: 12px 16px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px;">
                      <p style="margin: 0; font-size: 13px; color: #92400e; font-weight: 500;">
                        ${opts.importantNote}
                      </p>
                    </div>`
                  : ''
              }

              <!-- Action CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0 16px 0;">
                <tr>
                  <td align="center">
                    <a href="${opts.ctaLink}" target="_blank" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 8px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2); text-align: center;">
                      ${opts.ctaText} &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Policy Notice -->
              <div style="margin-top: 24px; padding: 14px 16px; background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px;">
                <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #475569;">
                  🔒 ${securityHeader}
                </p>
                <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                  ${securityNotice}
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer Section -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                ${autoNotice}
              </p>
              <p style="margin: 0; font-size: 11px; font-weight: 500; color: #64748b;">
                ${copyright}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const SEED_TEMPLATES: SeedTemplateDefinition[] = [
  // 1. CYCLE_OPENED
  {
    code: NotificationType.CYCLE_OPENED,
    enSubject: '[Action Required] Evaluation Cycle {{cycle_name}} has started',
    enBody: buildEmailHtml({
      locale: 'en',
      headerBadge: 'Cycle Opened',
      badgeColor: '#2563eb',
      title: 'Performance Evaluation Cycle Started',
      subtitle: 'The official performance review period is now open.',
      greeting: 'Dear {{employee_name}},',
      leadMessage:
        'The performance evaluation cycle <strong>{{cycle_name}}</strong> has officially opened. You are invited to complete your self-assessment form before the specified deadline.',
      tableTitle: 'Cycle Details & Timelines',
      tableRows: [
        { label: 'Evaluation Cycle', value: '{{cycle_name}}' },
        { label: 'Participant', value: '{{employee_name}}' },
        { label: 'Self-Assessment Deadline', value: '{{deadline}}' },
        { label: 'Required Action', value: 'Submit self-assessment form in portal' },
      ],
      importantNote: '⚠️ Please submit on time to ensure your manager has sufficient window to evaluate your achievements.',
      ctaText: 'Start Self-Assessment',
      ctaLink: '{{link}}',
    }),
    viSubject: '[Cần xử lý] Kỳ đánh giá {{cycle_name}} đã chính thức bắt đầu',
    viBody: buildEmailHtml({
      locale: 'vi',
      headerBadge: 'Mở Kỳ Đánh Giá',
      badgeColor: '#2563eb',
      title: 'Kỳ Đánh Giá Hiệu Suất Đã Bắt Đầu',
      subtitle: 'Cổng tự đánh giá KPI đã chính thức mở.',
      greeting: 'Xin chào {{employee_name}},',
      leadMessage:
        'Kỳ đánh giá hiệu suất làm việc <strong>{{cycle_name}}</strong> đã chính thức khởi động. Bạn vui lòng hoàn thành và nộp bản tự đánh giá trước thời hạn quy định.',
      tableTitle: 'Thông Tin Kỳ Đánh Giá',
      tableRows: [
        { label: 'Kỳ đánh giá', value: '{{cycle_name}}' },
        { label: 'Nhân viên thực hiện', value: '{{employee_name}}' },
        { label: 'Hạn chót tự đánh giá', value: '{{deadline}}' },
        { label: 'Hành động yêu cầu', value: 'Hoàn thành phiếu tự đánh giá trên hệ thống' },
      ],
      importantNote: '⚠️ Vui lòng nộp đúng hạn để quản lý có đủ thời gian xem xét và đánh giá.',
      ctaText: 'Bắt Đầu Tự Đánh Giá',
      ctaLink: '{{link}}',
    }),
  },

  // 2. SELF_SUBMITTED
  {
    code: NotificationType.SELF_SUBMITTED,
    enSubject: '[Manager Review] Self-assessment submitted by {{employee_name}}',
    enBody: buildEmailHtml({
      locale: 'en',
      headerBadge: 'Review Required',
      badgeColor: '#7c3aed',
      title: 'Employee Self-Assessment Submitted',
      subtitle: 'An employee under your supervision has completed self-assessment.',
      greeting: 'Dear Manager,',
      leadMessage:
        '<strong>{{employee_name}}</strong> has submitted their self-assessment for cycle <strong>{{cycle_name}}</strong>. Please access the system to conduct your managerial evaluation.',
      tableTitle: 'Assessment Submission Summary',
      tableRows: [
        { label: 'Submitting Employee', value: '{{employee_name}}' },
        { label: 'Evaluation Cycle', value: '{{cycle_name}}' },
        { label: 'Submission Status', value: 'Completed & Ready for Review' },
        { label: 'Next Step', value: 'Manager evaluation and review meeting' },
      ],
      ctaText: 'Review Assessment',
      ctaLink: '{{link}}',
    }),
    viSubject: '[Quản lý Đánh giá] Nhân viên {{employee_name}} đã nộp bản tự đánh giá',
    viBody: buildEmailHtml({
      locale: 'vi',
      headerBadge: 'Cần Đánh Giá',
      badgeColor: '#7c3aed',
      title: 'Nhân Viên Đã Nộp Tự Đánh Giá',
      subtitle: 'Nhân viên trực thuộc đã hoàn thành bản tự đánh giá.',
      greeting: 'Kính gửi Quản lý,',
      leadMessage:
        'Nhân viên <strong>{{employee_name}}</strong> đã nộp bản tự đánh giá cho kỳ <strong>{{cycle_name}}</strong>. Vui lòng truy cập hệ thống để thực hiện vòng đánh giá của quản lý.',
      tableTitle: 'Tóm Tắt Đánh Giá Nhân Viên',
      tableRows: [
        { label: 'Nhân viên', value: '{{employee_name}}' },
        { label: 'Kỳ đánh giá', value: '{{cycle_name}}' },
        { label: 'Trạng thái nộp', value: 'Đã nộp & Sẵn sàng đánh giá' },
        { label: 'Bước tiếp theo', value: 'Quản lý cho điểm và thảo luận đánh giá' },
      ],
      ctaText: 'Xem và Đánh Giá Ngay',
      ctaLink: '{{link}}',
    }),
  },

  // 3. MANAGER_SUBMITTED
  {
    code: NotificationType.MANAGER_SUBMITTED,
    enSubject: 'Manager evaluation completed for {{employee_name}}',
    enBody: buildEmailHtml({
      locale: 'en',
      headerBadge: 'Manager Submitted',
      badgeColor: '#0284c7',
      title: 'Manager Evaluation Completed',
      subtitle: 'Manager assessment step has been finalized for an employee.',
      greeting: 'Dear Reviewer / HR Team,',
      leadMessage:
        'The manager evaluation for <strong>{{employee_name}}</strong> in cycle <strong>{{cycle_name}}</strong> has been submitted and is ready for committee review / calibration.',
      tableTitle: 'Evaluation Progress Details',
      tableRows: [
        { label: 'Target Employee', value: '{{employee_name}}' },
        { label: 'Evaluation Cycle', value: '{{cycle_name}}' },
        { label: 'Current Stage', value: 'Manager Evaluation Complete' },
        { label: 'Next Milestone', value: 'HR Calibration / Committee Approval' },
      ],
      ctaText: 'View Evaluation Record',
      ctaLink: '{{link}}',
    }),
    viSubject: 'Đánh giá của quản lý cho {{employee_name}} đã hoàn tất',
    viBody: buildEmailHtml({
      locale: 'vi',
      headerBadge: 'Quản Lý Đã Nộp',
      badgeColor: '#0284c7',
      title: 'Đánh Giá Của Quản Lý Đã Hoàn Tất',
      subtitle: 'Vòng đánh giá cấp quản lý đã được ghi nhận vào hệ thống.',
      greeting: 'Kính gửi Người duyệt / Phòng Nhân sự,',
      leadMessage:
        'Đánh giá của quản lý cho nhân viên <strong>{{employee_name}}</strong> trong kỳ <strong>{{cycle_name}}</strong> đã được hoàn tất và sẵn sàng cho các bước duyệt / hiệu chuẩn tiếp theo.',
      tableTitle: 'Tiến Trình Đánh Giá',
      tableRows: [
        { label: 'Nhân viên được đánh giá', value: '{{employee_name}}' },
        { label: 'Kỳ đánh giá', value: '{{cycle_name}}' },
        { label: 'Giai đoạn hiện tại', value: 'Đã hoàn tất vòng quản lý' },
        { label: 'Cột mốc tiếp theo', value: 'Hiệu chuẩn HR / Phê duyệt cấp trên' },
      ],
      ctaText: 'Xem Hồ Sơ Đánh Giá',
      ctaLink: '{{link}}',
    }),
  },

  // 4. CORRECTION_REQUESTED
  {
    code: NotificationType.CORRECTION_REQUESTED,
    enSubject: '[Action Required] Revision requested for {{employee_name}}\'s evaluation',
    enBody: buildEmailHtml({
      locale: 'en',
      headerBadge: 'Revision Requested',
      badgeColor: '#ea580c',
      title: 'Evaluation Revision Requested',
      subtitle: 'An adjustment has been requested by the review authority.',
      greeting: 'Dear Manager,',
      leadMessage:
        'A revision has been requested for <strong>{{employee_name}}</strong>\'s performance evaluation. Please review the comments and update the form accordingly.',
      tableTitle: 'Correction Request Details',
      tableRows: [
        { label: 'Target Employee', value: '{{employee_name}}' },
        { label: 'Reason for Revision', value: '{{reason}}' },
        { label: 'Current Status', value: 'Returned for Revision' },
        { label: 'Action Required', value: 'Update evaluation and re-submit' },
      ],
      importantNote: '⚠️ Please complete the adjustment promptly to avoid delaying the cycle schedule.',
      ctaText: 'Update Evaluation Form',
      ctaLink: '{{link}}',
    }),
    viSubject: '[Cần điều chỉnh] Yêu cầu chỉnh sửa đánh giá cho {{employee_name}}',
    viBody: buildEmailHtml({
      locale: 'vi',
      headerBadge: 'Yêu Cầu Sửa Đổi',
      badgeColor: '#ea580c',
      title: 'Yêu Cầu Hiệu Chỉnh Phiếu Đánh Giá',
      subtitle: 'Hội đồng duyệt / HR đã gửi yêu cầu điều chỉnh phiếu đánh giá.',
      greeting: 'Kính gửi Quản lý,',
      leadMessage:
        'Phiếu đánh giá cho nhân viên <strong>{{employee_name}}</strong> cần được hiệu chỉnh. Vui lòng kiểm tra lý do và thực hiện cập nhật lại.',
      tableTitle: 'Chi Tiết Yêu Cầu Chỉnh Sửa',
      tableRows: [
        { label: 'Nhân viên', value: '{{employee_name}}' },
        { label: 'Lý do yêu cầu', value: '{{reason}}' },
        { label: 'Trạng thái hiện tại', value: 'Đã trả về để hiệu chỉnh' },
        { label: 'Hành động cần làm', value: 'Cập nhật lại phiếu và nộp lại' },
      ],
      importantNote: '⚠️ Vui lòng hoàn thành điều chỉnh sớm để đảm bảo tiến độ chung của kỳ đánh giá.',
      ctaText: 'Cập Nhật Phiếu Đánh Giá',
      ctaLink: '{{link}}',
    }),
  },

  // 5. RESULT_PUBLISHED
  {
    code: NotificationType.RESULT_PUBLISHED,
    enSubject: 'Your performance evaluation results for {{cycle_name}} have been published',
    enBody: buildEmailHtml({
      locale: 'en',
      headerBadge: 'Official Results',
      badgeColor: '#16a34a',
      title: 'Official Performance Results Published',
      subtitle: 'Your evaluation for the cycle has been finalized and approved.',
      greeting: 'Dear {{employee_name}},',
      leadMessage:
        'Your official performance evaluation results for <strong>{{cycle_name}}</strong> have been approved by HR and are now published on the portal.',
      tableTitle: 'Published Result Overview',
      tableRows: [
        { label: 'Employee Name', value: '{{employee_name}}' },
        { label: 'Evaluation Cycle', value: '{{cycle_name}}' },
        { label: 'Publication Status', value: 'Finalized & Officially Published' },
        { label: 'Detailed Breakdown', value: 'Available securely inside the portal' },
      ],
      ctaText: 'View Official Results',
      ctaLink: '{{link}}',
    }),
    viSubject: 'Kết quả đánh giá kỳ {{cycle_name}} của bạn đã được công bố chính thức',
    viBody: buildEmailHtml({
      locale: 'vi',
      headerBadge: 'Kết Quả Chính Thức',
      badgeColor: '#16a34a',
      title: 'Kết Quả Đánh Giá Hiệu Suất Đã Công Bố',
      subtitle: 'Kết quả đánh giá KPI của bạn đã được phê duyệt và hoàn tất.',
      greeting: 'Xin chào {{employee_name}},',
      leadMessage:
        'Kết quả đánh giá hiệu suất làm việc chính thức của bạn trong kỳ <strong>{{cycle_name}}</strong> đã được phê duyệt và công bố trên hệ thống.',
      tableTitle: 'Thông Tin Kết Quả Đánh Giá',
      tableRows: [
        { label: 'Họ và tên nhân viên', value: '{{employee_name}}' },
        { label: 'Kỳ đánh giá', value: '{{cycle_name}}' },
        { label: 'Trạng thái', value: 'Đã hoàn tất & Công bố chính thức' },
        { label: 'Chi tiết điểm số', value: 'Tra cứu an toàn trực tiếp trên cổng thông tin' },
      ],
      ctaText: 'Xem Kết Quả Đánh Giá',
      ctaLink: '{{link}}',
    }),
  },

  // 6. SCORE_ADJUSTED
  {
    code: NotificationType.SCORE_ADJUSTED,
    enSubject: 'Notification: Calibration adjustment in cycle {{cycle_name}}',
    enBody: buildEmailHtml({
      locale: 'en',
      headerBadge: 'Calibration Adjustment',
      badgeColor: '#0891b2',
      title: 'Evaluation Record Adjusted After Calibration',
      subtitle: 'Your evaluation record was updated during the calibration session.',
      greeting: 'Dear {{employee_name}},',
      leadMessage:
        'Following the calibration committee review, an adjustment has been made to your evaluation record in cycle <strong>{{cycle_name}}</strong>.',
      tableTitle: 'Adjustment Notice',
      tableRows: [
        { label: 'Employee Name', value: '{{employee_name}}' },
        { label: 'Evaluation Cycle', value: '{{cycle_name}}' },
        { label: 'Update Scope', value: 'Post-calibration adjustment' },
        { label: 'Effective Date', value: 'Immediate' },
      ],
      ctaText: 'View Updated Record',
      ctaLink: '{{link}}',
    }),
    viSubject: 'Thông báo: Điều chỉnh sau phiên hiệu chuẩn kỳ {{cycle_name}}',
    viBody: buildEmailHtml({
      locale: 'vi',
      headerBadge: 'Hiệu Chuẩn Điểm',
      badgeColor: '#0891b2',
      title: 'Cập Nhật Hồ Sơ Đánh Giá Sau Hiệu Chuẩn',
      subtitle: 'Hồ sơ đánh giá của bạn có thay đổi sau phiên hiệu chuẩn điểm.',
      greeting: 'Xin chào {{employee_name}},',
      leadMessage:
        'Sau khi Hội đồng Hiệu chuẩn hoàn thành phiên làm việc, hồ sơ đánh giá của bạn trong kỳ <strong>{{cycle_name}}</strong> đã được cập nhật.',
      tableTitle: 'Thông Tin Điều Chỉnh',
      tableRows: [
        { label: 'Nhân viên', value: '{{employee_name}}' },
        { label: 'Kỳ đánh giá', value: '{{cycle_name}}' },
        { label: 'Phạm vi thay đổi', value: 'Cập nhật sau phiên hiệu chuẩn hội đồng' },
        { label: 'Hiệu lực', value: 'Áp dụng ngay' },
      ],
      ctaText: 'Xem Chi Tiết Hồ Sơ',
      ctaLink: '{{link}}',
    }),
  },

  // 7. REVIEW_DUE_REMINDER
  {
    code: NotificationType.REVIEW_DUE_REMINDER,
    enSubject: '[Reminder] Employee performance reviews approaching due date',
    enBody: buildEmailHtml({
      locale: 'en',
      headerBadge: 'Due Reminder',
      badgeColor: '#d97706',
      title: 'Approaching Review Deadlines',
      subtitle: 'Upcoming and pending evaluations require your attention.',
      greeting: 'Dear Manager / HR Administrator,',
      leadMessage:
        'There are currently <strong>{{count}}</strong> employees with upcoming or overdue performance reviews. Please take action before the submission window closes.',
      tableTitle: 'Pending Review Summary',
      tableRows: [
        { label: 'Affected Employees', value: '{{count}} employees approaching deadline' },
        { label: 'Recipient Role', value: 'People Manager / HR Admin' },
        { label: 'Priority Level', value: 'High Priority' },
        { label: 'Action Window', value: 'Review and complete pending submissions' },
      ],
      importantNote: '⚠️ Timely evaluations ensure fair and accurate performance appraisal across the organization.',
      ctaText: 'Open Review Due Dashboard',
      ctaLink: '{{link}}',
    }),
    viSubject: '[Nhắc nhở] Sắp đến hạn hoàn thành đánh giá nhân viên',
    viBody: buildEmailHtml({
      locale: 'vi',
      headerBadge: 'Nhắc Hạn Đánh Giá',
      badgeColor: '#d97706',
      title: 'Nhắc Nhở: Sắp Đến Hạn Đánh Giá Hiệu Suất',
      subtitle: 'Có các phiếu đánh giá chưa hoàn thành cần được xử lý.',
      greeting: 'Kính gửi Quản lý / Phòng Nhân sự,',
      leadMessage:
        'Hiện có <strong>{{count}}</strong> nhân viên sắp hoặc đã đến hạn nộp đánh giá. Kính đề nghị Quản lý và Nhân sự kiểm tra và hoàn tất.',
      tableTitle: 'Tóm Tắt Phiếu Đánh Giá Đến Hạn',
      tableRows: [
        { label: 'Số lượng nhân viên', value: '{{count}} nhân viên sắp đến hạn' },
        { label: 'Đối tượng thông báo', value: 'Quản lý trực tiếp / Nhân sự' },
        { label: 'Mức độ ưu tiên', value: 'Ưu tiên cao' },
        { label: 'Hành động', value: 'Hoàn tất các phiếu tự đánh giá và đánh giá quản lý' },
      ],
      importantNote: '⚠️ Hoàn thành đúng hạn giúp đảm bảo sự công bằng và tính liên tục trong kỳ đánh giá.',
      ctaText: 'Mở Bảng Theo Dõi Hạn',
      ctaLink: '{{link}}',
    }),
  },

  // 8. IMPORT_COMPLETED
  {
    code: NotificationType.IMPORT_COMPLETED,
    enSubject: 'Data Import Completed: {{filename}}',
    enBody: buildEmailHtml({
      locale: 'en',
      headerBadge: 'Data Import',
      badgeColor: '#059669',
      title: 'CSV Data Import Completed',
      subtitle: 'The automated batch import job has finished processing.',
      greeting: 'Dear System Administrator,',
      leadMessage:
        'Your data import file <strong>{{filename}}</strong> has been processed by the system. The execution summary is detailed below.',
      tableTitle: 'Import Job Summary',
      tableRows: [
        { label: 'Source File', value: '{{filename}}' },
        { label: 'Successful Records', value: '{{success_count}} rows' },
        { label: 'Failed / Error Records', value: '{{error_count}} rows' },
        { label: 'Execution Status', value: 'Completed' },
      ],
      ctaText: 'View Import History',
      ctaLink: '{{link}}',
    }),
    viSubject: 'Hoàn tất nhập dữ liệu: {{filename}}',
    viBody: buildEmailHtml({
      locale: 'vi',
      headerBadge: 'Nhập Dữ Liệu',
      badgeColor: '#059669',
      title: 'Hoàn Tất Nhập Dữ Liệu CSV',
      subtitle: 'Tiến trình nhập dữ liệu hàng loạt đã được xử lý xong.',
      greeting: 'Xin chào Quản trị viên,',
      leadMessage:
        'Tệp dữ liệu <strong>{{filename}}</strong> của bạn đã được hệ thống xử lý hoàn tất. Bảng kết quả tổng hợp chi tiết bên dưới.',
      tableTitle: 'Kết Quả Tiến Trình Nhập Dữ Liệu',
      tableRows: [
        { label: 'Tệp nguồn', value: '{{filename}}' },
        { label: 'Bản ghi thành công', value: '{{success_count}} dòng' },
        { label: 'Bản ghi lỗi', value: '{{error_count}} dòng' },
        { label: 'Trạng thái xử lý', value: 'Đã hoàn thành' },
      ],
      ctaText: 'Xem Lịch Sử Import',
      ctaLink: '{{link}}',
    }),
  },

  // 9. CYCLE_LOCKED
  {
    code: NotificationType.CYCLE_LOCKED,
    enSubject: 'Evaluation Cycle {{cycle_name}} has been locked',
    enBody: buildEmailHtml({
      locale: 'en',
      headerBadge: 'Cycle Locked',
      badgeColor: '#475569',
      title: 'Evaluation Cycle Locked & Archived',
      subtitle: 'Cycle records have been transitioned to read-only status.',
      greeting: 'Dear Administrator,',
      leadMessage:
        'The evaluation cycle <strong>{{cycle_name}}</strong> has been officially locked. All associated evaluations, scores, and review records are now frozen and read-only.',
      tableTitle: 'Archival Summary',
      tableRows: [
        { label: 'Evaluation Cycle', value: '{{cycle_name}}' },
        { label: 'Current State', value: 'Locked & Read-Only' },
        { label: 'Data Retention', value: 'Archived for compliance & audits' },
        { label: 'Editing Permission', value: 'Frozen - No further modifications' },
      ],
      ctaText: 'View Cycle Archives',
      ctaLink: '{{link}}',
    }),
    viSubject: 'Kỳ đánh giá {{cycle_name}} đã được khóa',
    viBody: buildEmailHtml({
      locale: 'vi',
      headerBadge: 'Đã Khóa Kỳ',
      badgeColor: '#475569',
      title: 'Kỳ Đánh Giá Đã Được Khóa & Lưu Trữ',
      subtitle: 'Toàn bộ hồ sơ trong kỳ đánh giá đã chuyển sang trạng thái chỉ đọc.',
      greeting: 'Xin chào Quản trị viên,',
      leadMessage:
        'Kỳ đánh giá <strong>{{cycle_name}}</strong> đã chính thức được khóa. Tất cả phiếu đánh giá, điểm số và dữ liệu liên quan hiện ở chế độ đóng băng chỉ đọc.',
      tableTitle: 'Thông Tin Khóa Kỳ Đánh Giá',
      tableRows: [
        { label: 'Kỳ đánh giá', value: '{{cycle_name}}' },
        { label: 'Trạng thái hiện tại', value: 'Đã khóa & Chỉ đọc' },
        { label: 'Lưu trữ hồ sơ', value: 'Bảo lưu cho kiểm toán và báo cáo' },
        { label: 'Quyền chỉnh sửa', value: 'Đóng băng - Không được phép sửa đổi' },
      ],
      ctaText: 'Xem Lưu Trữ Kỳ Đánh Giá',
      ctaLink: '{{link}}',
    }),
  },
];

export async function seedNotificationTemplates(pool: Pool): Promise<void> {
  for (const item of SEED_TEMPLATES) {
    // 1. Insert or get template
    const templateRes = await pool.query(
      `
      INSERT INTO notification_template (code, active)
      VALUES ($1, true)
      ON CONFLICT (code) DO UPDATE SET active = notification_template.active
      RETURNING notification_template_id
    `,
      [item.code]
    );

    const templateId = templateRes.rows[0]?.notification_template_id;
    if (!templateId) continue;

    // 2. Insert or update English translation (en default baseline)
    await pool.query(
      `
      INSERT INTO i18n_translation (entity_type, entity_id, field_name, locale, value)
      VALUES
        ('NOTIFICATION_TEMPLATE', $1, 'subject', 'en', $2),
        ('NOTIFICATION_TEMPLATE', $1, 'body_html', 'en', $3)
      ON CONFLICT ("entity_type", "entity_id", "field_name", "locale")
      DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
    `,
      [templateId, item.enSubject, item.enBody]
    );

    // 3. Insert or update Vietnamese translation (vi)
    await pool.query(
      `
      INSERT INTO i18n_translation (entity_type, entity_id, field_name, locale, value)
      VALUES
        ('NOTIFICATION_TEMPLATE', $1, 'subject', 'vi', $2),
        ('NOTIFICATION_TEMPLATE', $1, 'body_html', 'vi', $3)
      ON CONFLICT ("entity_type", "entity_id", "field_name", "locale")
      DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
    `,
      [templateId, item.viSubject, item.viBody]
    );
  }
}
