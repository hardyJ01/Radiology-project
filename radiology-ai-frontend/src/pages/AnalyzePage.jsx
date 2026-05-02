import { useState, useRef, useCallback, useEffect } from 'react';
import { reportStore } from '../store/reportStore';
import { toastActions } from '../store/toastStore';
import FindingsList from '../components/FindingsList';
import { downloadReportPDF } from '../utils/pdfGenerator';
import { uploadXray } from '../api/reportApi';

const ANALYSIS_STEPS = [
  'Validating image format...',
  'Preprocessing X-ray (resize + CLAHE)...',
  'Loading AI model...',
  'Running inference pass...',
  'Extracting disease findings...',
  'Generating AI summary text...',
  'Calculating confidence scores...',
  'Finalizing report...',
];

function mockAnalysis(file) {
  const conditions = [
    ['Pneumonia',        0.82, 'high'    ],
    ['Pleural Effusion', 0.45, 'moderate'],
    ['Atelectasis',      0.31, 'low'     ],
    ['Cardiomegaly',     0.67, 'moderate'],
    ['Consolidation',    0.22, 'low'     ],
    ['Normal',           0.18, 'normal'  ],
  ];

  const findings = conditions.map(([disease_name, confidence_score, severity]) => ({
    disease_name, confidence_score, severity,
  }));

  const topFinding = [...findings].sort((a, b) => b.confidence_score - a.confidence_score)[0];

  return {
    _id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    filename: file.name,
    file_size: `${(file.size / 1024).toFixed(1)} KB`,
    upload_date: new Date().toISOString(),
    status: 'completed',
    model_predicted: topFinding.disease_name,
    ai_summary:
      `Findings: The chest X-ray demonstrates patchy consolidation in the right lower lobe with increased opacity, ` +
      `consistent with community-acquired pneumonia (confidence ${(topFinding.confidence_score * 100).toFixed(0)}%). ` +
      `Mild blunting of the right costophrenic angle suggesting early pleural effusion. ` +
      `Cardiac silhouette is mildly enlarged. No pneumothorax identified. ` +
      `\n\nImpression: Findings most consistent with right lower lobe pneumonia with possible early pleural effusion. ` +
      `Clinical correlation and follow-up imaging recommended after antibiotic therapy.`,
    processing_time_ms: Math.floor(Math.random() * 800) + 900,
    findings,
  };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AnalyzePage() {
  const [file, setFile]             = useState(null);
  const [preview, setPreview]       = useState(null);
  const [dragging, setDragging]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [progress, setProgress]     = useState(0);
  const [stepIdx, setStepIdx]       = useState(-1);
  const [report, setReport]         = useState(null);
  const [formData, setFormData]     = useState({ age: '', gender: 'Male', symptoms: '' });
  const inputRef = useRef(null);

  useEffect(() => {
    if (!loading) { setProgress(0); setStepIdx(-1); return; }
    let step = 0;
    const total = ANALYSIS_STEPS.length;
    const interval = setInterval(() => {
      step++;
      setStepIdx(step - 1);
      setProgress(Math.round((step / total) * 100));
      if (step >= total) clearInterval(interval);
    }, 340);
    return () => clearInterval(interval);
  }, [loading]);

  const acceptFile = useCallback((f) => {
    if (!f.type.startsWith('image/')) {
      toastActions.error('Please upload a JPEG or PNG image.');
      return;
    }
    setFile(f);
    setReport(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  }, []);

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) acceptFile(f);
  };

  const onInputChange = (e) => {
    const f = e.target.files[0];
    if (f) acceptFile(f);
  };

  const runAnalysis = async () => {
    if (!file) return;
    setLoading(true);
    setReport(null);

    try {
      let result;
      try {
        result = await uploadXray(file, formData.age, formData.gender, formData.symptoms);
      } catch {
        await new Promise((res) => setTimeout(res, ANALYSIS_STEPS.length * 340 + 300));
        result = mockAnalysis(file);
        toastActions.info('Backend offline — showing demo results');
      }

      result.image_data = preview ?? undefined;
      reportStore.add(result);
      setReport(result);
      toastActions.success('Analysis complete! Report ready.');
    } catch (err) {
      toastActions.error('Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetUpload = () => {
    setFile(null); setPreview(null); setReport(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="container" style={{ maxWidth: 860 }}>
      <div className="analyze-header">
        <span className="section-tag">X-Ray Analysis</span>
        <h1>Upload & Analyze X-Ray</h1>
        <p>Drag and drop your chest X-ray image below, fill in the details, and click Analyze.</p>
      </div>

      {!report && !loading && (
        <div className="upload-zone-wrapper animate-fade-up">
          
          <div className="mb-6 grid grid-cols-3 gap-4">
              <input type="number" placeholder="Age" onChange={e => setFormData({...formData, age: e.target.value})} className="input-field" style={{padding: "10px", borderRadius: "5px", border: "1px solid #ccc"}} />
              <select onChange={e => setFormData({...formData, gender: e.target.value})} className="input-field" style={{padding: "10px", borderRadius: "5px", border: "1px solid #ccc"}}>
                <option>Male</option><option>Female</option>
              </select>
              <textarea placeholder="Symptoms" onChange={e => setFormData({...formData, symptoms: e.target.value})} className="input-field" style={{padding: "10px", borderRadius: "5px", border: "1px solid #ccc", gridColumn: "span 3"}} />
          </div>

          {!file ? (
            <div
              id="upload-dropzone"
              className={`upload-zone${dragging ? ' dragging' : ''}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <div className="upload-icon-wrap">🩻</div>
              <div className="upload-zone-title">Drop your X-ray here</div>
              <div className="upload-zone-sub">or click to browse files</div>
              <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
                📂 Choose File
              </button>
              <div className="upload-zone-formats">Accepted formats: JPEG · PNG · up to 20 MB</div>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                className="upload-input"
                onChange={onInputChange}
                id="xray-file-input"
                style={{display: "none"}}
              />
            </div>
          ) : (
            <div className="preview-card">
              <div className="preview-image-wrap">
                <img src={preview} alt="X-ray preview" />
              </div>
              <div className="preview-details">
                <div className="preview-filename">📄 {file.name}</div>
                <div className="preview-meta">
                  Size: {formatBytes(file.size)} · Type: {file.type}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <span className="badge badge-green">✓ Ready to analyze</span>
                </div>
                <div className="preview-actions">
                  <button id="analyze-btn" className="btn btn-primary btn-lg" onClick={runAnalysis}>
                    🔬 Analyze X-Ray
                  </button>
                  <button className="btn btn-ghost" onClick={resetUpload}>
                    🗑 Remove
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="analysis-loading animate-fade-in">
          <div className="loading-spinner-large" />
          <div className="loading-title">Analyzing Your X-Ray...</div>
          <div className="loading-sub">Please wait while the AI model processes your image</div>

          <div className="loading-steps">
            {ANALYSIS_STEPS.map((step, i) => (
              <div
                key={i}
                className={`loading-step${i < stepIdx ? ' done' : i === stepIdx ? ' active' : ''}`}
              >
                <div className={`step-dot${i < stepIdx ? ' done' : i === stepIdx ? ' active' : ''}`}>
                  {i < stepIdx ? '✓' : i + 1}
                </div>
                {step}
              </div>
            ))}
          </div>

          <div className="progress-bar-wrap" style={{ marginTop: 24 }}>
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-muted text-small" style={{ marginTop: 8 }}>{progress}% complete</div>
        </div>
      )}

      {report && !loading && (
        <div className="report-section">
          <div className="report-top-bar">
            <div>
              <span className="section-tag">Analysis Complete</span>
              <h2 className="report-title">Diagnostic Report</h2>
            </div>
            <div className="report-actions">
              <button
                id="download-pdf-btn"
                className="btn btn-primary"
                onClick={() => { downloadReportPDF(report); toastActions.success('PDF downloaded!'); }}
              >
                ⬇️ Download PDF
              </button>
              <button className="btn btn-outline" onClick={resetUpload}>
                🩻 New Analysis
              </button>
            </div>
          </div>

          <div className="report-grid">
            <div className="report-xray-panel">
              <div className="report-panel-title">X-Ray Image</div>
              {preview && <img src={preview} alt="Analyzed X-ray" />}

              <div className="report-meta-grid">
                {[
                  { label: 'Filename',   value: report.filename },
                  { label: 'Size',       value: report.file_size },
                  { label: 'Date',       value: new Date(report.upload_date).toLocaleDateString() },
                  { label: 'Speed',      value: `${report.processing_time_ms} ms` },
                ].map((m) => (
                  <div className="report-meta-item" key={m.label}>
                    <div className="report-meta-label">{m.label}</div>
                    <div className="report-meta-value">{m.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="report-panel">
                <div className="report-panel-title">Primary Prediction</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '2rem' }}>🔬</span>
                  <div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                      {report.model_predicted}
                    </div>
                    <span className="badge badge-green">✅ AI Predicted</span>
                  </div>
                </div>
              </div>

              <div className="report-panel">
                <div className="report-panel-title">AI Summary</div>
                <div className="ai-summary-box">{report.ai_summary}</div>
              </div>

              <div className="report-panel">
                <div className="report-panel-title">
                  Findings ({report.findings?.length ?? 0})
                </div>
                <FindingsList findings={report.findings} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}