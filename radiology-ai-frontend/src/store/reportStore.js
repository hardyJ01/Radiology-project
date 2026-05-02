import { useState, useEffect } from 'react';

let reports = (() => {
  try {
    const saved = localStorage.getItem('xray_reports');
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
})();

const listeners = new Set();

function notify() { listeners.forEach((l) => l()); }
function save()   { localStorage.setItem('xray_reports', JSON.stringify(reports)); }

export const reportStore = {
  getAll() { return reports; },
  getById(id) { return reports.find((r) => r._id === id); },

  add(report) {
    reports = [report, ...reports];
    save(); notify();
  },

  update(id, patch) {
    reports = reports.map((r) => r._id === id ? { ...r, ...patch } : r);
    save(); notify();
  },

  remove(id) {
    reports = reports.filter((r) => r._id !== id);
    save(); notify();
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },
};

export function useReports() {
  const [data, setData] = useState(reportStore.getAll());
  useEffect(() => { 
    return reportStore.subscribe(() => setData(reportStore.getAll())); 
  }, []);
  return data;
}