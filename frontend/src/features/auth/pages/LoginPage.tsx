import { useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../../shared/auth/auth-context';
import { ApiClientError } from '../../../shared/api/api-client';
import './LoginPage.css';

const loginSchema = z.object({
  email: z.string().min(1, 'Email, tên đăng nhập hoặc mã NV là bắt buộc'),
  password: z.string().min(1, 'Mật khẩu là bắt buộc'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    try {
      await login(email, password);
      let target = from;
      if (from === '/' || from === '/admin/iam') {
        const storedUser = localStorage.getItem('kpi_auth_user');
        try {
          const u = storedUser ? JSON.parse(storedUser) : null;
          if (u?.role === 'EMPLOYEE') {
            target = '/admin/my-evaluations';
          } else if (u?.role === 'MANAGER') {
            target = '/admin/team-evaluations';
          } else {
            target = '/admin/iam';
          }
        } catch {
          target = '/admin/my-evaluations';
        }
      }
      navigate(target, { replace: true });
    } catch (err) {
      if (err instanceof ApiClientError && err.statusCode === 401) {
        setError('root', { message: err.message || 'Tài khoản hoặc mật khẩu không chính xác.' });
      } else {
        setError('root', { message: 'Không thể kết nối đến máy chủ hoặc đã xảy ra lỗi. Vui lòng thử lại.' });
      }
    }
  });

  const handleGoogleSignIn = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError('root', { message: 'Đăng nhập Google chưa được cấu hình (thiếu VITE_GOOGLE_CLIENT_ID).' });
      return;
    }
    if (!window.google) {
      await new Promise<void>((resolve, reject) => {
        const script = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
        if (!script) {
          reject(new Error('Google Identity Services is unavailable.'));
          return;
        }
        script.addEventListener('load', () => resolve(), { once: true });
        script.addEventListener('error', () => reject(new Error('Google Identity Services failed to load.')), { once: true });
      }).catch((error: unknown) => {
        setError('root', { message: error instanceof Error ? error.message : 'Google sign-in is unavailable.' });
      });
      if (!window.google) return;
    }
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async ({ credential }) => {
        try {
          await loginWithGoogle(credential);
          navigate(from, { replace: true });
        } catch (error) {
          setError('root', { message: error instanceof ApiClientError ? error.message : 'Google sign-in failed. Please try again.' });
        }
      },
      hosted_domain: import.meta.env.VITE_GOOGLE_ALLOWED_DOMAIN || 'cyberlogitec.com',
    });
    window.google.accounts.id.prompt();
  };


  return (
    <div className="login-page-container">
      {/* LEFT SIDE: High-Tech Enterprise Showcase */}
      <div className="login-hero-section">
        {/* Background ambient lighting */}
        <div className="login-ambient-glow-1" />
        <div className="login-ambient-glow-2" />

        <div className="login-hero-content">
          {/* Brand header */}
          <div className="login-brand-row">
            <div className="login-brand-logo">
              <Layers size={26} color="#FFFFFF" />
            </div>
            <div>
              <span className="login-brand-company">CYBERLOGITEC VIETNAM</span>
              <h2 className="login-brand-title">KPI Performance System</h2>
            </div>
          </div>

          {/* Value proposition */}
          <div className="login-hero-intro">
            <div className="login-pill-badge">
              <Sparkles size={14} color="#C4B5FD" />
              <span>Nền tảng Quản trị & Đánh giá Toàn diện</span>
            </div>
            <h1 className="login-hero-heading">
              Đo lường chuẩn xác, <br />
              Đánh giá minh bạch, <br />
              <span className="login-hero-gradient-text">Tối ưu hiệu suất.</span>
            </h1>
            <p className="login-hero-description">
              Tích hợp tự động hóa dữ liệu từ Blueprint, chấm điểm đa cấp với thuật toán rule-engine thông minh, 
              hiệu chuẩn cân bằng điểm và lưu vết kiểm toán bất biến theo tiêu chuẩn doanh nghiệp.
            </p>
          </div>

          {/* Feature Highlight Cards */}
          <div className="login-feature-grid">
            <div className="login-feature-card">
              <div className="login-feature-icon-box">
                <TrendingUp size={22} color="#38BDF8" />
              </div>
              <div>
                <h4 className="login-feature-title">Thu thập Dữ liệu Tự động</h4>
                <p className="login-feature-desc">Đồng bộ dự án, chấm công, nỗ lực từ Blueprint không cần nhập liệu thủ công.</p>
              </div>
            </div>

            <div className="login-feature-card">
              <div className="login-feature-icon-box">
                <ShieldCheck size={22} color="#A78BFA" />
              </div>
              <div>
                <h4 className="login-feature-title">Quy trình & Kiểm toán Minh bạch</h4>
                <p className="login-feature-desc">Workflow phê duyệt 2 chiều, ghi nhận nhật ký Audit Trail chi tiết từng thao tác.</p>
              </div>
            </div>
          </div>

          {/* Bottom Trust Indicators */}
          <div className="login-hero-footer">
            <div className="login-trust-item">
              <CheckCircle2 size={16} color="#34D399" />
              <span>Bảo mật dữ liệu nhân sự</span>
            </div>
            <div className="login-trust-item">
              <CheckCircle2 size={16} color="#34D399" />
              <span>Đồng bộ thời gian thực</span>
            </div>
            <div className="login-trust-item">
              <CheckCircle2 size={16} color="#34D399" />
              <span>Tuân thủ quy chuẩn ISO</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Modern Clean Login Card */}
      <div className="login-form-section">
        <div className="login-form-container">
          {/* Mobile brand header (shown on small screens) */}
          <div className="login-mobile-brand-row">
            <div className="login-mobile-logo-box">
              <Layers size={20} color="#FFFFFF" />
            </div>
            <span className="login-mobile-brand-text">CyberLogitec KPI System</span>
          </div>

          <h2 className="login-form-title">Đăng nhập tài khoản</h2>
          <p className="login-form-subtitle">Truy cập không gian làm việc và chu kỳ đánh giá KPI của bạn</p>

          {/* Error Alert */}
          {errors.root && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FEE2E2',
                borderRadius: '12px',
                padding: '12px 14px',
                marginBottom: '1.5rem',
                color: '#B91C1C',
                fontSize: '0.875rem',
                lineHeight: '1.4',
              }}
            >
              <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{errors.root.message}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Username / Email field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="login-email" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1E293B' }}>
                Email
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={18} color="#94A3B8" style={{ position: 'absolute', left: '14px', pointerEvents: 'none' }} />
                <input
                  id="login-email"
                  type="text"
                  aria-required="true"
                  placeholder="VD: ky.luong@cyberlogitec.com"
                  aria-describedby={errors.email ? 'login-email-error' : undefined}
                  autoComplete="username"
                  {...register('email')}
                  className="login-input-field"
                  style={{
                    borderColor: errors.email ? '#EF4444' : undefined,
                  }}
                />
              </div>
              {errors.email && (
                <span id="login-email-error" role="alert" style={{ fontSize: '0.8125rem', color: '#DC2626', marginTop: '2px' }}>
                  {errors.email.message}
                </span>
              )}
            </div>

            {/* Password field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="login-password" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1E293B' }}>
                Mật khẩu
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={18} color="#94A3B8" style={{ position: 'absolute', left: '14px', pointerEvents: 'none' }} />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  aria-required="true"
                  placeholder="Nhập mật khẩu"
                  aria-describedby={errors.password ? 'login-password-error' : undefined}
                  autoComplete="current-password"
                  {...register('password')}
                  className="login-input-field"
                  style={{
                    paddingRight: '44px',
                    borderColor: errors.password ? '#EF4444' : undefined,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={18} color="#64748B" /> : <Eye size={18} color="#64748B" />}
                </button>
              </div>
              {errors.password && (
                <span id="login-password-error" role="alert" style={{ fontSize: '0.8125rem', color: '#DC2626', marginTop: '2px' }}>
                  {errors.password.message}
                </span>
              )}
            </div>


            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="login-submit-btn"
              style={{
                opacity: isSubmitting ? 0.75 : 1,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              <span>{isSubmitting ? 'Đang xác thực...' : 'Đăng nhập vào hệ thống'}</span>
              {!isSubmitting && <ArrowRight size={18} />}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '2px 0' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.05em' }}>HOẶC</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
            </div>

            {/* Google SSO Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="login-google-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: '10px', flexShrink: 0 }}>
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Đăng nhập qua Google công ty</span>
            </button>
          </form>

          {/* Footer Information */}
          <div style={{ marginTop: '1.75rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94A3B8' }}>
              Được bảo vệ bởi CyberLogitec IAM & Security Policy.
            </p>
            <p style={{ margin: 0, fontSize: '0.6875rem', color: '#CBD5E1' }}>
              © 2026 CyberLogitec Vietnam. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
