import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import OverviewPage from './pages/OverviewPage';
import AttacksPage from './pages/AttacksPage';
import AuthLogsPage from './pages/AuthLogsPage';
import CommandLogsPage from './pages/CommandLogsPage';
import ReplayPage from './pages/ReplayPage';

function App() {
  return (
    <Router>
      <Navbar />
      <div style={{ padding: '20px' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/attacks" />} />
          <Route path="/overview" element={<OverviewPage /> } />
          <Route path="/attacks" element={<AttacksPage />} />
          <Route path="/auth-logs" element={<AuthLogsPage />} />
          <Route path="/command-logs" element={<CommandLogsPage />} />
          <Route path="/replay" element={<ReplayPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;