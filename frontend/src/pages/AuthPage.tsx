import { FormEvent, useState } from 'react';
import { ArrowLeft, ArrowRight, LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useAuth } from '../hooks/AuthContext';
import { api, ApiError } from '../services/api';
import type { UserProfile } from '../types';

type Mode = 'login' | 'register' | 'forgot' | 'reset';
interface AuthResponse { access_token: string; user: UserProfile; }
const copy: Record<Mode, { title: string; lead: string; submit: string }> = {
  login: { title: 'Sign in to FairIoT', lead: 'Continue to your private analysis workspace.', submit: 'Sign in' },
  register: { title: 'Create your account', lead: 'Set up a secure workspace for your IoT fairness analyses.', submit: 'Create account' },
  forgot: { title: 'Reset your password', lead: 'Enter the email associated with your FairIoT account.', submit: 'Request reset link' },
  reset: { title: 'Choose a new password', lead: 'Use at least 10 characters for your new password.', submit: 'Update password' },
};

export function AuthPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, acceptSession } = useAuth();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', password: '', password_confirm: '' });
  if (user && (mode === 'login' || mode === 'register')) return <Navigate to="/app" replace />;
  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((old) => ({ ...old, [key]: event.target.value }));
    setError(''); setNotice('');
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setNotice(''); setBusy(true);
    try {
      if (mode === 'register') {
        if (form.password !== form.password_confirm) throw new Error('Passwords do not match.');
        const result = await api.post<AuthResponse>('/auth/register', { email: form.email, full_name: form.full_name, password: form.password });
        acceptSession(result.access_token, result.user); navigate('/app'); return;
      }
      if (mode === 'login') {
        const result = await api.post<AuthResponse>('/auth/login', { email: form.email, password: form.password });
        acceptSession(result.access_token, result.user); navigate('/app'); return;
      }
      if (mode === 'forgot') {
        const result = await api.post<{ message: string }>('/auth/forgot-password', { email: form.email });
        setNotice(result.message); return;
      }
      const token = searchParams.get('token');
      if (!token) throw new Error('This reset link does not contain a token. Request a new link to continue.');
      if (form.password !== form.password_confirm) throw new Error('Passwords do not match.');
      const result = await api.post<{ message: string }>('/auth/reset-password', { token, password: form.password });
      setNotice(result.message);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : 'Something went wrong. Please try again.');
    } finally { setBusy(false); }
  }

  const content = copy[mode];
  return (
    <div className="auth-wrap">
      <aside className="auth-aside">
        <Logo light />
        <div className="auth-aside-copy">
          <div className="eyebrow"><ShieldCheck size={13} /> A clearer view of performance</div>
          <h1>Measure the gap.<br />Understand the test.</h1>
          <p>FairIoT helps teams compare hardware performance across groups and conditions—without turning a statistical signal into an unsupported conclusion.</p>
        </div>
        <div className="auth-aside-foot">Private datasets · Explainable statistics · User-scoped analysis</div>
      </aside>
      <main className="auth-main">
        <div className="auth-box fade-in">
          <div className="auth-top-mobile"><Logo /></div>
          <Link to={mode === 'login' || mode === 'register' ? '/' : '/login'} className="text-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 25, fontSize: 10 }}><ArrowLeft size={13} /> {mode === 'login' || mode === 'register' ? 'Back to FairIoT' : 'Back to sign in'}</Link>
          <h2>{content.title}</h2><p className="auth-lead">{content.lead}</p>
          <form onSubmit={submit}>
            {mode === 'register' && <label className="form-field"><span>Full name</span><input autoComplete="name" required maxLength={120} value={form.full_name} onChange={update('full_name')} placeholder="Your name" /></label>}
            {mode !== 'reset' && <label className="form-field"><span>Email address</span><input autoComplete="email" type="email" required value={form.email} onChange={update('email')} placeholder="you@company.com" /></label>}
            {(mode === 'login' || mode === 'register' || mode === 'reset') && <label className="form-field"><span>{mode === 'reset' ? 'New password' : 'Password'}</span><input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type="password" minLength={10} maxLength={128} required value={form.password} onChange={update('password')} placeholder="At least 10 characters" /></label>}
            {(mode === 'register' || mode === 'reset') && <label className="form-field"><span>Confirm password</span><input autoComplete="new-password" type="password" minLength={10} maxLength={128} required value={form.password_confirm} onChange={update('password_confirm')} placeholder="Re-enter your password" /></label>}
            {mode === 'login' && <div style={{ textAlign: 'right', margin: '-5px 0 13px' }}><Link className="text-link" style={{ fontSize: 10 }} to="/forgot-password">Forgot password?</Link></div>}
            {mode === 'register' && <small className="form-hint">Use a unique password with at least 10 characters.</small>}
            {error && <div className="form-error" role="alert">{error}</div>}
            {notice && <div className="form-success" role="status">{notice}</div>}
            {!(mode === 'forgot' && notice) && !(mode === 'reset' && notice) && <button className="btn btn-primary form-submit" disabled={busy} type="submit">{busy ? <LoaderCircle size={15} className="spinner" /> : mode === 'login' ? <LockKeyhole size={14} /> : null}{busy ? 'Working…' : content.submit}{!busy && <ArrowRight size={14} />}</button>}
          </form>
          <div className="auth-divider" />
          <p className="form-foot">{mode === 'login' ? <>New to FairIoT? <Link to="/register">Create an account</Link></> : mode === 'register' ? <>Already have an account? <Link to="/login">Sign in</Link></> : mode === 'forgot' ? <>Remembered it? <Link to="/login">Sign in</Link></> : <>Need another reset link? <Link to="/forgot-password">Request one</Link></>}</p>
          {mode === 'forgot' && <p className="form-hint" style={{ textAlign: 'center', marginTop: 16 }}>Reset instructions are sent only when an email transport is configured. This response does not reveal whether an account exists.</p>}
        </div>
      </main>
    </div>
  );
}
