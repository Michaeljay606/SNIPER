import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import './i18n';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

import { detectTelegramTheme, applyTheme } from './lib/theme';
import { ThemeProvider } from './context/ThemeContext';
import { ConfigProvider } from './context/ConfigContext';

const initialTheme = detectTelegramTheme();
applyTheme(initialTheme);

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <ThemeProvider initialTheme={initialTheme}>
            <ConfigProvider>
              <App />
            </ConfigProvider>
          </ThemeProvider>
        </I18nextProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
