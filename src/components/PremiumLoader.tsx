import React from 'react';
import { Loader2 } from 'lucide-react';

export function PremiumLoader({ isVisible, message = 'Chargement...' }: { isVisible: boolean, message?: string }) {
  if (!isVisible) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg-base)]">
      <Loader2 className="animate-spin text-[var(--accent-emerald)] mb-4" size={48} />
      <p className="text-[var(--text-secondary)] font-mono text-sm uppercase tracking-widest">{message}</p>
    </div>
  );
}
