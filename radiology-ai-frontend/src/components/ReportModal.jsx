import FindingsList from './FindingsList';

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      dateStyle: 'medium', timeStyle: 'short',
    });
  } catch { return iso; }
}

export default function ReportModal({ report, onClose, onDownload }) {
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" id="report-modal-content">
        <div className="modal-header">
          <div>
            <div className="modal-title">📋 Analysis Report</div>
            <div className="text-small text-muted" style={{ marginTop: 2 }}>
              ID: {report._id}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={onDownload}>
              ⬇️ Download PDF
            </button>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="modal-body">
          {report.image_data && (
            <div style={{ marginBottom: 20 }}>
              <div className="report-panel-title">X-Ray Image</div>
              <img
                src={report.image_data}
                alt="X-Ray"
                style={{
                  width: '100%',
                  maxHeight: 280,
                  objectFit: 'contain',
                  background: '#111',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                }}
              />
            </div>
          )}

          <div className="report-meta-grid" style={{ marginBottom: 20 }}>
            {[
              { label: 'File Name', value: report.filename },
              { label: 'File Size', value: report.file_size },
              { label: 'Upload Date', value: formatDate(report.upload_date) },
              { label: 'Processing', value: `${report.processing_time_ms} ms` },
              { label: 'Model', value: report.model_predicted, full: true },
              { label: 'Status', value: report.status.toUpperCase() },
            ].map((m, i) => (
              <div key={i} className="report-meta-item" style={m.full ? { gridColumn: '1/-1' } : {}}>
                <div className="report-meta-label">{m.label}</div>
                <div className="report-meta-value">{m.value}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 20 }}>
            <div className="report-panel-title">AI Summary</div>
            <div className="ai-summary-box">{report.ai_summary}</div>
          </div>

          <div>
            <div className="report-panel-title">Findings & Confidence Scores</div>
            <FindingsList findings={report.findings} />
          </div>
        </div>
      </div>
    </div>
  );
}