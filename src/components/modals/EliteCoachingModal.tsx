import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Crown, CheckCircle2 } from 'lucide-react';

const openLink = (url: string) => {
  const finalUrl = url.startsWith('http') ? url : `https://${url}`;
  if ((window as any).Telegram?.WebApp?.openLink) {
    (window as any).Telegram.WebApp.openLink(finalUrl);
  } else {
    window.open(finalUrl, '_blank');
  }
};

interface EliteCoachingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: any;
  currentUser: any;
  mentorName: string;
}

export default function EliteCoachingModal({ isOpen, onClose, tenant, currentUser, mentorName }: EliteCoachingModalProps) {
  if (!tenant) return null;

  const handleBookSession = () => {
    const rawTarget = tenant.elite_contact_url || tenant.social_telegram;
    if (!rawTarget) {
      alert("Le lien de contact n'est pas encore configuré.");
      return;
    }

    const trimmed = rawTarget.trim();
    let url = trimmed;
    
    // Format Telegram handle/username if it doesn't start with http
    if (!trimmed.startsWith('http')) {
      if (trimmed.startsWith('@') || (!trimmed.includes('.') && !trimmed.includes('/'))) {
        const handle = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
        url = `https://t.me/${handle}`;
      }
    }

    // Prepare custom message for prospect
    const prospectName = currentUser?.name || currentUser?.telegram_username || 'un membre';
    const coachingTitle = tenant.elite_title || 'Coaching Privé';
    
    const message = `👋 Bonjour ${mentorName}, je suis ${prospectName}.\n\nJe suis très intéressé(e) par votre accompagnement exclusif : *${coachingTitle}*.\n\nJe souhaiterais réserver ma place et en savoir plus sur les modalités d'inscription.`;
    
    const encodedMessage = encodeURIComponent(message);
    
    // If it's a telegram URL, we can append the text parameter
    if (url.includes('t.me')) {
      // Check if URL already has query params
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}text=${encodedMessage}`;
    }

    openLink(url);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-[#080B14] border border-[#FFD60A]/20 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(255,214,10,0.15)] flex flex-col max-h-[90vh]"
          >
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 z-50 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white/50 hover:text-white border border-white/10 backdrop-blur-md transition-colors"
            >
              <X size={16} />
            </button>

            {/* Premium Header / Banner */}
            <div className="relative w-full h-48 bg-black">
              {tenant.elite_cover_url ? (
                <img 
                  src={tenant.elite_cover_url} 
                  alt="Coaching Cover" 
                  className="w-full h-full object-cover opacity-80"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-900/40 to-black flex items-center justify-center">
                  <Crown size={48} className="text-[#FFD60A]/30" />
                </div>
              )}
              
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#080B14] via-[#080B14]/60 to-transparent" />
              
              <div className="absolute bottom-4 left-6 flex items-center gap-2">
                <div className="px-3 py-1 bg-[#FFD60A]/10 border border-[#FFD60A]/30 rounded-full">
                  <span className="font-mono text-[9px] font-bold tracking-widest text-[#FFD60A]">PROGRAMME ÉLITE</span>
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto">
              <h2 className="text-2xl font-black text-white leading-tight mb-2 uppercase tracking-tight">
                {tenant.elite_title || 'Coaching Privé 1-to-1'}
              </h2>
              
              <div className="text-xl font-mono font-bold text-[#FFD60A] mb-6">
                {tenant.elite_price || 'SUR DEVIS'}
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-sm text-gray-300 leading-relaxed">
                  {tenant.elite_description || "Cet accompagnement exclusif est conçu pour les personnes déterminées à passer au niveau supérieur. Vous bénéficierez de toute l'attention et de l'expertise du mentor."}
                </p>

                {/* Premium Value Props — dynamic from tenant.elite_benefits */}
                {(() => {
                  const defaultBenefits = [
                    "Accès prioritaire direct au mentor",
                    "Suivi personnalisé et plan d'action",
                    "Analyse de vos trades et corrections",
                    "Accélération vers la rentabilité"
                  ];
                  let benefits: string[] = defaultBenefits;
                  try {
                    const raw = tenant.elite_benefits;
                    if (Array.isArray(raw) && raw.length > 0) benefits = raw;
                    else if (typeof raw === 'string') {
                      const parsed = JSON.parse(raw);
                      if (Array.isArray(parsed) && parsed.length > 0) benefits = parsed;
                    }
                  } catch {}
                  return (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-6 space-y-3">
                      {benefits.map((benefit, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <CheckCircle2 size={16} className="text-[#FFD60A] mt-0.5 shrink-0" />
                          <span className="text-xs text-gray-300 font-medium">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Call To Action */}
              <button 
                onClick={handleBookSession}
                className="w-full h-14 relative group overflow-hidden rounded-xl bg-gradient-to-r from-[#FFD60A] to-[#F5B000] text-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(255,214,10,0.4)] transition-all"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative z-10 flex items-center gap-2">
                  <Send size={16} /> RÉSERVER MA PLACE MAINTENANT
                </span>
              </button>
              
              <p className="text-center text-[10px] text-gray-500 mt-3 font-mono">
                ⚠️ Places extrêmement limitées. Vous serez mis en relation directe avec le mentor.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
