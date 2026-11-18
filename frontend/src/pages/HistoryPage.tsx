import { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowRightLeft, BarChart3, ChevronDown, CircleHelp, FileText, LoaderCircle, Trash2, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { LoadingScreen } from '../components/LoadingScreen';
import { api, ApiError } from '../services/api';
import { formatDate, moduleLabels, statusClass, statusLabels } from '../services/format';
import type { AnalysisResult, FairnessStatus } from '../types';

const statusOptions: Array<{ value: 'all' | FairnessStatus; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'potential_disparity', label: 'Potential disparity' },
  { value: 'fair_under_test', label: 'Fair under selected test' },
  { value: 'insufficient_data', label: 'Insufficient data' },
];

export function HistoryPage() {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<AnalysisResult[]>([]);
  const [details, setDetails] = useState<AnalysisResult | null>(null);
  const [comparison, setComparison] = useState<AnalysisResult[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [filter, setFilter] = useState<'all' | FairnessStatus>('all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try { setItems(await api.get<AnalysisResult[]>('/analyses')); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Analysis history could not be loaded.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const id = Number(searchParams.get('open'));
    if (id > 0) void openDetails(id);
  }, [searchParams]);

  async function openDetails(id: number) {
    setError('');
    try { setDetails(await api.get<AnalysisResult>(`/analyses/${id}`)); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Analysis details could not be loaded.'); }
  }
  async function remove(item: AnalysisResult) {
    if (!window.confirm('Delete this saved analysis and its report files? This cannot be undone.')) return;
    setBusy(true); setError('');
    try { await api.delete<void>(`/analyses/${item.id}`); setItems((old) => old.filter((entry) => entry.id !== item.id)); setSelected((old) => old.filter((id) => id !== item.id)); if (details?.id === item.id) setDetails(null); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Analysis could not be deleted.'); }
    finally { setBusy(false); }
  }
  async function compare() {
    if (selected.length < 2) return;
    setBusy(true); setError('');
    try { const response = await api.post<{ analyses: AnalysisResult[] }>('/analyses/compare', { analysis_ids: selected }); setComparison(response.analyses); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Selected analyses could not be compared.'); }
    finally { setBusy(false); }
  }
  async function download(id: number, format: 'csv' | 'pdf') {
    setDownloadBusy(`${id}-${format}`); setError('');
    try { await api.download(`/reports/${id}/${format}`, `fairiot-analysis-${id}.${format}`); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Report download failed.'); }
    finally { setDownloadBusy(''); }
  }
  function toggle(id: number) { setSelected((old) => old.includes(id) ? old.filter((item) => item !== id) : [...old, id].slice(-10)); }
  const visible = useMemo(() => items.filter((item) => filter === 'all' || item.status === filter), [items, filter]);

  return (
    <div className="page-content fade-in">
      <div className="page-header"><div><h1>Analysis history</h1><p>Review, compare, and download saved reports. Results stay private to your account.</p></div><button className="btn btn-secondary btn-sm" onClick={() => void load()}><LoaderCircle size={13} className={loading ? 'spinner' : ''} />Refresh</button></div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="history-toolbar"><div className="history-filter"><span>{items.length} saved {items.length === 1 ? 'analysis' : 'analyses'}</span><ChevronDown size={13} /><select aria-label="Filter by status" value={filter} onChange={(event) => setFilter(event.target.value as 'all' | FairnessStatus)}>{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div><span style={{ color: '#829AB0', fontSize: 9 }}>Select 2–10 results to compare</span></div>
      {selected.length >= 2 && <div className="compare-strip"><span><ArrowRightLeft size={14} style={{ verticalAlign: '-3px', marginRight: 6 }} />{selected.length} analyses selected for comparison</span><button className="btn btn-primary btn-sm" onClick={() => void compare()} disabled={busy}>{busy ? 'Comparing…' : 'Compare results'}</button></div>}
      <section className="card">{loading ? <LoadingScreen label="Loading saved analyses" /> : visible.length === 0 ? <div className="empty-state"><div className="empty-state-icon"><BarChart3 size={19} /></div><h3>{items.length ? 'No results for this status filter' : 'No analyses saved yet'}</h3><p>Completed comparisons and their calculated results are saved here for review.</p>{items.length === 0 && <a href="/app/analysis" className="btn btn-primary btn-sm">Run an analysis</a>}</div> : <div className="table-wrap"><table><thead><tr><th>Select</th><th>Dataset / metric</th><th>Module</th><th>Selected-test status</th><th>Gap</th><th>Saved</th><th>Reports</th><th /></tr></thead><tbody>{visible.map((item) => <tr key={item.id}><td><input type="checkbox" aria-label={`Select analysis ${item.id}`} checked={selected.includes(item.id)} onChange={() => toggle(item.id)} /></td><td><button className="table-action" onClick={() => void openDetails(item.id)}><strong>{item.dataset_name}</strong></button><div style={{ color: '#829AB0', marginTop: 4 }}>{item.metric_column} by {item.group_column}</div></td><td>{moduleLabels[item.module]}</td><td><span className={statusClass(item.status)}>{statusLabels[item.status]}</span></td><td>{item.relative_gap_percent.toFixed(2)}%</td><td>{formatDate(item.created_at, true)}</td><td><div style={{ display: 'flex', gap: 3 }}><button className="icon-button" title="Download CSV" aria-label="Download CSV report" onClick={() => void download(item.id, 'csv')} disabled={!!downloadBusy}><FileText size={14} /></button><button className="icon-button" title="Download PDF" aria-label="Download PDF report" onClick={() => void download(item.id, 'pdf')} disabled={!!downloadBusy}><ArrowDownToLine size={14} /></button></div></td><td><button className="icon-button" title="Delete saved analysis" aria-label="Delete analysis" onClick={() => void remove(item)} disabled={busy}><Trash2 size={14} /></button></td></tr>)}</tbody></table></div>}</section>
      {(details || comparison.length > 0) && <div className="modal-backdrop" role="presentation" onClick={() => { setDetails(null); setComparison([]); }}><div className="modal-panel" role="dialog" aria-modal="true" aria-label={comparison.length ? 'Compare analysis results' : 'Analysis details'} onClick={(event) => event.stopPropagation()}><div className="card-title-row"><div><h2 className="card-title">{comparison.length ? 'Compare saved results' : 'Analysis details'}</h2><p className="card-description">{comparison.length ? 'Each comparison retains its dataset, metric, grouping, and selected test.' : details ? `${details.dataset_name} · ${moduleLabels[details.module]} · ${formatDate(details.created_at, true)}` : ''}</p></div><button className="icon-button" aria-label="Close details" onClick={() => { setDetails(null); setComparison([]); }}><X size={16} /></button></div>
          {details && comparison.length === 0 && <AnalysisDetails item={details} onDownload={download} downloadBusy={downloadBusy} />}
          {comparison.length > 0 && <div className="compare-grid">{comparison.map((item) => <div className="compare-card" key={item.id}><div className="compare-card-head"><strong>{item.dataset_name}</strong><span className={statusClass(item.status)}>{item.result.status_label}</span></div><div className="detail-grid"><Detail label="Module" value={moduleLabels[item.module]} /><Detail label="Metric / group" value={`${item.metric_column} · ${item.group_column}`} /><Detail label="Relative gap" value={`${item.result.relative_gap_percent.toFixed(2)}%`} /><Detail label="Direction / threshold" value={`${item.direction}-is-better · ${item.threshold_percent}%`} /></div><div className="table-wrap" style={{ marginTop: 12 }}><table><thead><tr><th>Group</th><th>n</th><th>Mean</th><th>Median</th></tr></thead><tbody>{item.result.groups.map((group) => <tr key={group.group}><td>{group.group}</td><td>{group.sample_size}</td><td>{group.mean.toFixed(3)}</td><td>{group.median.toFixed(3)}</td></tr>)}</tbody></table></div></div>)}</div>}
        </div></div>}
    </div>
  );
}

function AnalysisDetails({ item, onDownload, downloadBusy }: { item: AnalysisResult; onDownload: (id: number, format: 'csv' | 'pdf') => void; downloadBusy: string }) {
  return <><div className={`result-banner ${item.status === 'fair_under_test' ? 'fair' : item.status === 'potential_disparity' ? 'potential' : 'insufficient'}`}><div><CircleHelp size={18} /></div><div><h3>{item.result.status_label}</h3><p>{item.result.explanation}</p></div></div><div className="detail-grid"><Detail label="Dataset / module" value={`${item.dataset_name} · ${moduleLabels[item.module]}`} /><Detail label="Metric / group" value={`${item.metric_column} · ${item.group_column}`} /><Detail label="Direction / threshold" value={`${item.direction}-is-better · ${item.threshold_percent}%`} /><Detail label="Groups / observations" value={`${item.result.group_count} · ${item.result.total_observations}`} /><Detail label="Relative gap" value={`${item.result.relative_gap_percent.toFixed(2)}%`} /><Detail label="Comparison basis" value={item.result.comparison_basis} /></div><div className="table-wrap" style={{ marginTop: 14 }}><table><thead><tr><th>Group</th><th>n</th><th>Mean</th><th>Median</th><th>Min–max</th><th>Std dev</th><th>Approx. 95% CI</th></tr></thead><tbody>{item.result.groups.map((group) => <tr key={group.group}><td><strong>{group.group}</strong></td><td>{group.sample_size}</td><td>{group.mean.toFixed(3)}</td><td>{group.median.toFixed(3)}</td><td>{group.minimum.toFixed(3)}–{group.maximum.toFixed(3)}</td><td>{group.std_dev === null ? '—' : group.std_dev.toFixed(3)}</td><td>{group.confidence_interval_95 ? `${group.confidence_interval_95[0].toFixed(3)}–${group.confidence_interval_95[1].toFixed(3)}` : '—'}</td></tr>)}</tbody></table></div><div className="callout" style={{ marginTop: 13 }}><CircleHelp size={14} /><span>{item.result.caveat} {item.result.context_adjustment.note}</span></div><div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 15 }}><button className="btn btn-secondary btn-sm" onClick={() => onDownload(item.id, 'csv')} disabled={!!downloadBusy}><FileText size={13} />Download CSV</button><button className="btn btn-primary btn-sm" onClick={() => onDownload(item.id, 'pdf')} disabled={!!downloadBusy}><ArrowDownToLine size={13} />Download PDF</button></div></>;
}
function Detail({ label, value }: { label: string; value: string }) { return <div className="detail-item"><span>{label}</span><strong>{value}</strong></div>; }
