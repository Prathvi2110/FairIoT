import { LoaderCircle } from 'lucide-react';

export function LoadingScreen({ label = 'Loading' }: { label?: string }) {
  return <div className="loading-inline" role="status"><LoaderCircle size={15} className="spinner" />{label}</div>;
}
