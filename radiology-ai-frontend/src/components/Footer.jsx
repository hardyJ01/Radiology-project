export default function Footer() {
  return (
    <footer className="footer">
      <p>
        ⚠️ <strong>Medical Disclaimer:</strong> RadiologyAI provides AI-assisted preliminary analysis only.
        It is NOT a substitute for professional medical diagnosis.
        Always consult a licensed radiologist for clinical decisions.
      </p>
      <p style={{ marginTop: 8 }}>© {new Date().getFullYear()} RadiologyAI Project · AI-Powered X-Ray Report Generator</p>
    </footer>
  );
}