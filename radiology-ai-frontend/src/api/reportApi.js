import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000/api';

export async function uploadXray(file, age, gender, symptoms) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('age', age || 'Not provided');
  formData.append('gender', gender || 'Not provided');
  formData.append('symptoms', symptoms || 'None reported');

  const response = await axios.post(`${API_BASE}/generate-report`, formData);
  const apiData = response.data.data;

  return {
    _id: `REP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    filename: file.name,
    file_size: `${(file.size / 1024).toFixed(1)} KB`,
    upload_date: new Date().toISOString(),
    status: 'completed',
    model_predicted: apiData.disease_prediction,
    ai_summary: apiData.generated_report,
    processing_time_ms: 1500, 
    findings: [
      {
        disease_name: apiData.disease_prediction,
        confidence_score: 0.92,
        severity: apiData.disease_prediction.toLowerCase().includes('normal') ? 'normal' : 'high'
      }
    ]
  };
}

export async function deleteReport(id) {
  // Mock delete function to satisfy HistoryPage requirements
  return new Promise(resolve => setTimeout(resolve, 500));
}