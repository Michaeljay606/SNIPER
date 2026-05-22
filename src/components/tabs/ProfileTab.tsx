import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  LogOut, 
  Camera, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Instagram, 
  Youtube,
  MessageCircle, 
  Send,
  ImagePlus,
  Pencil,
  Settings
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useConfig } from '../../context/ConfigContext';
import EliteCoachingModal from '../modals/EliteCoachingModal';

interface ProfileTabProps {
  tenant_id: string;
  tenantProfile: any;
  config: any;
  isAdminUser: boolean;
  currentUser?: any;
  onLogout?: () => void;
}

export default function ProfileTab({ tenant_id, tenantProfile, config, isAdminUser, currentUser, onLogout }: ProfileTabProps) {
  const navigate = useNavigate();
  const { refresh: refreshConfig } = useConfig();
  const [localTenant, setLocalTenant] = useState<any>(tenantProfile || {});
  const [localConfig, setLocalConfig] = useState<any>(config || {});
  const [timeline, setTimeline] = useState<any[]>([]);
  const [mentorBadges, setMentorBadges] = useState<any[]>([]);
  const [gallery, setGallery] = useState<string[]>([]);
  
  const [isUploading, setIsUploading] = useState<string | null>(null);
  
  // States for inline editing
  const [isEditingVision, setIsEditingVision] = useState(false);
  const [visionText, setVisionText] = useState(localTenant?.vision_text || "");

  const mentorName = localTenant?.mentor_name || 'Mentor';
  const avatarLetter = (mentorName || 'M').charAt(0).toUpperCase();
  
  const [showTimelineForm, setShowTimelineForm] = useState(false);
  const [showSocialForm, setShowSocialForm] = useState(false);
  const [showBrokersForm, setShowBrokersForm] = useState(false);
  const [editingTimelineId, setEditingTimelineId] = useState<string | null>(null);
  const [newTimeline, setNewTimeline] = useState({ year: '', description: '' });
  
  const [notification, setNotification] = useState<{ message: string, type: 'error' | 'success' | 'info' } | null>(null);
  const [showEliteModal, setShowEliteModal] = useState(false);
  const [showEliteForm, setShowEliteForm] = useState(false);
  
  const showNotification = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    fetchData();
  }, [tenant_id]);

  useEffect(() => {
    if (tenantProfile) setLocalTenant(tenantProfile);
    if (config) setLocalConfig(config);
    if (tenantProfile?.vision_text) setVisionText(tenantProfile.vision_text);
  }, [tenantProfile, config]);

  const fetchData = async () => {
    // Timeline
    const { data: timelineData } = await supabase
      .from('timeline_events')
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('order_index', { ascending: true });
    if (timelineData) setTimeline(timelineData);

    // Badges
    const { data: badgesData } = await supabase
      .from('mentor_badges')
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('order_index', { ascending: true });
    if (badgesData) setMentorBadges(badgesData);

    // Gallery
    const { data: galleryData } = await supabase
      .from('app_settings')
      .select('value')
      .eq('tenant_id', tenant_id)
      .eq('key', `gallery_${tenant_id}`)
      .single();
    
    if (galleryData?.value) {
      if (Array.isArray(galleryData.value)) {
        setGallery(galleryData.value);
      } else {
        const urls = Object.values(galleryData.value).filter(v => typeof v === 'string' && v.startsWith('http')) as string[];
        setGallery(urls);
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      showNotification("Fichier trop volumineux (max 3MB)");
      return;
    }

    setIsUploading(type);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 800; // max 800px per prompt rules

          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(async (blob) => {
            if (!blob) return;

            // Map type to stable filename (no timestamp in path — upsert handles updates)
            let fileName = '';
            if (type === 'avatar') fileName = 'avatar.webp';
            else if (type === 'vision') fileName = 'vision.webp';
            else if (type === 'elite_cover') fileName = 'elite_cover.webp';
            else if (type.startsWith('gallery_')) {
              fileName = `result_${type.split('_')[1].replace('img', '')}.webp`;
            } else {
              fileName = `${type}.webp`;
            }

            const filePath = `${tenant_id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('profile')
              .upload(filePath, blob, { contentType: 'image/webp', upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
              .from('profile')
              .getPublicUrl(filePath);

            // IMPORTANT: Store clean URL in DB (no cache-buster)
            // Only use cache-buster in local state for immediate display
            const cleanUrl = publicUrl;
            const displayUrl = `${publicUrl}?t=${Date.now()}`;

            let dbError: any = null;

            if (type === 'avatar' || type === 'logo') {
              const { error } = await supabase.from('tenants')
                .update({ logo_url: cleanUrl })
                .eq('tenant_id', tenant_id.trim());
              dbError = error;
              if (!error) {
                setLocalConfig((prev: any) => ({ ...prev, logo_url: displayUrl }));
                setLocalTenant((prev: any) => ({ ...prev, logo_url: displayUrl }));
              }
            } else if (type === 'cover') {
              const { error } = await supabase.from('tenants')
                .update({ cover_image_url: cleanUrl })
                .eq('tenant_id', tenant_id.trim());
              dbError = error;
              if (!error) {
                setLocalConfig((prev: any) => ({ ...prev, cover_image_url: displayUrl }));
                setLocalTenant((prev: any) => ({ ...prev, cover_image_url: displayUrl }));
              }
            } else if (type === 'vision') {
              const { error } = await supabase.from('tenants')
                .update({ vision_photo_url: cleanUrl })
                .eq('tenant_id', tenant_id.trim());
              dbError = error;
              if (!error) setLocalTenant((prev: any) => ({ ...prev, vision_photo_url: displayUrl }));
            } else if (type === 'elite_cover') {
              const { error } = await supabase.from('tenants')
                .update({ elite_cover_url: cleanUrl })
                .eq('tenant_id', tenant_id.trim());
              dbError = error;
              if (!error) setLocalTenant((prev: any) => ({ ...prev, elite_cover_url: displayUrl }));
            } else if (type.startsWith('gallery_')) {
              const idx = parseInt(type.split('_')[1]);
              const newGallery = [...gallery];
              newGallery[idx] = cleanUrl; // Store clean URL in DB
              const { error } = await supabase.from('app_settings').upsert({
                tenant_id: tenant_id.trim(),
                key: `gallery_${tenant_id.trim()}`,
                value: newGallery,
              });
              dbError = error;
              if (!error) {
                // Display with cache-buster locally
                const displayGallery = [...newGallery];
                displayGallery[idx] = displayUrl;
                setGallery(displayGallery);
              }
            }

            if (dbError) {
              console.error('DB update error after upload:', dbError);
              showNotification('Image uploadée mais erreur DB: ' + dbError.message);
            } else {
              // Invalidate ConfigContext cache — next read will get fresh DB data
              await refreshConfig();
            }

            setIsUploading(null);
          }, 'image/webp', 0.8);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsUploading(null);
      showNotification("Erreur lors de l'upload");
    }
  };

  const handleUpdateTenant = async (field: string, value: any) => {
    // Optimistic update first
    setLocalTenant((prev: any) => ({ ...prev, [field]: value }));
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ [field]: value })
        .eq('tenant_id', tenant_id.trim());
      if (error) throw error;
      // Invalidate ConfigContext so data persists across refresh
      await refreshConfig();
    } catch (err: any) {
      console.error(err);
      showNotification("Erreur de sauvegarde: " + err.message);
    }
  };

  const handleUpdateConfig = handleUpdateTenant;

  const handleAddBadge = async () => {
    const label = prompt('Texte du badge ?');
    if (!label) return;
    const colorInput = prompt('Couleur ? (green, yellow, default)', 'default');
    const color = colorInput === 'green' || colorInput === 'yellow' ? colorInput : 'default';
    
    const newBadge = { 
      tenant_id: tenant_id.trim(), 
      label, 
      color, 
      order_index: mentorBadges.length 
    };
    
    try {
      const { data, error } = await supabase.from('mentor_badges').insert(newBadge).select().single();
      if (error) throw error;
      if (data) setMentorBadges([...mentorBadges, data]);
    } catch (e: any) {
      console.error(e);
      showNotification("Erreur de sauvegarde: " + e.message);
    }
  };

  const handleDeleteBadge = async (id: string) => {
    if (!confirm('Supprimer ce badge ?')) return;
    // optimistic
    setMentorBadges(mentorBadges.filter(b => b.id !== id));
    try {
      const { error } = await supabase.from('mentor_badges').delete().eq('id', id);
      if (error) throw error;
    } catch (e: any) {
      console.error(e);
      showNotification("Erreur de sauvegarde: " + e.message);
    }
  };

  const handleEditBadge = async (badge: any) => {
    const newLabel = prompt('Nouveau texte du badge ?', badge.label);
    if (!newLabel || newLabel === badge.label) return;
    
    const newColorInput = prompt('Nouvelle couleur ? (green, yellow, default)', badge.color);
    const newColor = newColorInput === 'green' || newColorInput === 'yellow' || newColorInput === 'default' ? newColorInput : badge.color;

    const updated = { label: newLabel, color: newColor };
    
    // optimistic
    setMentorBadges(mentorBadges.map(b => b.id === badge.id ? { ...b, ...updated } : b));
    
    try {
      const { error } = await supabase.from('mentor_badges').update(updated).eq('id', badge.id);
      if (error) throw error;
    } catch (e: any) {
      console.error(e);
      showNotification("Erreur de sauvegarde: " + e.message);
    }
  };

  const handleAddTimeline = async () => {
    if (!newTimeline.year || !newTimeline.description) return;
    const item = { 
      tenant_id: tenant_id.trim(), 
      ...newTimeline, 
      order_index: timeline.length 
    };
    try {
      const { data, error } = await supabase.from('timeline_events').insert(item).select().single();
      if (error) throw error;
      if (data) {
        setTimeline([...timeline, data]);
        setNewTimeline({ year: '', description: '' });
        setShowTimelineForm(false);
      }
    } catch (e: any) {
      console.error(e);
      showNotification("Erreur de sauvegarde: " + e.message);
    }
  };

  const handleDeleteTimeline = async (id: string) => {
    if (!confirm('Supprimer cet événement ?')) return;
    setTimeline(timeline.filter(t => t.id !== id));
    try {
      const { error } = await supabase.from('timeline_events').delete().eq('id', id);
      if (error) throw error;
    } catch (e: any) {
      console.error(e);
      showNotification("Erreur de sauvegarde: " + e.message);
    }
  };

  const handleEditTimeline = (item: any) => {
    setEditingTimelineId(item.id);
    setNewTimeline({ year: item.year, description: item.description });
    setShowTimelineForm(true);
  };

  const handleUpdateTimeline = async () => {
    if (!editingTimelineId || !newTimeline.year || !newTimeline.description) return;
    
    const updated = {
      year: newTimeline.year,
      description: newTimeline.description
    };

    setTimeline(timeline.map(t => t.id === editingTimelineId ? { ...t, ...updated } : t));
    
    try {
      const { error } = await supabase
        .from('timeline_events')
        .update(updated)
        .eq('id', editingTimelineId);
      
      if (error) throw error;
      
      setEditingTimelineId(null);
      setNewTimeline({ year: '', description: '' });
      setShowTimelineForm(false);
    } catch (e: any) {
      console.error(e);
      showNotification("Erreur de sauvegarde: " + e.message);
    }
  };

  const handleDeleteGalleryImg = async (urlToDelete: string) => {
    if (!confirm('Supprimer cette image de la galerie ?')) return;
    const newGallery = gallery.filter(url => url !== urlToDelete);
    setGallery(newGallery);
    try {
      await supabase.from('app_settings').upsert({
        tenant_id: tenant_id.trim(),
        key: `gallery_${tenant_id.trim()}`,
        value: newGallery
      });
    } catch (e: any) {
      console.error(e);
      showNotification("Erreur de sauvegarde: " + e.message);
    }
  };

  const toggleVip = async () => {
    if (!currentUser) return;
    const newVal = !currentUser.is_vip;
    try {
      await supabase.from('affiliates').update({ is_vip: newVal }).eq('id', currentUser.id);
      window.location.reload(); 
    } catch (err: any) {
      console.error(err);
      showNotification("Erreur de sauvegarde: " + err.message);
    }
  };

  const renderSectionHeader = (title: string, actionNode?: React.ReactNode, lineStyle?: React.CSSProperties) => (
    <div className="section-hdr" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 14px 10px' }}>
      <div className="s-line" style={{ width: '3px', height: '13px', borderRadius: '2px', background: 'var(--green)', boxShadow: '0 0 8px rgba(0,255,65,0.4)', flexShrink: 0, ...lineStyle }} />
      <span className="s-title" style={{ fontFamily: 'Space Mono', fontSize: '9px', letterSpacing: '0.18em', color: 'var(--muted)', textTransform: 'uppercase', flex: 1 }}>{title}</span>
      {actionNode}
    </div>
  );

  const PoweredBy = () => (
    <div style={{ padding: '24px 0 12px', display: 'flex', justifyContent: 'center', opacity: 0.2 }}>
      <span style={{ fontFamily: 'Space Mono', fontSize: '7px', fontWeight: 800, letterSpacing: '0.25em', color: 'var(--muted)' }}>
        POWERED BY SNIPER
      </span>
    </div>
  );

  const openLink = (url: string) => {
    if (!url) return;
    const finalUrl = url.startsWith('http') ? url : `https://${url}`;
    if ((window as any).Telegram?.WebApp?.openLink) {
      (window as any).Telegram.WebApp.openLink(finalUrl);
    } else {
      window.open(finalUrl, '_blank');
    }
  };

  return (
    <>
      {notification && (
        <div style={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: notification.type === 'error' ? 'rgba(255, 59, 48, 0.9)' : 
                      notification.type === 'success' ? 'rgba(0, 255, 65, 0.9)' : 
                      'rgba(0, 0, 0, 0.9)',
          color: notification.type === 'error' ? '#FFF' :
                 notification.type === 'success' ? '#000' :
                 '#FFF',
          padding: '12px 24px',
          borderRadius: '24px',
          fontFamily: 'Space Mono',
          fontSize: '12px',
          fontWeight: 700,
          zIndex: 9999,
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          border: `1px solid ${
            notification.type === 'error' ? 'rgba(255, 255, 255, 0.2)' : 
            notification.type === 'success' ? 'rgba(0, 0, 0, 0.2)' : 
            'var(--subtle)'
          }`,
          animation: 'slideDown 0.3s ease-out forwards'
        }}>
          {notification.message}
        </div>
      )}
      <style>{`
        @keyframes slideDown {
          from { top: -50px; opacity: 0; }
          to { top: 20px; opacity: 1; }
        }
        @keyframes neon-pulse {
          0%,100% { box-shadow: 0 0 10px rgba(0,255,65,0.4), 0 0 25px rgba(0,255,65,0.2) }
          50%     { box-shadow: 0 0 20px rgba(0,255,65,0.6), 0 0 40px rgba(0,255,65,0.3) }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skeleton {
          background: linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 75%);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
        .img-fade {
          opacity: 0;
          transition: opacity 0.5s ease;
        }
        .img-loaded {
          opacity: 1;
        }
      `}</style>

      <div style={{ paddingBottom: 32 }}>
        {/* BLOCK 1 - DISCONNECT BUTTON */}
      {currentUser && (
        <button 
          onClick={onLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,59,48,0.08)',
            border: '1px solid rgba(255,59,48,0.2)',
            borderRadius: '20px', padding: '6px 14px',
            fontFamily: 'Space Mono', fontSize: '11px',
            color: '#FF3B30', cursor: 'pointer',
            float: 'right', margin: '14px 14px 0'
          }}
        >
          <LogOut size={12} />
          Déconnexion
        </button>
      )}

      {/* Clearfix for float */}
      <div style={{ clear: 'both' }} />

      {/* BLOCK 1.5 - COVER IMAGE */}
      <div className="skeleton" style={{ height: '200px', width: '100%', overflow: 'hidden', background: 'var(--surface)', position: 'relative', marginTop: '-44px' }}>
        {localConfig?.cover_image_url ? (
          <img 
            src={localConfig.cover_image_url} 
            loading="lazy"
            onLoad={(e) => (e.target as HTMLImageElement).classList.add('img-loaded')}
            className="img-fade"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            alt="Cover" 
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(to bottom right, rgba(0,255,65,0.08), transparent)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, height: '100%', background: 'linear-gradient(to top, var(--bg), transparent)' }} />
        
        {isAdminUser && (
          <label style={{ position: 'absolute', top: '56px', left: '16px', background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '50%', cursor: 'pointer', zIndex: 10 }}>
            {isUploading === 'cover' ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <Camera size={14} color="#FFF" />
            )}
            <input type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => handleImageUpload(e, 'cover')} />
          </label>
        )}
      </div>

      {/* BLOCK 2 - MENTOR IDENTITY */}
      <div style={{ textAlign: 'center', padding: '0 14px 0', marginTop: '-50px', position: 'relative', zIndex: 10 }}>
        <div className="skeleton" style={{ width: '130px', height: '130px', borderRadius: '50%', position: 'relative', margin: '0 auto 20px' }}>
          {/* Avatar content */}
          {localConfig?.logo_url ? (
            <img 
              src={localConfig.logo_url} 
              loading="lazy"
              onLoad={(e) => (e.target as HTMLImageElement).classList.add('img-loaded')}
              className="img-fade"
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} 
              alt="Mentor Avatar" 
            />
          ) : (
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'rgba(0,255,65,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Space Mono', fontSize: '36px', fontWeight: 700, color: 'var(--green)' }}>
              {avatarLetter}
            </div>
          )}

          {/* Neon Ring */}
          <div style={{
            position: 'absolute', inset: '-4px', borderRadius: '50%',
            border: '2px solid var(--green)',
            boxShadow: '0 0 10px rgba(0,255,65,0.4), 0 0 25px rgba(0,255,65,0.2), 0 0 50px rgba(0,255,65,0.1)',
            animation: 'neon-pulse 3s ease infinite',
            pointerEvents: 'none'
          }} />

          {/* Verified Badge */}
          <div style={{
            position: 'absolute', bottom: '2px', right: '2px',
            width: '22px', height: '22px', borderRadius: '50%',
            background: 'var(--green)', border: '2px solid var(--bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '10px', color: '#050507', fontWeight: 'bold'
          }}>✓</div>

          {/* Upload Overlay */}
          {isAdminUser && (
            <label style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', 
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
              cursor: 'pointer', zIndex: 10
            }}>
              {isUploading === 'avatar' ? (
                 <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
              ) : (
                 <Camera size={24} color="#FFF" />
              )}
              <input type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} />
            </label>
          )}
        </div>

        {/* Mentor Name */}
        <div style={{ fontFamily: 'Space Mono', fontSize: '24px', fontWeight: 700, letterSpacing: '-0.01em', color: '#F0F0F0', textAlign: 'center', marginBottom: '4px' }}>
          {mentorName}
        </div>

        {/* Subtitle / Speciality */}
        <div style={{ 
          fontFamily: 'Space Mono', 
          fontSize: '13px', 
          fontWeight: 900,
          letterSpacing: '0.15em', 
          color: '#FFFFFF', 
          textAlign: 'center', 
          textTransform: 'uppercase', 
          marginBottom: '20px',
          textShadow: '0 0 10px rgba(255,255,255,0.3)'
        }}>
          {localTenant?.speciality || 'EXPERT TRADING'}
        </div>

        {/* Badges Row - Derived from Settings */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
          {localTenant?.years_exp && (
            <div style={{
              fontFamily: 'Space Mono', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
              padding: '6px 16px', borderRadius: '99px',
              background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.25)', color: '#00FF41'
            }}>
              {localTenant.years_exp} D'EXP
            </div>
          )}
          
          <div style={{
            fontFamily: 'Space Mono', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
            padding: '6px 16px', borderRadius: '99px',
            background: 'rgba(255,214,10,0.1)', border: '1px solid rgba(255,214,10,0.25)', color: '#FFD60A'
          }}>
            VIP MENTOR
          </div>

          {localTenant?.traders_count && (
            <div style={{
              fontFamily: 'Space Mono', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
              padding: '6px 16px', borderRadius: '99px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)'
            }}>
              {localTenant.traders_count} TRADERS
            </div>
          )}
        </div>
      </div>

      {/* BLOCK 3 - MA VISION */}
      {renderSectionHeader(
        "MA VISION", 
        isAdminUser && <Pencil size={14} color="var(--green)" onClick={() => setIsEditingVision(!isEditingVision)} style={{ marginLeft: 'auto', cursor: 'pointer' }} />
      )}
      <div style={{ margin: '0 14px', background: 'var(--glass)', border: '1px solid var(--subtle)', borderRadius: '14px', padding: '18px' }}>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
          <span style={{ color: 'var(--green)', fontSize: '28px', fontWeight: 700, fontStyle: 'normal', lineHeight: 1 }}>"</span>
          <div style={{ flex: 1 }}>
            {isEditingVision ? (
              <textarea 
                style={{ 
                  width: '100%', height: 'auto', minHeight: '80px', background: 'transparent', 
                  border: '1px solid rgba(0,255,65,0.2)', borderRadius: '8px', padding: '8px',
                  fontSize: '14px', fontStyle: 'italic', color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, outline: 'none'
                }}
                value={visionText}
                onChange={(e) => setVisionText(e.target.value)}
                onBlur={() => {
                  setIsEditingVision(false);
                  handleUpdateTenant('vision_text', visionText);
                }}
                autoFocus
              />
            ) : (
              <div style={{ fontSize: '14px', fontStyle: 'italic', color: 'rgba(255,255,255,0.75)', lineHeight: 1.8 }}>
                {localTenant?.vision_text || "Ma vision du trading et de l'accompagnement..."}
              </div>
            )}
          </div>
        </div>

        {/* CADRE PHOTO VISION */}
        {(localTenant?.vision_photo_url || isAdminUser) && (
        <div style={{ position: 'relative', width: '100%', paddingTop: '65%', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
          {localTenant?.vision_photo_url ? (
            <img 
              src={localTenant.vision_photo_url} 
              loading="lazy"
              onLoad={(e) => (e.target as HTMLImageElement).classList.add('img-loaded')}
              className="img-fade"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }} 
              alt="Vision" 
            />
          ) : (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <ImagePlus size={32} color="rgba(255,255,255,0.1)" />
              <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontWeight: 700, letterSpacing: '0.1em' }}>CADRE PHOTO VISION</span>
            </div>
          )}
          
          {isAdminUser && (
            <label style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'var(--green)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,255,65,0.3)', zIndex: 10 }}>
              <Camera size={18} color="#050507" />
              <input type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => handleImageUpload(e, 'vision')} />
            </label>
          )}
        </div>
        )}
      </div>
      <PoweredBy />

      {/* BLOCK 4 - GALERIE DE RÉSULTATS */}
      {renderSectionHeader("GALERIE DE RÉSULTATS")}
      <div style={{ padding: '0 14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          {[0, 1, 2, 3].map(idx => (
            <div key={idx} style={{ 
              position: 'relative', 
              width: '100%', 
              paddingTop: '125%', // Portrait 4:5 aspect ratio
              background: 'var(--glass)', 
              border: '1px solid var(--subtle)', 
              borderRadius: '12px', 
              overflow: 'hidden' 
            }}>
              {gallery[idx] ? (
                <>
                  <img 
                    src={gallery[idx]} 
                    loading="lazy"
                    onLoad={(e) => (e.target as HTMLImageElement).classList.add('img-loaded')}
                    className="img-fade"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }} 
                    alt={`Result ${idx}`} 
                  />
                  {isAdminUser && (
                    <button 
                      onClick={() => handleDeleteGalleryImg(gallery[idx])}
                      style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,59,48,0.8)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', zIndex: 10 }}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </>
              ) : isAdminUser ? (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <ImagePlus size={20} color="rgba(255,255,255,0.1)" />
                  <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)', fontWeight: 700 }}>SLOT {idx + 1}</span>
                </div>
              ) : (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'var(--elevated)' }} />
              )}
              
              {isAdminUser && (
                <label style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.5)', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Camera size={14} color="white" />
                  <input type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => handleImageUpload(e, `gallery_${idx}`)} />
                </label>
              )}
            </div>
          ))}
        </div>
      </div>
      <PoweredBy />

      {/* BLOCK 5 - PARCOURS & TIMELINE */}
      {renderSectionHeader(
        "PARCOURS & TIMELINE",
        isAdminUser && (
          <button 
            onClick={() => {
              setEditingTimelineId(null);
              setNewTimeline({ year: '', description: '' });
              setShowTimelineForm(!showTimelineForm);
            }}
            style={{
              background: 'rgba(0,255,65,0.06)', border: '1px solid rgba(0,255,65,0.15)',
              borderRadius: '20px', padding: '5px 12px', fontFamily: 'Space Mono', fontSize: '9px',
              color: 'var(--green)', cursor: 'pointer', marginLeft: 'auto'
            }}
          >
            {showTimelineForm ? 'ANNULER' : '+ AJOUTER'}
          </button>
        )
      )}
      
      {showTimelineForm && (
        <div style={{ margin: '0 14px 16px', background: 'var(--glass)', padding: '12px', borderRadius: '10px', border: '1px solid var(--subtle)' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input 
              style={{ width: '60px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--subtle)', borderRadius: '6px', padding: '6px', color: '#FFF', fontSize: '12px' }}
              placeholder="2024" maxLength={4}
              value={newTimeline.year} onChange={e => setNewTimeline({...newTimeline, year: e.target.value})}
            />
            <input 
              style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid var(--subtle)', borderRadius: '6px', padding: '6px', color: '#FFF', fontSize: '12px' }}
              placeholder="Lancement du canal VIP"
              value={newTimeline.description} onChange={e => setNewTimeline({...newTimeline, description: e.target.value})}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={() => {
              setShowTimelineForm(false);
              setEditingTimelineId(null);
              setNewTimeline({ year: '', description: '' });
            }} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: '10px', cursor: 'pointer' }}>Annuler</button>
            <button 
              onClick={editingTimelineId ? handleUpdateTimeline : handleAddTimeline} 
              style={{ background: 'var(--green)', color: '#000', border: 'none', borderRadius: '6px', padding: '4px 12px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {editingTimelineId ? 'Mettre à jour' : 'Ajouter'}
            </button>
          </div>
        </div>
      )}

      <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column' }}>
        {timeline.length === 0 ? (
          <div style={{ background: 'var(--glass)', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '10px', padding: '20px', textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>
            Aucun événement dans la chronologie
            {isAdminUser && <div style={{ marginTop: '4px' }}>Cliquez sur + AJOUTER pour commencer</div>}
          </div>
        ) : (
          timeline.map((item, idx) => (
            <div key={item.id} style={{ display: 'flex', gap: '16px', paddingBottom: '20px', position: 'relative' }}>
              <div style={{ minWidth: '44px', position: 'relative' }}>
                <div style={{ fontFamily: 'Space Mono', fontSize: '12px', fontWeight: 700, color: 'var(--green)', lineHeight: 1.4, textAlign: 'right' }}>
                  {item.year}
                </div>
                <div style={{ position: 'absolute', right: '-12px', top: '3px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px rgba(0,255,65,0.4)' }} />
              </div>
              
              {idx !== timeline.length - 1 && (
                <div style={{ position: 'absolute', left: 'calc(44px + 8px)', top: '12px', width: '1px', height: 'calc(100% - 4px)', background: 'rgba(0,255,65,0.12)' }} />
              )}
              
              <div style={{ flex: 1, fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, paddingTop: '1px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span>{item.description}</span>
                {isAdminUser && (
                  <div style={{ display: 'flex', gap: '10px', marginLeft: '10px' }}>
                    <Pencil 
                      size={14} 
                      color="var(--green)" 
                      style={{ cursor: 'pointer', opacity: 0.6 }}
                      onClick={() => handleEditTimeline(item)}
                    />
                    <Trash2 
                      size={14} 
                      color="#FF3B30" 
                      style={{ cursor: 'pointer', opacity: 0.6 }}
                      onClick={() => handleDeleteTimeline(item.id)}
                    />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      <PoweredBy />

      {/* BLOCK 6 - ACCOMPAGNEMENT EXCLUSIF */}
      {(localConfig?.elite_title || isAdminUser) && (
        <>
          {renderSectionHeader(
            "ACCOMPAGNEMENT EXCLUSIF",
            isAdminUser && (
              <Pencil 
                size={14} 
                color="var(--amber)" 
                onClick={() => setShowEliteForm(!showEliteForm)} 
                style={{ 
                  marginLeft: 'auto', 
                  cursor: 'pointer', 
                  transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                  transform: showEliteForm ? 'rotate(90deg)' : 'none',
                  opacity: 0.8
                }} 
              />
            ),
            { background: 'var(--amber)', boxShadow: '0 0 8px rgba(255,214,10,0.4)' }
          )}
          
          {isAdminUser && showEliteForm ? (
            <div style={{ 
              margin: '0 14px 40px', 
              background: 'var(--glass)', 
              border: '1px solid rgba(255, 214, 10, 0.25)', 
              padding: '20px', 
              borderRadius: '14px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px', 
              position: 'relative', 
              overflow: 'hidden', 
              boxShadow: '0 8px 32px 0 rgba(255, 214, 10, 0.05)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)'
            }}>
              {/* Gold cyberpunk status stripe */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, transparent, var(--amber), transparent)' }} />
              
              {/* Header inside admin console */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '10px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <Settings size={15} color="var(--amber)" style={{ animation: 'spin 4s linear infinite' }} />
                <span style={{ fontFamily: 'Space Mono', fontSize: '10px', fontWeight: 800, color: 'var(--amber)', letterSpacing: '0.1em' }}>
                  ÉDITEUR ACCOMPAGNEMENT ÉLITE
                </span>
                <span style={{ 
                  marginLeft: 'auto', 
                  fontSize: '8px', 
                  background: 'rgba(255, 214, 10, 0.08)', 
                  border: '1px solid rgba(255, 214, 10, 0.2)', 
                  padding: '2px 6px', 
                  borderRadius: '4px', 
                  color: 'var(--amber)', 
                  fontFamily: 'Space Mono', 
                  fontWeight: 700 
                }}>
                  CONSOLE SÉCURISÉE
                </span>
              </div>

              {/* Title Input Group */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '9px', fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', fontWeight: 600 }}>
                  TITRE DE L'OFFRE COACHING
                </label>
                <input 
                  style={{
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#FFF',
                    fontSize: '13px',
                    outline: 'none',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                    width: '100%'
                  }}
                  value={localTenant.elite_title || ''}
                  placeholder="COACHING PRIVÉ ÉLITE"
                  onChange={(e) => setLocalTenant({...localTenant, elite_title: e.target.value})}
                  onBlur={() => handleUpdateTenant('elite_title', localTenant.elite_title)}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(255, 214, 10, 0.4)'}
                />
              </div>

              {/* Description Textarea Group */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '9px', fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', fontWeight: 600 }}>
                  DESCRIPTION DU PROGRAMME
                </label>
                <textarea 
                  style={{
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#E0E0E0',
                    fontSize: '12px',
                    lineHeight: 1.6,
                    minHeight: '80px',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    width: '100%'
                  }}
                  value={localTenant.elite_description || ''}
                  placeholder="Décrivez l'accompagnement privé, la fréquence des séances, etc..."
                  onChange={(e) => setLocalTenant({...localTenant, elite_description: e.target.value})}
                  onBlur={() => handleUpdateTenant('elite_description', localTenant.elite_description)}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(255, 214, 10, 0.4)'}
                />
              </div>

              {/* Price Group */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ 
                  fontSize: '9px', 
                  fontFamily: 'Space Mono', 
                  color: 'rgba(255,214,10,0.5)', 
                  letterSpacing: '0.12em', 
                  fontWeight: 700,
                  textTransform: 'uppercase'
                }}>
                  — PRIX D'ACCÈS
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    style={{
                      background: 'rgba(255, 214, 10, 0.04)',
                      border: '1px solid rgba(255, 214, 10, 0.2)',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      color: 'var(--amber)',
                      fontFamily: 'Space Mono',
                      fontSize: '16px',
                      fontWeight: 800,
                      outline: 'none',
                      boxSizing: 'border-box',
                      width: '100%',
                      letterSpacing: '0.05em',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    value={localTenant.elite_price || ''}
                    placeholder="ex: 500€/mois"
                    onChange={(e) => setLocalTenant({...localTenant, elite_price: e.target.value})}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 214, 10, 0.2)';
                      e.currentTarget.style.boxShadow = 'none';
                      handleUpdateTenant('elite_price', localTenant.elite_price);
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 214, 10, 0.55)';
                      e.currentTarget.style.boxShadow = '0 0 18px rgba(255, 214, 10, 0.12)';
                    }}
                  />
                </div>
                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', fontFamily: 'Space Mono', letterSpacing: '0.05em' }}>
                  Laissez vide pour ne pas afficher de prix
                </span>
              </div>

              {/* Benefits Checklist Group */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '9px', fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '2px' }}>
                  ✏️ BÉNÉFICES CLÉS INCLUS (Max 6)
                </label>
                {(() => {
                  const benefits: string[] = (() => {
                    try {
                      const raw = localTenant.elite_benefits;
                      if (Array.isArray(raw)) return raw;
                      if (typeof raw === 'string') return JSON.parse(raw);
                      return ["Accès prioritaire direct au mentor", "Suivi personnalisé et plan d'action", "Analyse de vos trades et corrections", "Accélération vers la rentabilité"];
                    } catch { return ["Accès prioritaire direct au mentor", "Suivi personnalisé et plan d'action", "Analyse de vos trades et corrections", "Accélération vers la rentabilité"]; }
                  })();
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {benefits.map((b, i) => (
                        <div key={i} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          background: 'rgba(255,255,255,0.02)', 
                          border: '1px solid rgba(255,255,255,0.06)', 
                          borderRadius: '8px', 
                          padding: '6px 10px',
                          transition: 'border-color 0.2s'
                        }}>
                          <div style={{ 
                            width: '16px', 
                            height: '16px', 
                            borderRadius: '50%', 
                            background: 'rgba(255, 214, 10, 0.1)', 
                            border: '1px solid rgba(255, 214, 10, 0.3)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            flexShrink: 0 
                          }}>
                            <span style={{ color: 'var(--amber)', fontSize: '10px', fontWeight: 'bold' }}>✓</span>
                          </div>
                          <input 
                            style={{ 
                              flex: 1, 
                              background: 'transparent', 
                              border: 'none', 
                              color: '#F0F0F0', 
                              fontSize: '12px', 
                              outline: 'none',
                              fontFamily: 'inherit'
                            }}
                            value={b}
                            placeholder="Nouveau bénéfice..."
                            onChange={e => {
                              const next = [...benefits];
                              next[i] = e.target.value;
                              setLocalTenant({ ...localTenant, elite_benefits: next });
                            }}
                            onBlur={() => handleUpdateTenant('elite_benefits', localTenant.elite_benefits)}
                          />
                          <button 
                            onClick={() => {
                              const next = benefits.filter((_, idx) => idx !== i);
                              setLocalTenant({ ...localTenant, elite_benefits: next });
                              handleUpdateTenant('elite_benefits', next);
                            }}
                            style={{ 
                              background: 'rgba(255, 59, 48, 0.08)', 
                              border: '1px solid rgba(255, 59, 48, 0.2)', 
                              borderRadius: '6px', 
                              width: '26px', 
                              height: '26px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              color: '#FF3B30', 
                              cursor: 'pointer', 
                              transition: 'all 0.2s', 
                              flexShrink: 0 
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'rgba(255, 59, 48, 0.2)';
                              e.currentTarget.style.color = '#FF453A';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'rgba(255, 59, 48, 0.08)';
                              e.currentTarget.style.color = '#FF3B30';
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      {benefits.length < 6 && (
                        <button 
                          onClick={() => {
                            const next = [...benefits, 'Nouveau bénéfice...'];
                            setLocalTenant({ ...localTenant, elite_benefits: next });
                            handleUpdateTenant('elite_benefits', next);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            background: 'rgba(0, 255, 65, 0.04)',
                            border: '1px dashed rgba(0, 255, 65, 0.25)',
                            borderRadius: '8px',
                            padding: '9px',
                            color: 'var(--green)',
                            fontFamily: 'Space Mono',
                            fontSize: '10px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(0, 255, 65, 0.08)';
                            e.currentTarget.style.borderColor = 'rgba(0, 255, 65, 0.4)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(0, 255, 65, 0.04)';
                            e.currentTarget.style.borderColor = 'rgba(0, 255, 65, 0.25)';
                          }}
                        >
                          <Plus size={11} />
                          AJOUTER UN BÉNÉFICE
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Contact Link Group */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '4px' }}>
                <label style={{ fontSize: '9px', fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', fontWeight: 600 }}>
                  🔗 LIEN DE CONTACT TELEGRAM / WHATSAPP
                </label>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  background: 'rgba(0,0,0,0.3)', 
                  border: '1px solid rgba(255, 255, 255, 0.08)', 
                  borderRadius: '8px', 
                  overflow: 'hidden' 
                }}>
                  <span style={{ 
                    padding: '0 12px', 
                    fontSize: '10px', 
                    fontFamily: 'Space Mono', 
                    color: 'rgba(255,255,255,0.3)', 
                    borderRight: '1px solid rgba(255,255,255,0.08)', 
                    height: '38px', 
                    display: 'flex', 
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.01)'
                  }}>
                    Lien direct wa.me / t.me
                  </span>
                  <input 
                    style={{ 
                      flex: 1, 
                      background: 'transparent', 
                      border: 'none', 
                      padding: '10px 12px', 
                      color: '#FFF', 
                      fontSize: '12px', 
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                    value={localTenant.elite_contact_url || ''}
                    placeholder="@nom_d_utilisateur ou https://t.me/..."
                    onChange={e => setLocalTenant({ ...localTenant, elite_contact_url: e.target.value })}
                    onBlur={() => handleUpdateTenant('elite_contact_url', localTenant.elite_contact_url)}
                  />
                </div>
              </div>

              {/* Control Action Buttons */}
              <button 
                onClick={() => setShowEliteForm(false)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, rgba(255,214,10,0.15), rgba(255,180,0,0.08))',
                  border: '1px solid rgba(255, 214, 10, 0.25)',
                  color: 'var(--amber)',
                  fontFamily: 'Space Mono',
                  fontSize: '10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'center',
                  marginTop: '8px'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255, 214, 10, 0.2)';
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 214, 10, 0.15)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255, 214, 10, 0.15)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                FERMER L'ÉDITEUR & ACCÉDER AU RENDU PREMIUM
              </button>
            </div>
          ) : (
            <div style={{ 
              margin: '0 14px 40px', 
              background: 'var(--glass)', 
              border: '1px solid var(--subtle)', 
              borderRadius: '14px', 
              overflow: 'hidden', 
              position: 'relative',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)'
            }}>
              
              {/* Dynamic Pencil edit tab trigger only for admin user */}
              {isAdminUser && (
                <div 
                  onClick={() => setShowEliteForm(true)}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    background: 'rgba(255,214,10,0.12)',
                    border: '1px solid rgba(255,214,10,0.25)',
                    borderRadius: '20px',
                    padding: '4px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'var(--amber)',
                    fontFamily: 'Space Mono',
                    fontSize: '9px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    zIndex: 9,
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,214,10,0.22)';
                    e.currentTarget.style.transform = 'scale(1.03)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,214,10,0.12)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <Pencil size={10} />
                  CONFIGURER L'ACCOMPAGNEMENT
                </div>
              )}

              {/* Cover Banner */}
              <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: 'rgba(255,255,255,0.02)' }}>
                {localTenant?.elite_cover_url ? (
                  <img 
                    src={localTenant.elite_cover_url} 
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
                    alt="Elite Coaching" 
                  />
                ) : (
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <ImagePlus size={32} color="rgba(255,255,255,0.1)" />
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontWeight: 700, letterSpacing: '0.1em' }}>CADRE COUVERTURE COACHING</span>
                  </div>
                )}
                
                {isAdminUser && (
                  <label style={{ 
                    position: 'absolute', 
                    bottom: '12px', 
                    right: '12px', 
                    background: 'var(--green)', 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    cursor: 'pointer', 
                    boxShadow: '0 4px 20px rgba(0,255,65,0.35)', 
                    zIndex: 10,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <Camera size={17} color="#050507" />
                    <input type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => handleImageUpload(e, 'elite_cover')} />
                  </label>
                )}
              </div>

              {/* Public/Teaser Card Details */}
              <div style={{ padding: '16px' }}>
                <div style={{ 
                  background: 'rgba(255,214,10,0.08)', 
                  border: '1px solid rgba(255,214,10,0.18)', 
                  borderRadius: '4px', 
                  padding: '3px 10px', 
                  fontFamily: 'Space Mono', 
                  fontSize: '8px', 
                  letterSpacing: '0.15em', 
                  color: 'var(--amber)', 
                  display: 'inline-block', 
                  marginBottom: '6px',
                  fontWeight: 700
                }}>
                  ACCOMPAGNEMENT EXCLUSIF
                </div>
                <div style={{ fontSize: '11px', fontStyle: 'italic', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
                  One to One
                </div>
                
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#F0F0F0', lineHeight: 1.3 }}>
                  {localTenant.elite_title || 'COACHING PRIVÉ ÉLITE'}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.7, margin: '10px 0', minHeight: '40px' }}>
                  {localTenant.elite_description || 'Bénéficiez d\'une immersion complète et d\'un encadrement direct de haut niveau pour accélérer votre transition vers la rentabilité.'}
                </div>

                {localTenant.elite_price && (
                  <div style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    background: 'rgba(255,214,10,0.06)', 
                    border: '1px solid rgba(255,214,10,0.18)', 
                    borderRadius: '8px', 
                    padding: '8px 16px', 
                    marginBottom: '16px', 
                    fontFamily: 'Space Mono', 
                    fontSize: '18px', 
                    fontWeight: 800, 
                    color: 'var(--amber)' 
                  }}>
                    {localTenant.elite_price}
                  </div>
                )}

                <button 
                  onClick={() => setShowEliteModal(true)}
                  style={{ 
                    width: '100%', 
                    height: '48px', 
                    borderRadius: '10px', 
                    background: 'linear-gradient(135deg, rgba(255,214,10,0.15), rgba(255,180,0,0.06))', 
                    border: '1px solid rgba(255,214,10,0.3)', 
                    color: 'var(--amber)', 
                    fontFamily: 'Space Mono', 
                    fontSize: '11px', 
                    fontWeight: 700, 
                    cursor: 'pointer', 
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                    boxShadow: '0 0 15px rgba(255,214,10,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.boxShadow = '0 0 25px rgba(255,214,10,0.2)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,214,10,0.22), rgba(255,180,0,0.1))';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(255,214,10,0.05)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,214,10,0.15), rgba(255,180,0,0.06))';
                  }}
                >
                  ✦ VOIR LES DÉTAILS DU PROGRAMME →
                </button>
              </div>
            </div>
          )}
        </>
      )}
      <PoweredBy />

      {/* BLOCK 7 - BROKERS */}
      {renderSectionHeader(
        "DÉMARRE TON TRADING ICI",
        isAdminUser && (
          <Pencil size={14} color="var(--green)" onClick={() => setShowBrokersForm(!showBrokersForm)} style={{ marginLeft: 'auto', cursor: 'pointer' }} />
        )
      )}
      <div style={{ fontSize: '11px', color: 'var(--muted)', padding: '0 14px 10px' }}>
        Ouvre un compte via nos liens officiels
      </div>
      
      {showBrokersForm && isAdminUser && (
        <div style={{ margin: '0 14px 16px', background: 'var(--glass)', padding: '16px', borderRadius: '12px', border: '1px solid var(--subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2].map(num => (
            <div key={num} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '10px', color: 'var(--green)', fontFamily: 'Space Mono' }}>BROKER {num}</div>
              <input 
                style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--subtle)', borderRadius: '8px', padding: '8px', color: '#FFF', fontSize: '12px' }}
                placeholder="Nom du Broker"
                value={localConfig?.[`broker_${num}_name`] || ''}
                onChange={e => handleUpdateConfig(`broker_${num}_name`, e.target.value)}
              />
              <input 
                style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--subtle)', borderRadius: '8px', padding: '8px', color: '#FFF', fontSize: '12px' }}
                placeholder="Lien d'affiliation"
                value={localConfig?.[`broker_${num}_url`] || ''}
                onChange={e => handleUpdateConfig(`broker_${num}_url`, e.target.value)}
              />
            </div>
          ))}
          <button onClick={() => setShowBrokersForm(false)} style={{ background: 'var(--green)', color: '#000', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Terminer</button>
        </div>
      )}

      <div style={{ margin: '0 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[1, 2].map(num => {
          const name = localTenant?.[`broker_${num}_name`] || localConfig?.[`broker_${num}_name`];
          const url = localTenant?.[`broker_${num}_url`] || localConfig?.[`broker_${num}_url`];
          if (!name && !isAdminUser) return null;
          if (!name && isAdminUser && !showBrokersForm) return null;
          
          return (
            <div 
              key={num}
              onClick={() => {
                if (url) openLink(url);
                else if (isAdminUser) setShowBrokersForm(true);
              }}
              style={{ background: 'var(--glass)', border: '1px solid var(--subtle)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(0,255,65,0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--subtle)'}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.15)', borderRadius: '10px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Space Mono', fontSize: '13px', fontWeight: 800, color: 'var(--green)', marginRight: '12px' }}>
                  {name ? name.substring(0, 2).toUpperCase() : '?'}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{name || 'Configurer Broker'}</div>
                  <div style={{ fontSize: '10px', color: 'var(--muted)' }}>Lien officiel partenaire</div>
                </div>
              </div>
              <ChevronRight size={16} color="rgba(255,255,255,0.2)" />
            </div>
          );
        })}
      </div>

      {/* Fallback broker 3 */}
      {(localTenant?.broker_3_name || localConfig?.broker_3_name) && (
        <div 
          onClick={() => {
            const url = localTenant?.broker_3_url || localConfig?.broker_3_url;
            if (url) openLink(url);
          }}
          style={{ background: 'transparent', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 16px', margin: '8px 14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--amber)' }}>⚠</span>
            <div>
              <div style={{ fontFamily: 'Space Mono', fontSize: '8px', letterSpacing: '0.1em', color: 'var(--amber)' }}>SI LES BROKERS SONT INDISPONIBLES</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{localTenant?.broker_3_name || localConfig?.broker_3_name}</div>
              <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>OPTION DE SECOURS</div>
            </div>
          </div>
          <ChevronRight size={14} color="rgba(255,255,255,0.15)" />
        </div>
      )}
      <PoweredBy />

      {/* BLOCK 8 - DISCUTER AVEC LE MENTOR (Telegram + WhatsApp) */}
      {renderSectionHeader(
        `DISCUTER AVEC ${mentorName.toUpperCase()}`,
        isAdminUser && (
          <Pencil size={14} color="var(--green)" onClick={() => setShowSocialForm(!showSocialForm)} style={{ marginLeft: 'auto', cursor: 'pointer' }} />
        )
      )}

      {showSocialForm && isAdminUser && (
        <div style={{ margin: '0 14px 16px', background: 'var(--glass)', padding: '16px', borderRadius: '12px', border: '1px solid var(--subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* --- MESSAGING --- */}
          <div style={{ fontFamily: 'Space Mono', fontSize: '8px', letterSpacing: '0.15em', color: 'var(--muted)', marginBottom: '2px' }}>MESSAGERIE</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Send size={14} color="#0088CC" />
              <input
                style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid var(--subtle)', borderRadius: '8px', padding: '8px', color: '#FFF', fontSize: '12px' }}
                placeholder="Username Telegram (ex: @Michaeljay56)"
                value={localTenant?.social_telegram || ''}
                onChange={e => setLocalTenant({...localTenant, social_telegram: e.target.value})}
                onBlur={e => handleUpdateTenant('social_telegram', e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageCircle size={14} color="#25D366" />
              <input
                style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid var(--subtle)', borderRadius: '8px', padding: '8px', color: '#FFF', fontSize: '12px' }}
                placeholder="Numéro WhatsApp avec indicatif (ex: +243837606139)"
                value={localTenant?.social_whatsapp || ''}
                onChange={e => setLocalTenant({...localTenant, social_whatsapp: e.target.value})}
                onBlur={e => handleUpdateTenant('social_whatsapp', e.target.value)}
              />
            </div>
          </div>

          {/* --- CONTENT NETWORKS --- */}
          <div style={{ fontFamily: 'Space Mono', fontSize: '8px', letterSpacing: '0.15em', color: 'var(--muted)', marginTop: '8px', marginBottom: '2px' }}>RÉSEAUX SOCIAUX</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Youtube size={14} color="#FF0000" />
              <input
                style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid var(--subtle)', borderRadius: '8px', padding: '8px', color: '#FFF', fontSize: '12px' }}
                placeholder="Lien YouTube (ex: https://youtube.com/@channel)"
                value={localTenant?.social_youtube || ''}
                onChange={e => setLocalTenant({...localTenant, social_youtube: e.target.value})}
                onBlur={e => handleUpdateTenant('social_youtube', e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: 14, lineHeight: 1 }}>♪</span>
              <input
                style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid var(--subtle)', borderRadius: '8px', padding: '8px', color: '#FFF', fontSize: '12px' }}
                placeholder="Lien TikTok (ex: https://tiktok.com/@user)"
                value={localTenant?.social_tiktok || ''}
                onChange={e => setLocalTenant({...localTenant, social_tiktok: e.target.value})}
                onBlur={e => handleUpdateTenant('social_tiktok', e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Instagram size={14} color="#E1306C" />
              <input
                style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid var(--subtle)', borderRadius: '8px', padding: '8px', color: '#FFF', fontSize: '12px' }}
                placeholder="Lien Instagram (ex: https://instagram.com/user)"
                value={localTenant?.social_instagram || ''}
                onChange={e => setLocalTenant({...localTenant, social_instagram: e.target.value})}
                onBlur={e => handleUpdateTenant('social_instagram', e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: 14, color: '#1877F2', fontWeight: 900, lineHeight: 1 }}>f</span>
              <input
                style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid var(--subtle)', borderRadius: '8px', padding: '8px', color: '#FFF', fontSize: '12px' }}
                placeholder="Lien Facebook (ex: https://facebook.com/page)"
                value={localTenant?.social_facebook || ''}
                onChange={e => setLocalTenant({...localTenant, social_facebook: e.target.value})}
                onBlur={e => handleUpdateTenant('social_facebook', e.target.value)}
              />
            </div>
          </div>

          <button onClick={() => setShowSocialForm(false)} style={{ background: 'var(--green)', color: '#000', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', marginTop: '4px', width: '100%' }}>Terminer</button>
        </div>
      )}

      {/* MESSAGING BUTTONS (Telegram + WhatsApp) */}
      {(localTenant?.social_telegram || localTenant?.social_whatsapp) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '0 14px' }}>
          {localTenant?.social_telegram && (
            <button
              onClick={() => {
                const raw = localTenant.social_telegram.trim();
                // Support: @username, username, or full URL
                let url = raw;
                if (!raw.startsWith('http')) {
                  const handle = raw.startsWith('@') ? raw.slice(1) : raw;
                  url = `https://t.me/${handle}`;
                }
                openLink(url);
              }}
              style={{ height: '52px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'Space Mono', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: 'rgba(0,136,204,0.1)', border: '1px solid rgba(0,136,204,0.2)', color: '#0088CC' }}
            >
              ✈ TELEGRAM
            </button>
          )}
          {localTenant?.social_whatsapp && (
            <button
              onClick={() => {
                const raw = localTenant.social_whatsapp.trim();
                // Strip +, spaces, dashes → wa.me/NUMBER
                if (raw.startsWith('http')) {
                  openLink(raw);
                } else {
                  const number = raw.replace(/[\s\-\+]/g, '');
                  openLink(`https://wa.me/${number}`);
                }
              }}
              style={{ height: '52px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'Space Mono', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)', color: '#25D366' }}
            >
              💬 WHATSAPP
            </button>
          )}
        </div>
      )}

      {/* BLOCK 8B - RÉSEAUX SOCIAUX (YouTube, TikTok, Instagram, Facebook) */}
      {(localTenant?.social_youtube || localTenant?.social_tiktok || localTenant?.social_instagram || localTenant?.social_facebook) && (
        <>
          {renderSectionHeader("NOS RÉSEAUX SOCIAUX")}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '0 14px' }}>
            {localTenant?.social_youtube && (
              <button
                onClick={() => openLink(localTenant.social_youtube.startsWith('http') ? localTenant.social_youtube : `https://youtube.com/${localTenant.social_youtube.startsWith('@') ? localTenant.social_youtube : '@' + localTenant.social_youtube}`)}
                style={{ height: '52px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'Space Mono', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: 'rgba(255,0,0,0.08)', border: '1px solid rgba(255,0,0,0.2)', color: '#FF4444' }}
              >
                ▶ YOUTUBE
              </button>
            )}
            {localTenant?.social_tiktok && (
              <button
                onClick={() => openLink(localTenant.social_tiktok.startsWith('http') ? localTenant.social_tiktok : `https://tiktok.com/${localTenant.social_tiktok.startsWith('@') ? localTenant.social_tiktok : '@' + localTenant.social_tiktok}`)}
                style={{ height: '52px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'Space Mono', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
              >
                ♪ TIKTOK
              </button>
            )}
            {localTenant?.social_instagram && (
              <button
                onClick={() => {
                  const raw = localTenant.social_instagram.trim();
                  if (raw.startsWith('http')) openLink(raw);
                  else {
                    const handle = raw.startsWith('@') ? raw.slice(1) : raw;
                    openLink(`https://instagram.com/${handle}`);
                  }
                }}
                style={{ height: '52px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'Space Mono', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: 'rgba(225,48,108,0.1)', border: '1px solid rgba(225,48,108,0.2)', color: '#E1306C' }}
              >
                ◎ INSTAGRAM
              </button>
            )}
            {localTenant?.social_facebook && (
              <button
                onClick={() => {
                  const raw = localTenant.social_facebook.trim();
                  if (raw.startsWith('http')) openLink(raw);
                  else openLink(`https://facebook.com/${raw}`);
                }}
                style={{ height: '52px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'Space Mono', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: 'rgba(24,119,242,0.08)', border: '1px solid rgba(24,119,242,0.2)', color: '#1877F2' }}
              >
                f FACEBOOK
              </button>
            )}
          </div>
        </>
      )}
      <PoweredBy />

      {/* BLOCK 8B - NOTIFICATION PREFERENCES */}
      {currentUser && (
        <>
          {renderSectionHeader("PRÉFÉRENCES NOTIFICATIONS")}
          <div style={{ margin: '0 14px 16px', background: 'var(--glass)', border: '1px solid var(--subtle)', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { key: 'notif_signals', label: 'Alertes Nouveaux Signaux', desc: 'Recevoir une alerte lors de la publication de signaux.' },
              { key: 'notif_academy', label: 'Alertes Academy', desc: 'Recevoir une alerte quand une nouvelle leçon est publiée.' },
              { key: 'notif_vip', label: 'Alertes Expirations VIP', desc: 'Recevoir des rappels avant l\'expiration de votre accès.' },
            ].map((pref) => {
              const isEnabled = currentUser[pref.key] !== false; // default true
              
              const handleToggle = async () => {
                try {
                  const { error } = await supabase
                    .from('affiliates')
                    .update({ [pref.key]: !isEnabled })
                    .eq('id', currentUser.id);
                  if (error) throw error;
                } catch (err: any) {
                  console.error('Toggle preference error:', err);
                }
              };

              return (
                <div key={pref.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1, paddingRight: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFF' }}>{pref.label}</div>
                    <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px', lineHeight: 1.3 }}>{pref.desc}</div>
                  </div>
                  
                  <div 
                    onClick={handleToggle}
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      background: isEnabled ? 'rgba(0,255,65,0.15)' : 'rgba(255,255,255,0.08)',
                      border: isEnabled ? '1px solid var(--green)' : '1px solid rgba(255,255,255,0.12)',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      flexShrink: 0
                    }}
                  >
                    <div 
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: isEnabled ? 'var(--green)' : 'rgba(255,255,255,0.4)',
                        position: 'absolute',
                        top: '2px',
                        left: isEnabled ? '22px' : '2px',
                        transition: 'all 0.2s',
                        boxShadow: isEnabled ? '0 0 8px rgba(0,255,65,0.6)' : 'none'
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* BLOCK 9 - MEMBER CARD */}
      {currentUser && (
        <>
          {renderSectionHeader("CONNECTÉ EN TANT QUE")}
          <div style={{ margin: '0 14px', background: 'var(--glass)', border: '1px solid var(--subtle)', borderLeft: '3px solid var(--green)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.2)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--green)', fontFamily: 'Space Mono', marginRight: '10px' }}>
                {(currentUser.username || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>@{currentUser.username}</div>
                <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginTop: '2px' }}>
                  Membre depuis le {new Date(currentUser.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              {isAdminUser && (
                <div style={{ background: 'rgba(255,214,10,0.1)', border: '1px solid rgba(255,214,10,0.25)', color: 'var(--amber)', fontFamily: 'Space Mono', fontSize: '9px', padding: '3px 10px', borderRadius: '99px' }}>
                  ADMIN
                </div>
              )}
              {currentUser.status && (
                <div style={{
                  fontFamily: 'Space Mono', fontSize: '9px', padding: '2px 8px', borderRadius: '99px', letterSpacing: '0.08em',
                  ...(currentUser.status === 'ACTIVE' ? { background: 'rgba(0,255,65,0.1)', color: 'var(--green)' } :
                      currentUser.status === 'PENDING' ? { background: 'rgba(255,214,10,0.1)', color: 'var(--amber)' } :
                      currentUser.status === 'REFUSED' ? { background: 'rgba(255,59,48,0.1)', color: 'var(--red)' } :
                      { background: 'rgba(255,59,48,0.15)', color: 'var(--red)' })
                }}>
                  {currentUser.status}
                </div>
              )}
            </div>
          </div>
          {/* VIP toggle removed by request */}
        </>
      )}

      {/* BLOCK 9B - ADMIN ACTION BUTTON */}
      {isAdminUser && (
        <>
          <div style={{ height: '20px' }} />
          <button 
            onClick={() => navigate('../admin')}
            style={{ width: 'calc(100% - 28px)', height: '56px', borderRadius: '14px', background: 'rgba(255,214,10,0.06)', border: '1px solid rgba(255,214,10,0.2)', color: 'var(--amber)', fontFamily: 'Space Mono', fontSize: '13px', fontWeight: 800, letterSpacing: '0.06em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', margin: '0 14px' }}
          >
            <Settings size={16} /> GÉRER LE TERMINAL ADMIN
          </button>
        </>
      )}

      <div style={{ height: 20 }} />
    </div>

    {/* Elite Coaching Modal — Premium conversion funnel */}
    <EliteCoachingModal
      isOpen={showEliteModal}
      onClose={() => setShowEliteModal(false)}
      tenant={localTenant}
      currentUser={currentUser}
      mentorName={mentorName}
    />
    </>
  );
}
