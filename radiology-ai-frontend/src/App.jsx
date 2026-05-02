import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import AnalyzePage from './pages/AnalyzePage';
import HistoryPage from './pages/HistoryPage';
import { useToastStore } from './store/toastStore';

export default function App() {
  const { toasts } = useToastStore();

  return (
    <Router>
      <div className="app-layout">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/analyze" element={<AnalyzePage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </main>
        <Footer />

        <div className="toast-container" style={{position: "fixed", bottom: "20px", right: "20px", zIndex: 9999}}>
          {toasts.map(t => (
            <div key={t.id} className={`toast toast-${t.type}`} style={{background: "#333", color: "white", padding: "10px 20px", borderRadius: "5px", marginBottom: "10px"}}>
              {t.message}
            </div>
          ))}
        </div>
      </div>
    </Router>
  );
}