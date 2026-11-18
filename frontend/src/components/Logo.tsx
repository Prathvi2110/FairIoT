import { Link } from 'react-router-dom';

export function Logo({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <Link to="/" className={`brand ${light ? 'brand-light' : ''}`} aria-label="FairIoT home">
      <svg className="brand-mark" viewBox="0 0 44 44" role="img" aria-hidden="true">
        <rect x="1" y="1" width="42" height="42" rx="13" fill="currentColor" opacity=".11" />
        <path d="M13 30V14h18M13 22h13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="31" cy="14" r="3.2" fill="#0B8F87" />
        <circle cx="27" cy="22" r="2.4" fill="#6AC7BB" />
        <path d="M13 30h7m2 0h9" stroke="#0B8F87" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      {!compact && <span className="brand-word">Fair<span>IoT</span></span>}
    </Link>
  );
}
