import './i18n'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

import { detectTelegramTheme, applyTheme } from './lib/theme';
import { ThemeProvider } from './context/ThemeContext';
import { ConfigProvider } from './context/ConfigContext';

const initialTheme = detectTelegramTheme();
applyTheme(initialTheme);

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
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
  </React.StrictMode>
);
