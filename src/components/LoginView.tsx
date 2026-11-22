import React from 'react';
import { AlertCircle, Eye, EyeOff, Lock, User } from 'lucide-react';
import type { AuthSessionResponse, AuthStatusResponse } from '../types.ts';

interface LoginViewProps {
  authStatus: AuthStatusResponse | null;
  statusLoading: boolean;
  onRefreshStatus: () => Promise<void>;
  onAuthenticated: (session: AuthSessionResponse) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  authStatus,
  statusLoading,
  onRefreshStatus,
  onAuthenticated,
}) => {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [infoNotice, setInfoNotice] = React.useState<string | null>(null);
  const [forceLoginView, setForceLoginView] = React.useState(false);
  const [primaryLogoFailed, setPrimaryLogoFailed] = React.useState(false);
  const [secondaryLogoFailed, setSecondaryLogoFailed] = React.useState(false);

  const isSetupMode = authStatus?.mode === 'setup' && !forceLoginView;

  React.useEffect(() => {
    if (authStatus?.mode === 'login') {
      setForceLoginView(false);
    }
  }, [authStatus?.mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoNotice(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername || trimmedUsername.length < 2) {
      setError('Please enter a username (at least 2 characters).');
      return;
    }

    if (isSetupMode && password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = isSetupMode ? '/api/auth/setup' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUsername, password }),
      });
      const data = (await res.json()) as AuthSessionResponse & { error?: string };

      if (res.status === 409 && isSetupMode) {
        setForceLoginView(true);
        await onRefreshStatus();
        setInfoNotice(
          'Admin credentials are already configured on the server. Click Sign In below with your configured username and password.'
        );
        return;
      }

      if (res.status === 409 && !isSetupMode) {
        setForceLoginView(false);
        await onRefreshStatus();
        setInfoNotice(
          'No admin credentials are saved yet. Click Save & Sign In below to save this username and password.'
        );
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Sign in failed.');
      }
      onAuthenticated(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-12 bg-slate-50 text-slate-900">
      <aside className="lg:col-span-5 bg-[#0B1A33] text-white px-6 py-5 sm:p-8 lg:p-12 flex flex-col justify-between gap-6 lg:gap-10">
        <div className="space-y-4 lg:space-y-8">
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex items-center bg-white rounded-xl px-4 py-2.5 lg:px-5 lg:py-3.5">
              {!primaryLogoFailed ? (
                <img
                  src="/assets/aistudio/AFCCFDAF-04E5-4AA2-ADE0-E837A7BA9B92_a8ada254.png"
                  alt="HK Surya Website Development"
                  referrerPolicy="no-referrer"
                  onError={() => setPrimaryLogoFailed(true)}
                  className="h-10 lg:h-14 w-auto max-w-[190px] lg:max-w-[230px] object-contain"
                />
              ) : (
                <span className="font-display text-base lg:text-lg font-bold tracking-tight text-[#0B1A33]">
                  HK Surya Website Development
                </span>
              )}
            </div>

            <div className="lg:hidden bg-white rounded-lg p-1 shrink-0">
              {!secondaryLogoFailed ? (
                <img
                  src="/assets/aistudio/529A0428-546D-4806-A071-216BA823C9B9_c684cf78.png"
                  alt="HK Surya Digital Solutions"
                  referrerPolicy="no-referrer"
                  onError={() => setSecondaryLogoFailed(true)}
                  className="h-9 w-9 object-contain"
                />
              ) : (
                <span className="h-9 w-9 flex items-center justify-center font-display font-bold text-xs text-[#0B1A33]">
                  HK
                </span>
              )}
            </div>
          </div>

          <div className="hidden lg:block space-y-3 max-w-md">
            <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-white text-balance">
              Digital Marketing &amp; Full-Stack Lead Operations
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Sign in to access the HK Surya Admin Dashboard for industry-filtered social media lead discovery, extracted original contact details, project pipelines, developer applicants, and admin feedback.
            </p>
          </div>

          <div className="hidden lg:block border-t border-white/15 pt-6 space-y-4 text-sm text-slate-200 max-w-md">
            <div>
              <p className="font-medium text-white">01. Multi-Platform Lead Scanner</p>
              <p className="text-xs text-slate-300 mt-0.5">
                Recently added freelance opportunities across Full-Stack Web Dev, Website Development, SEO, AEO, and Digital Marketing.
              </p>
            </div>
            <div>
              <p className="font-medium text-white">02. Verified Contact &amp; Social Links</p>
              <p className="text-xs text-slate-300 mt-0.5">
                Original post URLs, author profiles, contact emails, phone numbers, and company websites extracted directly from live feeds.
              </p>
            </div>
            <div>
              <p className="font-medium text-white">03. Connected Pipeline &amp; Applicant Roster</p>
              <p className="text-xs text-slate-300 mt-0.5">
                Track client deals, assign full-stack engineers, and log backend admin feedback.
              </p>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex border-t border-white/15 pt-6 items-center gap-3.5">
          <div className="bg-white rounded-lg p-1.5 shrink-0">
            {!secondaryLogoFailed ? (
              <img
                src="/assets/aistudio/529A0428-546D-4806-A071-216BA823C9B9_c684cf78.png"
                alt="HK Surya Digital Solutions"
                referrerPolicy="no-referrer"
                onError={() => setSecondaryLogoFailed(true)}
                className="h-10 w-10 object-contain"
              />
            ) : (
              <span className="h-10 w-10 flex items-center justify-center font-display font-bold text-xs text-[#0B1A33]">
                HK
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-display text-xs font-semibold text-white">
              HK Surya Digital Solutions
            </p>
            <p className="text-xs text-slate-300 mt-0.5">Design · Develop · Deliver</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 lg:col-span-7 flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
          {statusLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-6 w-48 bg-slate-100 rounded" />
              <div className="h-4 w-full bg-slate-100 rounded" />
              <div className="h-10 w-full bg-slate-100 rounded-lg" />
              <div className="h-10 w-full bg-slate-100 rounded-lg" />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-sky-700">
                  {isSetupMode ? 'First-Time Admin Setup' : 'Admin Login'}
                </p>
                <h2 className="font-display text-xl font-semibold text-slate-900">
                  {isSetupMode ? 'Set Username & Password' : 'Sign In to Dashboard'}
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {isSetupMode
                    ? 'Choose your admin username and password once to lock the dashboard.'
                    : 'Enter your username and password to open the HK Surya Admin Dashboard.'}
                </p>
              </div>

              {infoNotice && (
                <div
                  role="status"
                  className="px-3.5 py-2.5 text-xs text-sky-900 bg-sky-50 border border-sky-200 rounded-lg"
                >
                  {infoNotice}
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 px-3.5 py-2.5 text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="admin-username"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Username
                  </label>
                  <div className="relative">
                    <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="admin-username"
                      type="text"
                      autoComplete="username"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="admin-password"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="admin-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={isSetupMode ? 'new-password' : 'current-password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isSetupMode ? 'Create password (min. 6 chars)' : 'Enter password'}
                      className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 text-sm font-medium text-white bg-[#0B1A33] hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-60"
                >
                  {submitting
                    ? isSetupMode
                      ? 'Saving...'
                      : 'Signing In...'
                    : isSetupMode
                      ? 'Save & Sign In'
                      : 'Sign In'}
                </button>
              </form>

              {isSetupMode ? (
                <div className="pt-2 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setForceLoginView(true);
                      void onRefreshStatus();
                    }}
                    className="text-xs font-medium text-sky-700 hover:text-sky-900"
                  >
                    Already have credentials? Switch to Sign In
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-3">
                  {authStatus?.envConfigured
                    ? 'Credentials are configured via ADMIN_PASSCODE (and optional ADMIN_USERNAME) in Settings → Secrets.'
                    : 'Sign in with the admin username and password configured for this workspace.'}
                </p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};
