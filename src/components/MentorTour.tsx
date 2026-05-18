import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const TOUR_STEPS = [
  { target: null, title: 'Bienvenue', desc: 'Découvrez votre nouveau panel administrateur.', position: 'center' },
  { target: '[href="/admin/settings"]', title: 'Réglages', desc: 'Configurez votre identité et vos contacts.', position: 'top' },
  { target: '[href="/admin/signals"]', title: 'Signaux', desc: 'Publiez vos signaux de trading en temps réel.', position: 'bottom' },
  { target: '[href="/admin/academy"]', title: 'Academy', desc: 'Gérez vos modules et leçons.', position: 'bottom' },
  { target: null, title: 'Prêt', desc: 'Vous êtes prêt à accueillir vos élèves !', position: 'center' }
];

export default function MentorTour({ isPremium = true, onComplete }: { isPremium?: boolean, onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const location = useLocation();

  const updatePosition = useCallback(() => {
    const currentStep = TOUR_STEPS[step];
    if (!currentStep.target) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(currentStep.target);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [step, location.pathname]);

  useEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [updatePosition]);

  // Observer for dynamic elements
  useEffect(() => {
    const currentStep = TOUR_STEPS[step];
    if (!currentStep.target) return;
    
    const observer = new MutationObserver(() => {
      updatePosition();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [step, updatePosition]);

  const handleNext = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      onComplete();
    }
  };

  const currentStep = TOUR_STEPS[step];

  return (
    <>
      <div className="tour-backdrop pointer-events-none" />
      
      {targetRect && (
        <div 
          className="tour-spotlight-ring pointer-events-none"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}

      <div 
        className="tour-tooltip pointer-events-auto shadow-[0_0_30px_rgba(0,255,150,0.2)]"
        style={getTooltipStyle(targetRect, currentStep.position)}
        data-position={currentStep.position}
      >
        <div className="tour-progress">
          <div className="tour-progress-fill" style={{ width: `${((step + 1) / TOUR_STEPS.length) * 100}%` }} />
        </div>
        <div className="tour-step-label">ÉTAPE {step + 1} SUR {TOUR_STEPS.length}</div>
        <h3 className="tour-title">{currentStep.title}</h3>
        <p className="tour-desc">{currentStep.desc}</p>
        <div className="tour-footer">
          <button onClick={onComplete} className="tour-btn-skip uppercase tracking-widest font-bold">Passer</button>
          <button onClick={handleNext} className="tour-btn-primary uppercase tracking-widest shadow-[0_0_10px_rgba(0,255,150,0.4)]">
            {step === TOUR_STEPS.length - 1 ? 'Terminer' : 'Suivant'}
          </button>
        </div>
        {targetRect && currentStep.position !== 'center' && <div className="tour-tooltip-arrow" />}
      </div>
    </>
  );
}

function getTooltipStyle(rect: DOMRect | null, position: string): React.CSSProperties {
  if (!rect || position === 'center') {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  const gap = 16;
  const tooltipWidth = 272;
  const tooltipHeight = 160; // approximate
  let top = 0;
  let left = 0;

  switch (position) {
    case 'top':
      top = rect.top - tooltipHeight - gap;
      left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
      break;
    case 'bottom':
      top = rect.bottom + gap;
      left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
      break;
    case 'left':
      top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
      left = rect.left - tooltipWidth - gap;
      break;
    case 'right':
      top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
      left = rect.right + gap;
      break;
  }

  // Bounds checking
  const maxLeft = window.innerWidth - tooltipWidth - 16;
  if (left > maxLeft) left = maxLeft;
  if (left < 16) left = 16;

  return { top, left };
}
