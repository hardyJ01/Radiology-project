const SEVERITY_COLOR = {
  normal:   '#22c55e',
  low:      '#facc15',
  moderate: '#f97316',
  high:     '#ef4444',
};

const SEVERITY_LABEL = {
  normal:   'Normal',
  low:      'Low Risk',
  moderate: 'Moderate',
  high:     'High Risk',
};

function badgeClass(severity) {
  if (severity === 'normal')   return 'badge badge-green';
  if (severity === 'low')      return 'badge badge-yellow';
  if (severity === 'moderate') return 'badge';
  return 'badge badge-red';
}

export default function FindingsList({ findings }) {
  if (!findings || findings.length === 0) {
    return <p className="text-muted text-small">No findings available.</p>;
  }

  return (
    <div className="findings-list">
      {findings.map((f, i) => (
        <div
          key={i}
          className={`finding-item severity-${f.severity}`}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="finding-header">
            <span className="finding-name">{f.disease_name}</span>
            <span className={badgeClass(f.severity)}>
              {SEVERITY_LABEL[f.severity] ?? f.severity}
            </span>
          </div>

          <div className="confidence-bar-wrap">
            <div className="confidence-bar-track">
              <div
                className="confidence-bar-fill"
                style={{
                  width: `${(f.confidence_score * 100).toFixed(0)}%`,
                  background: SEVERITY_COLOR[f.severity] ?? '#22c55e',
                }}
              />
            </div>
            <div className="confidence-label">
              Confidence: {(f.confidence_score * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}