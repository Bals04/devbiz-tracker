import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { PrivacyProvider } from './context/PrivacyContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { initTheme } from './lib/theme.js';
import './styles/index.css';

// Applied before the first render so a stored theme never flashes the other
// one. It lives here rather than in an inline <script> because helmet's
// production CSP (script-src 'self') would block inline scripts.
initTheme();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <PrivacyProvider>
          <ToastProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ToastProvider>
        </PrivacyProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
