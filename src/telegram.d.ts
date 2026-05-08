interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  version: string;
  initDataUnsafe: {
    user?: TelegramUser;
  };
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}
