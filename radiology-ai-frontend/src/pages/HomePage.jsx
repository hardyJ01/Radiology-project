import { Link } from 'react-router-dom';

const DETECTIONS = [
  'Pneumonia', 'Pleural Effusion', 'Cardiomegaly', 'Atelectasis',
  'Consolidation', 'Pulmonary Edema', 'Fractures', 'Tuberculosis',
  'Nodules / Masses', 'Normal',
];

const FEATURES = [
  {
    icon: '⚡',
    title: 'Fast AI Analysis',
    desc: 'Upload your X-ray and receive a structured diagnostic report in seconds using our GIT-CXR model fine-tuned on 227,000+ real radiology cases.',
  },
  {
    icon: '🔬',
    title: 'Multi-Disease Detection',
    desc: 'Detects 10 common chest conditions with confidence scores. Each finding includes severity classification and probability estimates.',
  },
  {
    icon: '📄',
    title: 'PDF Report Download',
    desc: 'Download a structured report with findings, AI summary, and confidence scores — formatted like a real radiology report.',
  },
  {
    icon: '📋',
    title: 'Full History Dashboard',
    desc: 'All your uploaded X-rays are stored locally. Browse, filter, and revisit past analyses anytime with one-click access.',
  },
  {
    icon: '🛡️',
    title: 'Standard Formats',
    desc: 'Accepts standard JPEG and PNG uploads. The backend handles preprocessing — resizing, CLAHE enhancement — automatically.',
  },
  {
    icon: '🔒',
    title: 'Privacy First',
    desc: 'Your data stays on your own server. No cloud dependency. Images never leave your infrastructure.',
  },
];

const WORKFLOW = [
  { icon: '📤', title: 'Upload X-Ray',  desc: 'Drag & drop or browse your chest X-ray image (JPEG / PNG)' },
  { icon: '⚙️', title: 'AI Processing', desc: 'Model runs preprocessing and forward pass inference' },
  { icon: '📊', title: 'Review Report',  desc: 'View findings, confidence scores and AI-written summary' },
  { icon: '⬇️', title: 'Download PDF',  desc: 'Export a formatted radiology report as a PDF document' },
];

export default function HomePage() {
  return (
    <>
      <section className="hero-section">
        <div className="container">
          <div className="hero-badge animate-fade-in">
            <span>🩺</span> AI-Powered Chest X-Ray Analysis
          </div>

          <h1 className="hero-title animate-fade-up">
            Instant <span className="highlight">Radiology Reports</span>
            <br />from Your X-Ray Images
          </h1>

          <p className="hero-subtitle animate-fade-up">
            Upload a chest X-ray and let our AI model — fine-tuned on 227,827 real radiology cases —
            generate a structured diagnostic report with findings, confidence scores, and impressions.
          </p>

          <div className="hero-cta animate-fade-up">
            <Link to="/analyze" className="btn btn-primary btn-lg">
              🩻 Start Analysis
            </Link>
            <Link to="/history" className="btn btn-outline btn-lg">
              📋 View History
            </Link>
          </div>

          <div className="hero-stats animate-fade-up">
            {[
              { value: '227K+', label: 'Training X-Rays' },
              { value: '10',    label: 'Diseases Detected' },
              { value: '~2s',   label: 'Analysis Time' },
              { value: '100%',  label: 'Local & Private' },
            ].map((s) => (
              <div className="stat-item" key={s.label}>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '0 0 8px' }}>
        <div className="container">
          <div className="disclaimer-banner">
            <span className="disclaimer-icon">⚠️</span>
            <div>
              <div className="disclaimer-title">Medical Disclaimer</div>
              <div className="disclaimer-text">
                This tool provides AI-assisted <strong>preliminary analysis only</strong>.
                It is NOT a substitute for professional medical diagnosis.
                Always consult a licensed radiologist for clinical decisions.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="flow-section">
        <div className="container">
          <div className="text-center">
            <span className="section-tag">How It Works</span>
            <h2 style={{ fontSize: '1.8rem', marginBottom: 8 }}>Four Steps to Your Report</h2>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.95rem' }}>
              From upload to downloadable PDF in under a minute
            </p>
          </div>

          <div className="flow-steps">
            {WORKFLOW.map((step, i) => (
              <div className="flow-step animate-fade-up" key={step.title} style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flow-step-icon">{step.icon}</div>
                <div className="flow-step-title">{step.title}</div>
                <div className="flow-step-desc">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="container">
          <div className="text-center">
            <span className="section-tag">Features</span>
            <h2 style={{ fontSize: '1.8rem', marginBottom: 8 }}>Everything You Need</h2>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.95rem' }}>
              A complete radiology AI workflow built for medical teams and researchers
            </p>
          </div>

          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div className="feature-card animate-fade-up" key={f.title} style={{ animationDelay: `${i * 60}ms` }}>
                <div className="feature-icon-wrap">{f.icon}</div>
                <div className="feature-title">{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="detects-section">
        <div className="container text-center">
          <span className="section-tag">Detection Coverage</span>
          <h2 style={{ fontSize: '1.8rem', marginBottom: 8 }}>What Can It Detect?</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.95rem', marginBottom: 0 }}>
            Trained on real MIMIC-CXR cases — covering the most common chest conditions
          </p>
          <div className="detects-grid">
            {DETECTIONS.map((d) => (
              <span className="detect-tag animate-fade-in" key={d}>
                <span style={{ color: 'var(--green-500)' }}>✓</span> {d}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: 'var(--green-600)', padding: '60px 0' }}>
        <div className="container text-center">
          <h2 style={{ fontSize: '2rem', color: 'white', marginBottom: 12 }}>
            Ready to Analyze Your X-Ray?
          </h2>
          <p style={{ color: 'var(--green-100)', marginBottom: 28, fontSize: '1rem' }}>
            Upload in seconds. Get a comprehensive radiology report instantly.
          </p>
          <Link to="/analyze" className="btn btn-lg" style={{ background: 'white', color: 'var(--green-700)' }}>
            🩻 Get Started — It's Free
          </Link>
        </div>
      </section>
    </>
  );
}