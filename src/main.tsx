import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

import { detectTelegramTheme, applyTheme } from './lib/theme';
import { ThemeProvider } from './context/ThemeContext';

// Initialize theme synchronously before React mounts to prevent flash
const initialTheme = detectTelegramTheme();
applyTheme(initialTheme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <ThemeProvider initialTheme={initialTheme}>
        <App />
      </ThemeProvider>
    </I18nextProvider>
  </StrictMode>,
);
