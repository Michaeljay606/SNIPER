import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { TENANT_ID } from '../../config';

export default function AdminPayments() {
  const [intents, setIntents] = useState<any[]>([]);

  useEffect(() => {
    async function fetchPayments() {
      const { data } = await supabase.from('payment_intents').select('*').eq('tenant_id', TENANT_ID).order('created_at', { ascending: false });
      if (data) setIntents(data);
    }
    fetchPayments();
  }, []);

  return (
    <div className="space-y-6 pb-8">
      <div className="glass-card p-4 sm:p-6">
        <h2 className="text-sm font-bold tracking-widest uppercase mb-4 text-[var(--accent-emerald)] flex items-center gap-2">
          <CreditCard size={18} /> Historique des Paiements
        </h2>

        <div className="space-y-3">
          {intents.map(intent => (
            <div key={intent.id} className="bg-[var(--bg-input)] p-3 rounded-xl border border-[var(--border-subtle)]">
              <div className="flex justify-between items-center mb-2">
                <div className="font-bold text-sm uppercase">{intent.plan}</div>
                <div className="flex items-center gap-1 font-mono text-[var(--accent-emerald)]">
                  {intent.usd_amount ? `$${intent.usd_amount}` : ''}
                  {intent.crypto_amount ? ` (${intent.crypto_amount} ${intent.currency})` : ''}
                </div>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <div className="text-[var(--text-muted)] font-mono">
                  {new Date(intent.created_at).toLocaleString()}
                </div>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded font-bold tracking-widest uppercase ${
                  intent.status === 'confirmed' ? 'text-green-400 bg-green-500/20' : 
                  intent.status === 'pending' ? 'text-yellow-400 bg-yellow-500/20' : 
                  'text-red-400 bg-red-500/20'
                }`}>
                  {intent.status === 'confirmed' && <CheckCircle size={10} />}
                  {intent.status === 'pending' && <Clock size={10} />}
                  {intent.status === 'expired' && <XCircle size={10} />}
                  {intent.status}
                </div>
              </div>
              {intent.tx_hash && (
                <div className="mt-2 text-[8px] text-[var(--text-muted)] font-mono break-all bg-[var(--bg-base)] p-1 rounded">
                  TX: {intent.tx_hash}
                </div>
              )}
            </div>
          ))}

          {intents.length === 0 && (
            <div className="text-center py-8 text-[var(--text-muted)] text-[10px] uppercase tracking-widest">
              Aucun paiement enregistré
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
