import React from 'react';
import { Check, AlertCircle, Loader, ShieldCheck } from 'lucide-react';

interface TonPaymentModalProps {
  show: boolean;
  status: string;
  error: string | null;
  onClose: () => void;
  onReset: () => void;
}

export function TonPaymentModal({
  show,
  status,
  error,
  onClose,
  onReset,
}: TonPaymentModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-[#0e1219] border border-white/10 rounded-[24px] p-8 text-center shadow-[0_0_50px_rgba(0,152,234,0.2)]">
        {status === 'confirmed' ? (
          <div className="animate-in zoom-in duration-500">
            <div className="w-20 h-20 bg-green-500/20 border border-green-500/50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
              <Check size={40} className="text-green-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Paiement Confirmé !</h3>
            <p className="text-white/60 text-sm mb-8">Votre plan a été mis à jour avec succès. Le terminal va redémarrer.</p>
            <button 
              onClick={onClose}
              className="w-full h-12 bg-green-500 text-black font-black uppercase tracking-widest rounded-xl cursor-pointer"
            >
              C'est parti !
            </button>
          </div>
        ) : status === 'failed' ? (
          <div className="animate-in shake duration-300">
            <div className="w-20 h-20 bg-red-500/20 border border-red-500/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={40} className="text-red-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Paiement Échoué</h3>
            <p className="text-red-400/80 text-sm mb-8">{error || "Une erreur est survenue lors de la transaction."}</p>
            <div className="flex gap-3">
              <button 
                onClick={onReset}
                className="flex-1 h-12 bg-white/10 text-white font-bold uppercase rounded-xl border border-white/10 cursor-pointer"
              >
                Réessayer
              </button>
              <button 
                onClick={onClose}
                className="flex-1 h-12 bg-red-500 text-white font-bold uppercase rounded-xl cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader size={40} className="text-blue-400 animate-spin" />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">
              {status === 'connecting' ? 'Connexion Wallet...' : 
               status === 'waiting_signature' ? 'Signature requise' : 
               'Confirmation on-chain...'}
            </h3>
            
            <p className="text-white/60 text-sm mb-8 font-sans">
              {status === 'connecting' ? 'Veuillez ouvrir votre application TON (Telegram, Tonkeeper...)' : 
               status === 'waiting_signature' ? 'Veuillez signer la transaction dans votre application.' : 
               'Transaction envoyée ! Nous attendons la confirmation sur la blockchain.'}
            </p>

            <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3 mb-8">
              <ShieldCheck size={20} className="text-blue-400" />
              <div className="text-left font-sans">
                <div className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Sécurité</div>
                <div className="text-[11px] text-white/80">Paiement 100% décentralisé via Smart Contract</div>
              </div>
            </div>

            {status !== 'confirming' && (
              <button 
                onClick={onClose}
                className="text-white/40 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors cursor-pointer"
              >
                Annuler l'opération
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
