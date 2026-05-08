export const ONBOARDING_STEPS = [
  {
    step:        1,
    id:          'identity',
    title:       'Ton identité',
    description: 'Configure ton nom et ta photo de profil',
    fields:      ['mentor_name', 'mentor_photo_url'],
    required:    ['mentor_name'],
  },
  {
    step:        2,
    id:          'contact',
    title:       'Tes contacts',
    description: 'Ajoute ton Telegram et WhatsApp',
    fields:      ['telegram_username', 'whatsapp_number'],
    required:    ['telegram_username'],
  },
  {
    step:        3,
    id:          'payment',
    title:       'Ton wallet',
    description: 'Où tes élèves enverront leurs paiements',
    fields:      ['wallets.usdtTrc20', 'wallets.ton'],
    required:    [],  // Optional — mentor can skip
  },
  {
    step:        4,
    id:          'access_rules',
    title:       'Règles d\'accès',
    description: 'Comment tes élèves accèdent aux signaux et à l\'academy',
    fields:      ['signals_duration_model', 'academy_duration_model'],
    required:    ['signals_duration_model'],
  },
];
