import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import PhilosopherPage from './pages/PhilosopherPage';
import SettingsPage from './pages/SettingsPage';
import WallpayModal from './components/WallpayModal';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <span style={{ fontFamily:'var(--font-display)', fontSize:'1.5rem', color:'var(--text-muted)', letterSpacing:'0.1em' }}>
        Diógenes
      </span>
    </div>
  );

  return (
    <>
      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <HomePage /> : <Navigate to="/login" />} />
        <Route path="/filosofo/:id" element={user ? <PhilosopherPage /> : <Navigate to="/login" />} />
        <Route path="/ajustes" element={user ? <SettingsPage /> : <Navigate to="/login" />} />
      </Routes>
      <WallpayModal />
    </>
  );
}