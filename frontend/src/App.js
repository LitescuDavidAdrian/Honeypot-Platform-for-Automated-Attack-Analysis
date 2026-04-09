import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import AttacksPage from './pages/AttacksPage';
import AuthLogsPage from './pages/AuthLogsPage';
import CommandLogsPage from './pages/CommandLogsPage';

function App() {
  return (
    <Router>
      <Navbar />
      <div style={{ padding: '20px' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/attacks" />} />
          <Route path="/attacks" element={<AttacksPage />} />
          <Route path="/auth-logs" element={<AuthLogsPage />} />
          <Route path="/command-logs" element={<CommandLogsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;