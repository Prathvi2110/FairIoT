import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, BarChart3, Database, Gauge, Radio, ShieldAlert, Waypoints } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { LoadingScreen } from '../components/LoadingScreen';
import { api, ApiError } from '../services/api';
import { formatDate, moduleLabels, statusClass, statusLabels } from '../services/format';
import type { DashboardStats, FairnessStatus, ModuleKey } from '../types';

const statusColor: Record<FairnessStatus, string> = { fair_under_test: '#2AA895', potential_disparity: '#E4A43A', insufficient_data: '#9FB3C3' };
const moduleOrder: ModuleKey[] = ['sensor', 'actuator', 'communication', 'resource_allocation'];

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get<DashboardStats>('/dashboard/stats').then(setStats).catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Dashboard data could not be loaded.')).finally(() => setLoading(false));
  }, []);
  const moduleData = useMemo(() => moduleOrder.map((module) => ({ name: moduleLabels[module].replace(' fairness', ''), analyses: stats?.module_distribution[module] || 0 })), [stats]);
  const statusData = stats ? Object.entries(stats.status_distribution).map(([key, value]) => ({ name: statusLabels[key as FairnessStatus], value, color: statusColor[key as FairnessStatus] })).filter((item) => item.value > 0) : [];

  if (loading) return <div className="page-content"><LoadingScreen label="Loading your analysis overview" /></div>;
  return (
    <div className="page-content fade-in">
      <div className="page-header"><div><h1>Analysis overview</h1><p>A measured view of the devices, groups, and datasets you have analyzed.</p></div><div className="page-actions"><Link to="/app/analysis" className="btn btn-primary btn-sm"><BarChart3 size={14} /> Run an analysis</Link></div></div>
      {error && <div className="form-error" role="alert">{error}</div>}
      {stats && <>
        <div className="kpi-grid">
          <Kpi icon={<Gauge size={16} />} label="Devices analyzed" value={stats.devices_analyzed} note={stats.devices_basis} />
          <Kpi icon={<Database size={16} />} label="Datasets uploaded" value={stats.datasets_uploaded} note="Private to your account" />
          <Kpi icon={<Waypoints size={16} />} label="Groups compared" value={stats.groups_compared} note="Across saved analyses" />
          <Kpi icon={<ShieldAlert size={16} />} label="Potential disparities" value={stats.potential_disparities} note="Signals above configured thresholds" />
        </div>
        <div className="dashboard-grid">
          <section className="card card-pad">
            <div className="card-title-row"><div><h2 className="card-title">Analyses over time</h2><p className="card-description">Saved runs · last 14 days</p></div><Activity size={16} color="#829AB0" /></div>
            {stats.recent_analyses.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={stats.trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><CartesianGrid stroke="#EDF2F5" vertical={false} /><XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5)} tick={{ fill: '#829AB0', fontSize: 9 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: '#829AB0', fontSize: 9 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ border: '1px solid #E1EAF0', borderRadius: 9, fontSize: 10 }} labelFormatter={(value) => formatDate(String(value))} /><Line type="monotone" dataKey="analyses" name="Analyses" stroke="#0B8F87" strokeWidth={2.4} dot={{ r: 2.5, fill: '#0B8F87', strokeWidth: 0 }} activeDot={{ r: 4 }} /></LineChart></ResponsiveContainer></div> : <EmptyChart title="Your analysis trend will appear here" detail="Run an analysis to create a real history and trend." />}
          </section>
          <section className="card card-pad">
            <div className="card-title-row"><div><h2 className="card-title">Fairness status</h2><p className="card-description">Saved results by selected-test outcome</p></div><ShieldAlert size={16} color="#829AB0" /></div>
            {statusData.length ? <><div className="chart-wrap-short"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={72} paddingAngle={3} stroke="#fff" strokeWidth={2}>{statusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip contentStyle={{ border: '1px solid #E1EAF0', borderRadius: 9, fontSize: 10 }} /></PieChart></ResponsiveContainer></div><div className="chart-legend" style={{ justifyContent: 'center' }}>{statusData.map((item) => <span key={item.name} className="legend-dot"><i style={{ background: item.color }} />{item.name}</span>)}</div></> : <EmptyChart title="No results yet" detail="Fairness classifications appear after analyses have been saved." />}
          </section>
        </div>
        <div className="dashboard-grid">
          <section className="card card-pad">
            <div className="card-title-row"><div><h2 className="card-title">Module activity</h2><p className="card-description">Number of saved analyses by fairness module</p></div><Radio size={16} color="#829AB0" /></div>
            {stats.recent_analyses.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={moduleData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid stroke="#EDF2F5" vertical={false} /><XAxis dataKey="name" tick={{ fill: '#829AB0', fontSize: 9 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: '#829AB0', fontSize: 9 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ border: '1px solid #E1EAF0', borderRadius: 9, fontSize: 10 }} /><Bar dataKey="analyses" name="Saved analyses" fill="#5AB9AF" radius={[5, 5, 0, 0]} maxBarSize={42} /></BarChart></ResponsiveContainer></div> : <EmptyChart title="Module activity will appear here" detail="Module charts use your saved analysis records." />}
          </section>
          <section className="card card-pad">
            <div className="card-title-row"><div><h2 className="card-title">Recent analyses</h2><p className="card-description">The latest results in your history</p></div><Link to="/app/history" className="table-action">View history <ArrowRight size={12} /></Link></div>
            {stats.recent_analyses.length ? <div className="table-wrap"><table><thead><tr><th>Dataset / module</th><th>Status</th><th>Gap</th></tr></thead><tbody>{stats.recent_analyses.slice(0, 5).map((item) => <tr key={item.id}><td><Link to={`/app/history?open=${item.id}`}><strong>{item.dataset_name}</strong></Link><div style={{ color: '#829AB0', marginTop: 4 }}>{moduleLabels[item.module]} · {item.metric_column}</div></td><td><span className={statusClass(item.status)}>{statusLabels[item.status]}</span></td><td>{item.relative_gap_percent.toFixed(1)}%</td></tr>)}</tbody></table></div> : <div className="empty-state" style={{ padding: 18 }}><div className="empty-state-icon"><Database size={19} /></div><h3>Start with a dataset</h3><p>Upload a file or use a clearly labeled sample dataset to run your first comparison.</p><Link to="/app/datasets" className="btn btn-secondary btn-sm">Manage datasets <ArrowRight size={13} /></Link></div>}
          </section>
        </div>
      </>}
    </div>
  );
}

function Kpi({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: number; note: string }) {
  return <div className="kpi-card"><div><div className="kpi-label">{label}</div><div className="kpi-value">{value.toLocaleString()}</div><div className="kpi-note">{note}</div></div><div className="kpi-icon">{icon}</div></div>;
}
function EmptyChart({ title, detail }: { title: string; detail: string }) {
  return <div className="empty-state" style={{ height: 220 }}><h3>{title}</h3><p>{detail}</p></div>;
}
