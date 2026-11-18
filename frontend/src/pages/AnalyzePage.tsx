import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownToLine, BarChart3, CheckCircle2, CircleHelp, FileText, LoaderCircle, ShieldAlert, SlidersHorizontal } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, ErrorBar, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { LoadingScreen } from '../components/LoadingScreen';
import { buildGroupChartData, fairnessChartColors } from '../charts/fairness';
import { api, ApiError } from '../services/api';
import { moduleLabels, statusClass } from '../services/format';
import type { AnalysisResult, Dataset, ModuleKey } from '../types';

const moduleDetails: Record<ModuleKey, { short: string; metrics: string; caution: string }> = {
  sensor: { short: 'Sensing performance across device groups', metrics: 'Response time · accuracy · calibration · failure rate · missing readings · environmental sensitivity', caution: 'Accuracy and response time can depend on calibration and operating conditions.' },
  actuator: { short: 'Command execution and response consistency', metrics: 'Activation delay · command success · response consistency · failure rate · device performance', caution: 'Command mix, safety requirements, and load can change expected actuator behavior.' },
  communication: { short: 'Network quality and connection reliability', metrics: 'Latency · packet loss · bandwidth · reliability · communication delay · network availability', caution: 'Network distance, congestion, and access technology can shape observed differences.' },
  resource_allocation: { short: 'Distribution of compute, memory, energy, and bandwidth', metrics: 'Bandwidth · CPU utilization · memory · energy · processing distribution · resource availability', caution: 'Allocation fairness may depend on workload, service class, and resource demand.' },
};
const modules: ModuleKey[] = ['sensor', 'actuator', 'communication', 'resource_allocation'];

