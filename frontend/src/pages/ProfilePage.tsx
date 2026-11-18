import { FormEvent, useState } from 'react';
import { CalendarDays, LoaderCircle, LockKeyhole, LogOut, Save, ShieldCheck, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/AuthContext';
import { api, ApiError } from '../services/api';
import { formatDate } from '../services/format';
import type { UserProfile } from '../types';

export function ProfilePage() {
  const { user, acceptSession, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.full_name || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const updated = await api.patch<UserProfile>('/auth/profile', { full_name: name });
      const token = sessionStorage.getItem('fairiot-token');
      if (token) acceptSession(token, updated);
      setNotice('Profile updated.');
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Profile could not be updated.'); }
    finally { setBusy(false); }
  }
  function signOut() { logout(); navigate('/'); }
  return (
    <div className="page-content fade-in">
      <div className="page-header"><div><h1>Profile</h1><p>Manage your FairIoT account information and access.</p></div></div>
      {error && <div className="form-error" role="alert">{error}</div>}{notice && <div className="form-success" role="status">{notice}</div>}
      <div className="profile-layout">
        <section className="card card-pad"><div className="card-title-row"><div><h2 className="card-title">Personal information</h2><p className="card-description">Your account details are private to this workspace.</p></div><UserRound size={16} color="#0B8F87" /></div><form onSubmit={save}><label className="form-field"><span>Full name</span><input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label><label className="form-field"><span>Email address</span><input type="email" value={user?.email || ''} readOnly /></label><label className="form-field"><span>Member since</span><input value={user?.created_at ? formatDate(user.created_at) : ''} readOnly /></label><button className="btn btn-primary btn-sm" disabled={busy || name.trim() === user?.full_name}>{busy ? <LoaderCircle size={14} className="spinner" /> : <Save size={14} />}{busy ? 'Saving…' : 'Save changes'}</button></form></section>
        <aside className="card card-pad"><div className="card-title-row"><div><h2 className="card-title">Account security</h2><p className="card-description">Private records and secure access.</p></div><ShieldCheck size={16} color="#0B8F87" /></div><div className="profile-security"><div className="security-row"><div className="security-icon"><LockKeyhole size={15} /></div><div><strong>Email and password sign-in</strong><span>Password is stored as a secure Argon2 hash.</span></div></div><div className="security-row"><div className="security-icon"><CalendarDays size={15} /></div><div><strong>JWT session</strong><span>Sign out to end this browser session.</span></div></div></div><div className="auth-divider" /><Link to="/forgot-password" className="btn btn-secondary btn-sm" style={{ width: '100%', marginBottom: 9 }}><LockKeyhole size={13} />Reset password</Link><button className="btn btn-danger btn-sm" style={{ width: '100%' }} onClick={signOut}><LogOut size={13} />Log out</button></aside>
      </div>
    </div>
  );
}
