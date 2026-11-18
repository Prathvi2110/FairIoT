import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowDownToLine, Database, FileSpreadsheet, FileText, LoaderCircle, Search, Trash2, Upload, X } from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';
import { api, ApiError } from '../services/api';
import { formatDate } from '../services/format';
import type { ColumnInfo, Dataset } from '../types';

interface SampleFile { filename: string; description: string; simulated: boolean; }

export function DatasetsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [samples, setSamples] = useState<SampleFile[]>([]);
  const [preview, setPreview] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [datasetName, setDatasetName] = useState('');
  const [query, setQuery] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  async function loadData() {
    setLoading(true); setError('');
    try {
      const [list, sampleList] = await Promise.all([api.get<Dataset[]>('/datasets'), api.get<SampleFile[]>('/datasets/samples')]);
      setDatasets(list); setSamples(sampleList);
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Dataset information could not be loaded.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadData(); }, []);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(''); setNotice(''); setUploading(true);
    const form = new FormData(); form.append('file', file);
    if (datasetName.trim()) form.append('name', datasetName.trim());
    try {
      const created = await api.upload<Dataset>('/datasets', form);
      setNotice(`${created.name} uploaded and validated (${created.row_count.toLocaleString()} rows, ${created.columns.length} columns).`);
      setDatasetName(''); await loadData();
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'The file could not be uploaded.'); }
    finally { setUploading(false); if (fileInput.current) fileInput.current.value = ''; }
  }

  async function showPreview(id: number) {
    setError('');
    try { setPreview(await api.get<Dataset>(`/datasets/${id}`)); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Dataset preview could not be loaded.'); }
  }

  async function removeDataset(item: Dataset) {
    if (!window.confirm(`Delete “${item.name}” and the analysis records that reference it? This cannot be undone.`)) return;
    setDeleting(item.id); setError('');
    try { await api.delete<void>(`/datasets/${item.id}`); setDatasets((current) => current.filter((dataset) => dataset.id !== item.id)); if (preview?.id === item.id) setPreview(null); setNotice(`${item.name} was deleted.`); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Dataset could not be deleted.'); }
    finally { setDeleting(null); }
  }

  const filtered = datasets.filter((item) => `${item.name} ${item.filename}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="page-content fade-in">
      <div className="page-header"><div><h1>Datasets</h1><p>Upload, inspect, and manage private IoT measurements. FairIoT infers columns from each file.</p></div><div className="page-actions"><button className="btn btn-primary btn-sm" onClick={() => fileInput.current?.click()} disabled={uploading}><Upload size={14} />{uploading ? 'Uploading…' : 'Upload dataset'}</button></div></div>
      <input ref={fileInput} className="file-hidden" type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={handleFile} />
      {error && <div className="form-error" role="alert">{error}</div>}{notice && <div className="form-success" role="status">{notice}</div>}
      <div className="dataset-layout">
        <div>
          <section className="card card-pad" style={{ marginBottom: 13 }}>
            <div className="card-title-row"><div><h2 className="card-title">Upload a dataset</h2><p className="card-description">CSV or Excel · 15 MB maximum · up to 500,000 rows</p></div><FileSpreadsheet size={17} color="#0B8F87" /></div>
            <div className="upload-drop"><div className="empty-state-icon" style={{ margin: '0 auto', width: 40, height: 40 }}><Upload size={17} /></div><h3>Bring your IoT data</h3><p>Columns do not need specific names; choose your group and metric later.</p><label className="form-field" style={{ maxWidth: 330, margin: '12px auto' }}><span>Optional dataset name</span><input value={datasetName} onChange={(event) => setDatasetName(event.target.value)} maxLength={180} placeholder="Defaults to the filename" /></label><button className="btn btn-secondary btn-sm" onClick={() => fileInput.current?.click()} disabled={uploading}>{uploading ? <LoaderCircle size={14} className="spinner" /> : <Upload size={14} />}{uploading ? 'Processing file…' : 'Choose CSV or Excel file'}</button></div>
          </section>
          <section className="card">
            <div className="card-pad" style={{ paddingBottom: 12 }}><div className="card-title-row" style={{ marginBottom: 0 }}><div><h2 className="card-title">Your datasets <span style={{ color: '#9FB3C3', fontWeight: 500 }}>({datasets.length})</span></h2><p className="card-description">Rows are private to your account.</p></div><label style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #D9E6EE', borderRadius: 8, padding: '0 8px', minHeight: 32 }}><Search size={13} color="#9FB3C3" /><input aria-label="Search datasets" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" style={{ border: 0, outline: 0, width: 125, fontSize: 10, color: '#486581' }} /></label></div></div>
            {loading ? <LoadingScreen label="Loading datasets" /> : datasets.length === 0 ? <div className="empty-state"><div className="empty-state-icon"><Database size={20} /></div><h3>No datasets uploaded yet</h3><p>Upload a CSV or Excel file, or download one of the simulated samples and upload it here.</p><button onClick={() => fileInput.current?.click()} className="btn btn-primary btn-sm"><Upload size={13} />Upload a dataset</button></div> : filtered.length === 0 ? <div className="empty-state"><h3>No datasets match this search</h3><button className="btn btn-secondary btn-sm" onClick={() => setQuery('')}>Clear search</button></div> : <div className="table-wrap"><table><thead><tr><th>Dataset</th><th>Rows / columns</th><th>Data quality</th><th>Added</th><th>Actions</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><button className="table-action" onClick={() => void showPreview(item.id)}><strong>{item.name}</strong></button><div style={{ color: '#829AB0', marginTop: 4, fontSize: 9 }}><FileText size={11} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />{item.filename}</div></td><td><strong>{item.row_count.toLocaleString()}</strong><span style={{ color: '#829AB0' }}> rows</span><div style={{ color: '#829AB0', marginTop: 4 }}>{item.columns.length} columns</div></td><td><div className="dataset-stats"><span className="dataset-stat">{item.missing_count.toLocaleString()} missing</span><span className="dataset-stat">{item.duplicate_count.toLocaleString()} duplicates</span></div></td><td>{formatDate(item.created_at)}</td><td><div style={{ display: 'flex', gap: 4 }}><button className="icon-button" title="Preview dataset" aria-label={`Preview ${item.name}`} onClick={() => void showPreview(item.id)}><Search size={14} /></button><button className="icon-button" title="Delete dataset" aria-label={`Delete ${item.name}`} disabled={deleting === item.id} onClick={() => void removeDataset(item)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div>}
          </section>
        </div>
        <aside className="card card-pad">
          <div className="card-title-row"><div><h2 className="card-title">Sample datasets</h2><p className="card-description">Generated and simulated, for demonstration.</p></div><ArrowDownToLine size={16} color="#0B8F87" /></div>
          <div className="sample-list">{samples.map((sample) => <div className="sample-row" key={sample.filename}><FileSpreadsheet size={15} /><div><strong>{sample.filename.replace('_sample.csv', '').split('_').join(' ')}</strong><span>{sample.description}</span><span>SIMULATED DATA</span></div><a className="icon-button" href={`/api/datasets/samples/${sample.filename}`} title="Download sample CSV" aria-label={`Download ${sample.filename}`}><ArrowDownToLine size={14} /></a></div>)}{samples.length === 0 && <p className="card-description">Sample files are not available.</p>}</div>
          <div className="callout" style={{ marginTop: 14 }}><AlertTriangle size={14} />Sample records are synthetic. They demonstrate the workflow and do not represent real hardware observations.</div>
        </aside>
      </div>
      {preview && <div className="modal-backdrop" role="presentation" onClick={() => setPreview(null)}><div className="modal-panel" role="dialog" aria-modal="true" aria-label={`${preview.name} preview`} onClick={(event) => event.stopPropagation()}><div className="card-title-row"><div><h2 className="card-title">{preview.name}</h2><p className="card-description">{preview.row_count.toLocaleString()} rows · preview of first {preview.preview_rows?.length || 0}</p></div><button className="icon-button" onClick={() => setPreview(null)} aria-label="Close preview"><X size={16} /></button></div><div className="dataset-stats" style={{ marginBottom: 12 }}><span className="dataset-stat">{preview.missing_count.toLocaleString()} missing values</span><span className="dataset-stat">{preview.duplicate_count.toLocaleString()} duplicate rows</span></div><div className="table-wrap"><table><thead><tr>{preview.columns.map((column) => <th key={column.name}>{column.name}<div style={{ fontWeight: 400, marginTop: 3 }}>{column.kind} · {column.dtype}</div></th>)}</tr></thead><tbody>{preview.preview_rows?.map((row, index) => <tr key={index}>{preview.columns.map((column) => <td key={column.name}>{row[column.name] === null || row[column.name] === undefined ? <span style={{ color: '#BCCCDC' }}>—</span> : String(row[column.name])}</td>)}</tr>)}</tbody></table></div><div style={{ marginTop: 15 }}><strong style={{ fontSize: 10, color: '#486581' }}>Column profile</strong><div className="table-wrap"><table><thead><tr><th>Column</th><th>Type</th><th>Present</th><th>Missing</th><th>Unique</th></tr></thead><tbody>{preview.columns.map((column: ColumnInfo) => <tr key={column.name}><td><strong>{column.name}</strong></td><td>{column.kind}</td><td>{column.non_null_count}</td><td>{column.missing_count}</td><td>{column.unique_count}</td></tr>)}</tbody></table></div></div></div></div>}
    </div>
  );
}