export function AnalyzePage() {
  const { module: routeModule } = useParams();
  const initialModule = modules.includes(routeModule as ModuleKey) ? routeModule as ModuleKey : 'sensor';
  const [module, setModule] = useState<ModuleKey>(initialModule);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [datasetId, setDatasetId] = useState('');
  const [groupColumn, setGroupColumn] = useState('');
  const [metricColumn, setMetricColumn] = useState('');
  const [direction, setDirection] = useState<'higher' | 'lower'>('higher');
  const [threshold, setThreshold] = useState('10');
  const [minimumSize, setMinimumSize] = useState('5');
  const [contextColumn, setContextColumn] = useState('');
  const [distributionView, setDistributionView] = useState(true);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState('');
  const [error, setError] = useState('');
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    if (routeModule && modules.includes(routeModule as ModuleKey)) setModule(routeModule as ModuleKey);
  }, [routeModule]);
  useEffect(() => {
    api.get<Dataset[]>('/datasets').then((data) => {
      setDatasets(data);
      if (data.length) setDatasetId((old) => old || String(data[0].id));
    }).catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Dataset list could not be loaded.')).finally(() => setLoading(false));
  }, []);
  const dataset = datasets.find((item) => String(item.id) === datasetId);
  const numericColumns = useMemo(() => dataset?.columns.filter((column) => column.kind === 'numeric') || [], [dataset]);
  const groupColumns = useMemo(() => dataset?.columns || [], [dataset]);
  useEffect(() => {
    if (!dataset) { setGroupColumn(''); setMetricColumn(''); setContextColumn(''); return; }
    const preferredGroup = dataset.columns.find((column) => column.kind === 'categorical')?.name || dataset.columns[0]?.name || '';
    setGroupColumn((old) => dataset.columns.some((column) => column.name === old) ? old : preferredGroup);
    setMetricColumn((old) => numericColumns.some((column) => column.name === old) ? old : numericColumns[0]?.name || '');
    setContextColumn(''); setResult(null);
  }, [dataset?.id, numericColumns, dataset]);

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setDownloadError(''); setResult(null);
    if (!datasetId || !groupColumn || !metricColumn) { setError('Choose a dataset, a group column, and a numeric metric.'); return; }
    setRunning(true);
    try {
      const response = await api.post<AnalysisResult>('/analyses', {
        dataset_id: Number(datasetId), module, group_column: groupColumn, metric_column: metricColumn,
        direction, threshold_percent: Number(threshold), minimum_group_size: Number(minimumSize), context_column: contextColumn || null,
      });
      setResult(response);
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Analysis could not be completed.'); }
    finally { setRunning(false); }
  }
  async function download(format: 'csv' | 'pdf') {
    if (!result) return;
    setDownloadBusy(format); setDownloadError('');
    try { await api.download(`/reports/${result.id}/${format}`, `fairiot-analysis-${result.id}.${format}`); }
    catch (caught) { setDownloadError(caught instanceof ApiError ? caught.message : 'Report could not be downloaded.'); }
    finally { setDownloadBusy(''); }
  }
  const chosenModule = moduleDetails[module];
  const chartData = result ? buildGroupChartData(result.result.groups, result.result.context_adjustment.applied) : [];
  const pageTitle = routeModule && modules.includes(routeModule as ModuleKey) ? moduleLabels[module] : 'Run a fairness analysis';

  if (loading) return <div className="page-content"><LoadingScreen label="Loading your datasets" /></div>;
  return (
    <div className="page-content fade-in">
      <div className="page-header"><div><h1>{pageTitle}</h1><p>{chosenModule.short}. Choose a dataset and define a comparison that fits the question.</p></div></div>
      {error && <div className="form-error" role="alert">{error}</div>}
      {datasets.length === 0 ? <div className="card empty-state"><div className="empty-state-icon"><BarChart3 size={21} /></div><h3>Upload a dataset before analyzing</h3><p>FairIoT does not invent or assume performance measurements. Add your CSV or Excel data first.</p><a href="/app/datasets" className="btn btn-primary btn-sm">Open datasets</a></div> : <div className="analysis-layout">
        <form className="card analysis-form" onSubmit={run}>
          <div className="card-title-row"><div><h2 className="card-title">Define your comparison</h2><p className="card-description">Every result records these choices.</p></div><SlidersHorizontal size={16} color="#0B8F87" /></div>
          {!routeModule && <label className="form-field"><span>Fairness module</span><select value={module} onChange={(event) => { setModule(event.target.value as ModuleKey); setResult(null); }}><option value="sensor">Sensor fairness</option><option value="actuator">Actuator fairness</option><option value="communication">Communication fairness</option><option value="resource_allocation">Resource allocation fairness</option></select></label>}
          {routeModule && <div className="module-hint"><strong>{moduleLabels[module]}</strong><span>{chosenModule.metrics}</span></div>}
          <label className="form-field"><span>Dataset</span><select required value={datasetId} onChange={(event) => setDatasetId(event.target.value)}><option value="" disabled>Choose a dataset</option>{datasets.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.row_count} rows</option>)}</select></label>
          <label className="form-field"><span>Group by</span><select required value={groupColumn} onChange={(event) => setGroupColumn(event.target.value)}><option value="" disabled>Choose a column</option>{groupColumns.map((column) => <option key={column.name} value={column.name}>{column.name} · {column.kind}</option>)}</select><small className="form-hint">Each distinct value is compared as a group.</small></label>
          <label className="form-field"><span>Performance metric</span><select required value={metricColumn} onChange={(event) => setMetricColumn(event.target.value)}><option value="" disabled>{numericColumns.length ? 'Choose a numeric metric' : 'No numeric columns detected'}</option>{numericColumns.map((column) => <option key={column.name} value={column.name}>{column.name}</option>)}</select></label>
          <label className="form-field"><span>Metric direction</span><select value={direction} onChange={(event) => setDirection(event.target.value as 'higher' | 'lower')}><option value="higher">Higher is better</option><option value="lower">Lower is better</option></select></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label className="form-field"><span>Gap threshold (%)</span><input required type="number" min="0" max="500" step="0.1" value={threshold} onChange={(event) => setThreshold(event.target.value)} /></label>
            <label className="form-field"><span>Minimum per group</span><input required type="number" min="2" max="1000" step="1" value={minimumSize} onChange={(event) => setMinimumSize(event.target.value)} /></label>
          </div>
          <label className="form-field"><span>Optional context standardization</span><select value={contextColumn} onChange={(event) => setContextColumn(event.target.value)}><option value="">No context adjustment</option>{groupColumns.filter((column) => column.name !== groupColumn && column.name !== metricColumn).map((column) => <option key={column.name} value={column.name}>{column.name} · {column.kind}</option>)}</select><small className="form-hint">If groups share context strata, group means are standardized to their pooled observed distribution.</small></label>
          <div className="callout" style={{ margin: '4px 0 14px' }}><CircleHelp size={14} />{chosenModule.caution}</div>
          <button className="btn btn-primary form-submit" type="submit" disabled={running || !metricColumn}>{running ? <><LoaderCircle size={14} className="spinner" />Calculating…</> : <><BarChart3 size={14} />Run analysis</>}</button>
        </form>

        <section className="analysis-result">
          {!result && <div className="card empty-state" style={{ minHeight: 300 }}><div className="empty-state-icon"><SlidersHorizontal size={19} /></div><h3>Your comparison will appear here</h3><p>Group summaries and fairness status are calculated by the API after you run the selected test.</p></div>}
          {result && <>
            <div className={`result-banner ${result.status === 'fair_under_test' ? 'fair' : result.status === 'potential_disparity' ? 'potential' : 'insufficient'}`}><div style={{ color: result.status === 'potential_disparity' ? '#B77B1D' : '#0B8F87' }}>{result.status === 'potential_disparity' ? <ShieldAlert size={19} /> : result.status === 'insufficient_data' ? <AlertTriangle size={19} /> : <CheckCircle2 size={19} />}</div><div style={{ flex: 1 }}><h3>{result.result.status_label}</h3><p>{result.result.explanation}</p></div><span className={statusClass(result.status)}>{result.result.status_label}</span></div>
            <div className="result-metrics"><Metric label="Compared groups" value={result.result.group_count.toString()} /><Metric label="Usable observations" value={result.result.total_observations.toLocaleString()} /><Metric label="Relative performance gap" value={`${result.result.relative_gap_percent.toFixed(2)}%`} /><Metric label="Gap threshold" value={`${result.threshold_percent.toFixed(2)}%`} /></div>
            <section className="card card-pad" style={{ marginBottom: 12 }}><div className="card-title-row"><div><h2 className="card-title">Group performance comparison</h2><p className="card-description">{result.result.comparison_basis}; {result.direction}-is-better. {result.result.context_adjustment.applied ? 'Context-standardized means are shown; bars are means.' : distributionView ? 'Bars show means; whiskers show observed minimum-to-maximum spread.' : 'Bars show means; whiskers show approximate 95% t-intervals.'}</p></div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}><button className={`btn ${distributionView ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setDistributionView(true)} title="Show observed min-to-max spread">Range</button><button className={`btn ${!distributionView ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setDistributionView(false)} title="Show approximate confidence intervals">95% CI</button><button className="btn btn-secondary btn-sm" onClick={() => void download('csv')} disabled={!!downloadBusy}><FileText size={13} />{downloadBusy === 'csv' ? 'Preparing…' : 'CSV'}</button><button className="btn btn-secondary btn-sm" onClick={() => void download('pdf')} disabled={!!downloadBusy}><ArrowDownToLine size={13} />{downloadBusy === 'pdf' ? 'Preparing…' : 'PDF'}</button></div></div>
              {downloadError && <div className="form-error">{downloadError}</div>}
              <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 12, right: 12, left: -18, bottom: 4 }}><CartesianGrid stroke="#EDF2F5" vertical={false} /><XAxis dataKey="group" tick={{ fill: '#627D98', fontSize: 9 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#829AB0', fontSize: 9 }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => [Number(value).toFixed(3), result.result.context_adjustment.applied ? 'Context-standardized mean' : 'Group mean']} labelStyle={{ color: '#102A43', fontWeight: 700 }} contentStyle={{ border: '1px solid #E1EAF0', borderRadius: 9, fontSize: 10 }} /><ReferenceLine y={0} stroke="#DCE7ED" /><Bar dataKey="value" name={result.result.context_adjustment.applied ? 'Context-standardized mean' : 'Group mean'} radius={[5, 5, 0, 0]} maxBarSize={56}>{chartData.map((entry, index) => <Cell key={entry.group} fill={fairnessChartColors[index % fairnessChartColors.length]} />)}{!result.result.context_adjustment.applied && <ErrorBar dataKey={distributionView ? 'observedRange' : 'confidenceRange'} direction="y" width={5} stroke="#486581" strokeWidth={1} />}</Bar></BarChart></ResponsiveContainer></div>
            </section>
            <section className="card card-pad" style={{ marginBottom: 12 }}><div className="card-title-row"><div><h2 className="card-title">Metric comparison table</h2><p className="card-description">Approximate 95% t-intervals shown when group sample size allows.</p></div></div><div className="table-wrap"><table><thead><tr><th>Group</th><th>n</th><th>Mean</th><th>Median</th><th>Min–max</th><th>Std dev</th><th>Approx. 95% CI</th>{result.result.context_adjustment.applied && <th>Standardized mean</th>}</tr></thead><tbody>{result.result.groups.map((group) => <tr key={group.group}><td><strong>{group.group}</strong>{group.below_minimum_sample_size && <div style={{ color: '#B77B1D', fontSize: 9, marginTop: 4 }}>Below minimum n</div>}</td><td>{group.sample_size}</td><td>{group.mean.toFixed(3)}</td><td>{group.median.toFixed(3)}</td><td>{group.minimum.toFixed(3)}–{group.maximum.toFixed(3)}</td><td>{group.std_dev === null ? '—' : group.std_dev.toFixed(3)}</td><td>{group.confidence_interval_95 ? `${group.confidence_interval_95[0].toFixed(3)}–${group.confidence_interval_95[1].toFixed(3)}` : 'Not estimable'}</td>{result.result.context_adjustment.applied && <td>{group.context_standardized_mean?.toFixed(3) ?? '—'}</td>}</tr>)}</tbody></table></div></section>
            <div className="callout"><AlertTriangle size={14} /><span><strong>Interpret with context.</strong> {result.result.caveat} {result.result.context_adjustment.note}</span></div>
          </>}
        </section>
      </div>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="result-metric"><span>{label}</span><strong>{value}</strong></div>;
}
