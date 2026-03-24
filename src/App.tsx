import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from './stores/settings-store';
import { HistoryProvider } from './stores/history-store';
import { PeerProvider } from './stores/peer-store';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { ReportPage } from './pages/ReportPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <SettingsProvider>
      <HistoryProvider>
        <PeerProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <Header />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
            <Footer />
          </BrowserRouter>
        </PeerProvider>
      </HistoryProvider>
    </SettingsProvider>
  );
}

export default App;
