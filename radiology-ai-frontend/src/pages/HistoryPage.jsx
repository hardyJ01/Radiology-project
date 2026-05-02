import { useState, useMemo } from 'react';
import { useReports, reportStore } from '../store/reportStore';
import { toastActions } from '../store/toastStore';
import ReportModal from '../components/ReportModal';
import { downloadReportPDF } from '../utils/pdfGenerator';
import { deleteReport as apiDeleteReport } from '../api/reportApi';

const ROWS_PER_PAGE = 8;

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { dateStyle: 'medium' });
  } catch { return iso; }
}

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString('en-IN', { timeStyle: 'short' });
  } catch { return ''; }
}

function getSeverityBadge(report) {
  const top = [...(report.findings ?? [])].sort((a, b) => b.confidence_score - a.confidence_score)[0];
  if (!top) return <span className="badge badge-gray">—</span>;
  const cls = {
    high:     'badge badge-red',
    moderate: 'badge',
    low:      'badge badge-yellow',
    normal:   'badge badge-green',
  }[top.severity] ?? 'badge badge-gray';
  const style = top.severity === 'moderate' ? { background: '#fff7ed', color: '#9a3412' } : {};
  return <span className={cls} style={style}>{top.severity.toUpperCase()}</span>;
}

export default function HistoryPage() {
  const reports = useReports();
  const [search, setSearch]     = useState('');
  const [filterSev, setFilter]  = useState('all');
  const [page, setPage]         = useState(1);
  const [selected, setSelected] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const matchSearch =
        r.filename.toLowerCase().includes(search.toLowerCase()) ||
        r.model_predicted.toLowerCase().includes(search.toLowerCase()) ||
        r._id.toLowerCase().includes(search.toLowerCase());

      const matchSev =
        filterSev === 'all' ||
        (r.findings ?? []).some((f) => f.severity === filterSev);

      return matchSearch && matchSev;
    });
  }, [reports, search, filterSev]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paginated  = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const stats = useMemo(() => ({
    total:    reports.length,
    high:     reports.filter((r) => (r.findings ?? []).some((f) => f.severity === 'high')).length,
    moderate: reports.filter((r) => (r.findings ?? []).some((f) => f.severity === 'moderate')).length,
    normal:   reports.filter((r) => (r.findings ?? []).every((f) => f.severity === 'normal')).length,
  }), [reports]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this report? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await apiDeleteReport(id).catch(() => {}); 
      reportStore.remove(id);
      toastActions.success('Report deleted.');
      if (selected?._id === id) setSelected(null);
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = (report) => {
    downloadReportPDF(report);
    toastActions.success('PDF downloaded!');
  };

  const handleSearch = (val) => { setSearch(val); setPage(1); };
  const handleFilter = (val) => { setFilter(val); setPage(1); };

  return (
    <div className="container-wide">
      <div className="history-header animate-fade-in" style={{ paddingTop: 40 }}>
        <div>
          <span className="section-tag">Records</span>
          <h1>X-Ray History</h1>
          <p>All uploaded X-rays with AI predictions and downloadable reports</p>
        </div>
        <div className="history-controls">
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              id="history-search"
              type="text"
              placeholder="Search filename or condition..."
              className="search-input"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          <select
            id="severity-filter"
            className="filter-select"
            value={filterSev}
            onChange={(e) => handleFilter(e.target.value)}
          >
            <option value="all">All Severities</option>
            <option value="high">High Risk</option>
            <option value="moderate">Moderate</option>
            <option value="low">Low Risk</option>
            <option value="normal">Normal</option>
          </select>
        </div>
      </div>

      <div className="stats-row animate-fade-up">
        {[
          { icon: '📋', label: 'Total Scans',     value: stats.total,    cls: 'green'  },
          { icon: '🔴', label: 'High Risk',        value: stats.high,     cls: 'red'    },
          { icon: '🟠', label: 'Moderate Risk',    value: stats.moderate, cls: 'orange' },
          { icon: '🟢', label: 'Normal / Low',     value: stats.normal,   cls: 'blue'   },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <div className={`stat-card-icon ${s.cls}`}>{s.icon}</div>
            <div>
              <div className="stat-card-num">{s.value}</div>
              <div className="stat-card-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="table-wrap animate-scale-in">
          <div className="empty-state">
            <div className="empty-state-icon">🩻</div>
            <div className="empty-state-title">
              {reports.length === 0 ? 'No X-rays analyzed yet' : 'No matching records'}
            </div>
            <div className="empty-state-sub">
              {reports.length === 0
                ? 'Go to the Analyze page to upload your first X-ray.'
                : 'Try a different search term or filter.'}
            </div>
          </div>
        </div>
      ) : (
        <div className="table-wrap animate-scale-in">
          <table className="reports-table" id="history-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Preview</th>
                <th>Report ID</th>
                <th>Filename</th>
                <th>Upload Date</th>
                <th>Model Predicted</th>
                <th>Severity</th>
                <th>Confidence</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((report, idx) => {
                const topFinding = [...(report.findings ?? [])].sort(
                  (a, b) => b.confidence_score - a.confidence_score
                )[0];
                const rowNum = (page - 1) * ROWS_PER_PAGE + idx + 1;

                return (
                  <tr key={report._id} style={{ animationDelay: `${idx * 40}ms` }} className="animate-fade-in">
                    <td className="text-muted text-small">{rowNum}</td>
                    <td>
                      {report.image_data ? (
                        <img className="table-thumb" src={report.image_data} alt="thumb" />
                      ) : (
                        <div className="table-thumb-placeholder">🩻</div>
                      )}
                    </td>
                    <td><span className="report-id-link">#{report._id.slice(-8).toUpperCase()}</span></td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--gray-800)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {report.filename}
                      </div>
                      <div className="text-xs text-muted">{report.file_size}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{formatDate(report.upload_date)}</div>
                      <div className="text-xs text-muted">{formatTime(report.upload_date)}</div>
                    </td>
                    <td><span style={{ fontWeight: 600, color: 'var(--green-700)' }}>{report.model_predicted}</span></td>
                    <td>{getSeverityBadge(report)}</td>
                    <td>
                      {topFinding ? (
                        <div style={{ minWidth: 90 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                            {(topFinding.confidence_score * 100).toFixed(1)}%
                          </div>
                          <div className="confidence-bar-track" style={{ height: 4, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden', marginTop: 4 }}>
                            <div
                              className="confidence-bar-fill"
                              style={{
                                width: `${topFinding.confidence_score * 100}%`,
                                background: 'var(--green-500)',
                                height: '100%',
                                borderRadius: 99,
                              }}
                            />
                          </div>
                        </div>
                      ) : '—'}
                    </td>
                    <td>
                      <span className={`badge ${report.status === 'completed' ? 'badge-green' : report.status === 'failed' ? 'badge-red' : 'badge-yellow'}`}>
                        {report.status}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-ghost btn-sm" title="View Report" onClick={() => setSelected(report)}>👁 View</button>
                        <button className="btn btn-primary btn-sm" title="Download PDF" onClick={() => handleDownload(report)}>⬇️ PDF</button>
                        <button className="btn btn-danger btn-sm" title="Delete" disabled={deleting === report._id} onClick={() => handleDelete(report._id)}>
                          {deleting === report._id ? '...' : '🗑'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} className={`page-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
          ))}
          <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}>›</button>
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-center text-muted text-small" style={{ marginTop: 12 }}>
          Showing {Math.min(paginated.length, ROWS_PER_PAGE)} of {filtered.length} record{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {selected && (
        <ReportModal report={selected} onClose={() => setSelected(null)} onDownload={() => handleDownload(selected)} />
      )}
    </div>
  );
}