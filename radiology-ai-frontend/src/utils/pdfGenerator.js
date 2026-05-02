import jsPDF from 'jspdf';

export function downloadReportPDF(report) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 18;
  let y = 20;

  // ---- Header bar ----
  doc.setFillColor(22, 163, 74); 
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RadiologyAI — X-Ray Diagnostic Report', margin, 18);
  y = 38;

  // ---- Report ID & date ----
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Report ID: ${report._id}`, margin, y);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - margin, y, { align: 'right' });
  y += 10;

  // ---- Divider ----
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ---- File Info ----
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Patient / File Information', margin, y);
  y += 7;

  const meta = [
    ['File Name',    report.filename],
    ['File Size',    report.file_size],
    ['Upload Date',  new Date(report.upload_date).toLocaleString()],
    ['Model Used',   report.model_predicted],
    ['Processing',   `${report.processing_time_ms} ms`],
    ['Status',       report.status.toUpperCase()],
  ];

  doc.setFontSize(9);
  meta.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(String(value), margin + 36, y);
    y += 6;
  });

  y += 4;
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ---- AI Summary ----
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('AI Summary', margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const summaryLines = doc.splitTextToSize(report.ai_summary, pageW - margin * 2);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 5 + 6;

  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ---- Findings ----
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Findings & Confidence Scores', margin, y);
  y += 7;

  const SEVERITY_COLORS = {
    normal:   [34, 197, 94],
    low:      [234, 179, 8],
    moderate: [249, 115, 22],
    high:     [239, 68, 68],
  };

  (report.findings || []).forEach((f) => {
    if (y > 270) { doc.addPage(); y = 20; }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(f.disease_name, margin, y);

    const [r, g, b] = SEVERITY_COLORS[f.severity] ?? [34, 197, 94];
    doc.setFillColor(r, g, b);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    const sev = f.severity.toUpperCase();
    doc.roundedRect(pageW - margin - 28, y - 5, 28, 7, 1, 1, 'F');
    doc.text(sev, pageW - margin - 14, y, { align: 'center' });
    y += 5;

    const pct = f.confidence_score;
    const barW = pageW - margin * 2 - 40;
    doc.setFillColor(229, 231, 235); 
    doc.rect(margin, y, barW, 4, 'F');
    doc.setFillColor(r, g, b);
    doc.rect(margin, y, barW * pct, 4, 'F');

    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${(pct * 100).toFixed(1)}%`, margin + barW + 4, y + 3.5);
    y += 9;
  });

  y += 4;
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ---- Disclaimer ----
  if (y > 255) { doc.addPage(); y = 20; }
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(150, 80, 20);
  const disclaimer = '⚠ DISCLAIMER: This report is AI-generated for preliminary analysis only. It is NOT a substitute for professional medical diagnosis. Always consult a licensed radiologist for clinical decisions.';
  const dLines = doc.splitTextToSize(disclaimer, pageW - margin * 2);
  doc.text(dLines, margin, y);

  doc.save(`RadiologyAI_Report_${report._id.slice(-6)}.pdf`);
}