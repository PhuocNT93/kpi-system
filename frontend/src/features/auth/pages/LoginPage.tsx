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
  AlertCircle,
  ArrowRight,
  Layers,
  Globe,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../../../shared/auth/auth-context';
import { ApiClientError } from '../../../shared/api/api-client';
import { useTheme } from '../../../shared/theme';
import { useUiTranslation } from '../../../shared/i18n/ui-i18n';
import './LoginPage.css';

const loginSchema = z.object({
  email: z.string().min(1, 'Email là bắt buộc'),
  password: z.string().min(1, 'Mật khẩu là bắt buộc'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { t, locale, changeLocale } = useUiTranslation();
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
        setError('root', { message: err.message || t('login.invalid_credentials', 'Tài khoản hoặc mật khẩu không chính xác.') });
      } else {
        setError('root', { message: t('login.network_error', 'Không thể kết nối đến máy chủ hoặc đã xảy ra lỗi. Vui lòng thử lại.') });
      }
    }
  });

  const handleGoogleSignIn = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError('root', { message: t('login.google_unconfigured', 'Đăng nhập Google chưa được cấu hình (thiếu VITE_GOOGLE_CLIENT_ID).') });
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
    <main className="login-centered-page">
      {/* Top right toolbar with language & theme toggles */}
      <div className="login-top-toolbar">
        <div className="login-toolbar-pill">
          <Globe size={15} color={isDark ? '#94a3b8' : '#64748b'} />
          <select
            value={locale}
            onChange={(e) => changeLocale(e.target.value as 'en' | 'vi')}
            aria-label="Select interface language"
            className="login-lang-select"
          >
            <option value="vi">VI - Tiếng Việt</option>
            <option value="en">EN - English</option>
          </select>
        </div>

        <div className="login-toolbar-pill">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="login-theme-btn"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      {/* Ambient background glows */}
      <div className="login-ambient-glow-top" />
      <div className="login-ambient-glow-bottom" />

      {/* Centered Card */}
      <div className="login-card">
        {/* Header with Logo */}
        <div className="login-card-header">
          <div className="login-logo-badge">
            <Layers size={28} color="#FFFFFF" />
          </div>
          <span className="login-brand-tag">{t('login.brand', 'CyberLogitec Vietnam')}</span>
          <h1 className="login-card-title">{t('login.title', 'KPI Performance System')}</h1>
          <p className="login-card-subtitle">
            {t('login.subtitle', 'Đăng nhập để truy cập chu kỳ đánh giá và bảng chỉ số của bạn')}
          </p>
        </div>

        {/* Error Alert */}
        {errors.root && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
              border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : '#FEE2E2'}`,
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '1.5rem',
              color: isDark ? '#fca5a5' : '#B91C1C',
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
          {/* Email field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="login-email" className="login-field-label">
              {t('login.email_label', 'Email')}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={18} color="#94A3B8" style={{ position: 'absolute', left: '14px', pointerEvents: 'none' }} />
              <input
                id="login-email"
                type="text"
                aria-required="true"
                placeholder={t('login.email_placeholder', 'VD: ky.luong@cyberlogitec.com')}
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
                {t('login.email_req', errors.email.message || 'Email is required')}
              </span>
            )}
          </div>

          {/* Password field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="login-password" className="login-field-label">
              {t('login.password_label', 'Password')}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={18} color="#94A3B8" style={{ position: 'absolute', left: '14px', pointerEvents: 'none' }} />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                aria-required="true"
                placeholder={t('login.password_placeholder', 'Enter your password')}
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
                aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                {t('login.password_req', errors.password.message || 'Password is required')}
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
              marginTop: '0.25rem',
            }}
          >
            <span>{isSubmitting ? t('login.submitting', 'Authenticating...') : t('login.submit_btn', 'Login to system')}</span>
            {!isSubmitting && <ArrowRight size={18} />}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
            <div className="login-divider-line" />
            <span className="login-divider-text">{t('login.or_continue', 'OR')}</span>
            <div className="login-divider-line" />
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
            <span>{t('login.google_btn', 'Login with Google Company Workspace')}</span>
          </button>
        </form>
      </div>

      {/* Centered Page Footer */}
      <footer className="login-page-footer">
        <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748B' }}>
          {t('login.footer_security', 'Secured by Google Workspace & Compliant with CyberLogitec Security Policy')}
        </p>
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#94A3B8' }}>
          {t('login.footer_copyright', '© 2026 CyberLogitec Vietnam. All rights reserved.')}
        </p>
      </footer>
    </main>
  );
}

