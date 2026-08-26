import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import { Chrome } from 'lucide-react';
import { useAuth } from '../../../shared/auth/AuthContext';
import { ApiClientError } from '../../../shared/api/api-client';

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';

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
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiClientError && err.statusCode === 401) {
        setError('root', { message: err.message });
      } else {
        setError('root', { message: 'An unexpected error occurred. Please try again.' });
      }
    }
  });

  const handleGoogleSignIn = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError('root', { message: 'Google sign-in is not configured.' });
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
      hosted_domain: 'cyberlogitec.com',
    });
    window.google.accounts.id.prompt();
  };

  return (
    <main
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#f9fafb',
      }}
    >
      <div
        style={{
          background: '#fff', borderRadius: 8, padding: '2rem', width: '100%',
          maxWidth: 380, boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <h1 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', fontWeight: 700 }}>
          KPI System — Sign in
        </h1>

        {errors.root && (
          <div role="alert" style={{ color: '#dc2626', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {errors.root.message}
          </div>
        )}

        <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="login-email" style={{ display: 'block', fontWeight: 500, marginBottom: '0.25rem' }}>
              Email
            </label>
            <input
              id="login-email" type="email" aria-required="true"
              aria-describedby={errors.email ? 'login-email-error' : undefined}
              autoComplete="email" {...register('email')}
              style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 4 }}
            />
            {errors.email && (
              <span id="login-email-error" role="alert" style={{ color: '#dc2626', fontSize: '0.8rem' }}>
                {errors.email.message}
              </span>
            )}
          </div>

          <div>
            <label htmlFor="login-password" style={{ display: 'block', fontWeight: 500, marginBottom: '0.25rem' }}>
              Password
            </label>
            <input
              id="login-password" type="password" aria-required="true"
              aria-describedby={errors.password ? 'login-password-error' : undefined}
              autoComplete="current-password" {...register('password')}
              style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 4 }}
            />
            {errors.password && (
              <span id="login-password-error" role="alert" style={{ color: '#dc2626', fontSize: '0.8rem' }}>
                {errors.password.message}
              </span>
            )}
          </div>

          <button
            type="submit" disabled={isSubmitting}
            style={{
              padding: '0.625rem', background: isSubmitting ? '#93c5fd' : '#2563eb',
              color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            style={{ padding: '0.625rem', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 4, fontWeight: 600, cursor: 'pointer' }}
          >
            <Chrome size={16} aria-hidden="true" style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
            Sign in with company Google account
          </button>
        </form>
      </div>
    </main>
  );
}
