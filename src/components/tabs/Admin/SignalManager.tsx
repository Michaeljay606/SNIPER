  const handleAddAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlert.pair || !newAlert.zone) {
      onShowToast(t('admin.fill_alert_fields'), "error");
      return;
    }
    
    setIsGlobalLoading(true);
    setLoadingMessage(t('admin.publishing_alert'));
    try {
      const payload = {
        tenant_id: TENANT_ID,
        pair: newAlert.pair,
        type: newAlert.type,
        entry: newAlert.zone, // We use 'entry' field for the zone in Alert mode
        status: 'WATCH',
        is_vip: newAlert.isVip,
        note: newAlert.note
      };
      const { error } = await withTimeout(supabase.from('signals').insert([payload]), 30000);
      if (error) throw error;
      
      onShowToast(t('admin.alert_launched'));
      setNewAlert({ pair: 'XAUUSD', type: 'BUY', zone: '', note: '', isVip: false });
    } catch (error: any) {
      onShowToast(t('error_prefix') + error.message, 'error');
    } finally {
      setIsGlobalLoading(false);
    }
  };

  const handleActionClick = (id: string, action: 'TP_HIT' | 'SL_HIT') => {
    setSignalActionState({ id, action });
    setPipsInput(action === 'TP_HIT' ? '50' : '20');
  };

  const confirmAction = async () => {
    if (!signalActionState) return;
    const { id, action } = signalActionState;
    const pips = parseInt(pipsInput) || 0;
    
    setIsGlobalLoading(true);
    setLoadingMessage(t('admin.publishing'));
    try {
      const { error } = await withTimeout(supabase
        .from('signals')
        .update({ 
          status: action, 
          pips_gain: pips,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('tenant_id', TENANT_ID)
      );
      if (error) throw error;
      onShowToast(t('admin.status_updated', { status: action }));
      setSignalActionState(null);
    } catch (error: any) {
      onShowToast(t('error_prefix') + error.message, 'error');
    } finally {
      setIsGlobalLoading(false);
    }
  };

  const handleCaptureUpload = async (e: React.ChangeEvent<HTMLInputElement>, signalId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSignalId(signalId);
    try {
      const url = await compressAndUpload(file, 'results', (msg) => onShowToast(msg));
      
      const currentSignal = liveSignals.find(s => s.id === signalId);
      let newImages = url;
      if (currentSignal && currentSignal.resultImage) {
        const existingImages = currentSignal.resultImage.split('||').filter(Boolean);
        existingImages.push(url);
        newImages = existingImages.join('||');
      }

      const { error } = await withTimeout(supabase
        .from('signals')
        .update({ 
          result_image: newImages,
          updated_at: new Date().toISOString()
        })
        .eq('id', signalId), 30000);
        
      if (error) throw error;
      onShowToast(t('admin.image_added_success'));
    } catch (error: any) {
      onShowToast(t('error_prefix') + error.message, "error");
    } finally {
      setUploadingSignalId(null);
    }
  };

  const removeCapture = async (signalId: string, imgUrl: string) => {
    if (!confirm(t('admin.confirm_remove_capture') || 'Retirer cette image ?')) return;
    try {
      const currentSignal = liveSignals.find(s => s.id === signalId);
      if (!currentSignal) return;
      
      const images = currentSignal.resultImage.split('||').filter((url: string) => url !== imgUrl).join('||');
      const { error } = await supabase.from('signals').update({ result_image: images }).eq('id', signalId);
      if (error) throw error;
      onShowToast(t('admin.image_removed'));
    } catch (error: any) {
      onShowToast(t('admin.remove_image_error', { error: error.message }), 'error');
    }
  };

  const convertToLive = async (signal: any) => {
    const entry = prompt(t('admin.entry_placeholder'), signal.entry);
    if (!entry) return;
    const sl = prompt(t('admin.sl_placeholder'));
    if (!sl) return;
    const tp1 = prompt(t('admin.tp1_placeholder'));
    if (!tp1) return;

    setIsGlobalLoading(true);
    setLoadingMessage(t('admin.converting_live'));
    try {
      const { error } = await supabase.from('signals').update({
        status: 'LIVE',
        entry: parseFloat(entry.replace(',', '.')),
        sl: parseFloat(sl.replace(',', '.')),
        tp: `${tp1} | ${prompt(t('admin.tp2_placeholder')) || ''}`,
        updated_at: new Date().toISOString()
      }).eq('id', signal.id);
      if (error) throw error;
      onShowToast(t('admin.signal_published'));
    } catch (error: any) {
      onShowToast(t('error_prefix') + error.message, 'error');
    } finally {
      setIsGlobalLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab Selector for Signal/Alert */}
      <div className="flex p-1 bg-bg-surface border border-border-subtle rounded-xl gap-1">
        <button 
          onClick={() => setSignalFormMode('signal')}
          className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${signalFormMode === 'signal' ? 'bg-accent-emerald text-bg-base shadow-card' : 'text-text-muted hover:text-text-primary'}`}
        >
          {t('admin.new_signal')}
        </button>
        <button 
          onClick={() => setSignalFormMode('alert')}
          className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${signalFormMode === 'alert' ? 'bg-accent-warning text-bg-base shadow-card' : 'text-text-muted hover:text-text-primary'}`}
        >
          {t('admin.new_alert')}
        </button>
      </div>

      <input type="file" ref={fileInputRef} onChange={(e) => {}} className="hidden" />

      {signalFormMode === 'signal' ? (
        <form onSubmit={handleAddSignal} className="glass-card p-4 space-y-4 border-accent-emerald/20">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] text-text-muted uppercase font-black px-1">{t('admin.pair')}</label>
              <input 
                className="w-full h-11 bg-bg-input border border-border-subtle rounded-xl px-4 text-sm text-text-primary focus:border-accent-emerald transition-all outline-none" 
                value={newSignal.pair} 
                onChange={e => setNewSignal({...newSignal, pair: e.target.value.toUpperCase()})} 
                placeholder="ex: XAUUSD"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] text-text-muted uppercase font-black px-1">{t('admin.type')}</label>
              <select 
                className="w-full h-11 bg-bg-input border border-border-subtle rounded-xl px-4 text-sm text-text-primary focus:border-accent-emerald transition-all outline-none" 
                value={newSignal.type} 
                onChange={e => setNewSignal({...newSignal, type: e.target.value})}
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1">
               <label className="text-[9px] text-text-muted uppercase font-black px-1">{t('admin.entry')}</label>
               <input className="w-full h-11 bg-bg-input border border-border-subtle rounded-xl px-4 text-sm text-text-primary outline-none focus:border-accent-emerald" value={newSignal.entry} onChange={e => setNewSignal({...newSignal, entry: e.target.value})} placeholder="0.0000" />
             </div>
             <div className="space-y-1">
               <label className="text-[9px] text-text-muted uppercase font-black px-1">Stop Loss</label>
               <input className="w-full h-11 bg-bg-input border border-border-subtle rounded-xl px-4 text-sm text-text-primary outline-none focus:border-accent-emerald" value={newSignal.sl} onChange={e => setNewSignal({...newSignal, sl: e.target.value})} placeholder="0.0000" />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1">
               <label className="text-[9px] text-text-muted uppercase font-black px-1">Take Profit 1</label>
               <input className="w-full h-11 bg-bg-input border border-border-subtle rounded-xl px-4 text-sm text-text-primary outline-none focus:border-accent-emerald" value={newSignal.tp1} onChange={e => setNewSignal({...newSignal, tp1: e.target.value})} placeholder="0.0000" />
             </div>
             <div className="space-y-1">
               <label className="text-[9px] text-text-muted uppercase font-black px-1">Take Profit 2</label>
               <input className="w-full h-11 bg-bg-input border border-border-subtle rounded-xl px-4 text-sm text-text-primary outline-none focus:border-accent-emerald" value={newSignal.tp2} onChange={e => setNewSignal({...newSignal, tp2: e.target.value})} placeholder="0.0000" />
             </div>
          </div>

          <div className="flex items-center gap-2 p-2 bg-bg-surface rounded-xl border border-border-subtle">
            <input 
              type="checkbox" 
              id="vip-toggle" 
              checked={newSignal.isVip} 
              onChange={e => setNewSignal({...newSignal, isVip: e.target.checked})}
              className="w-4 h-4 accent-accent-warning"
            />
            <label htmlFor="vip-toggle" className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t('admin.vip_only')}</label>
          </div>

          <button type="submit" className="w-full h-12 bg-accent-emerald text-bg-base rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all">
            {t('admin.publish_signal')}
          </button>
        </form>
      ) : (
        <form onSubmit={handleAddAlert} className="glass-card p-4 space-y-4 border-accent-warning/20">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] text-text-muted uppercase font-black px-1">{t('admin.pair')}</label>
              <input 
                className="w-full h-11 bg-bg-input border border-border-subtle rounded-xl px-4 text-sm text-text-primary focus:border-accent-warning outline-none" 
                value={newAlert.pair} 
                onChange={e => setNewAlert({...newAlert, pair: e.target.value.toUpperCase()})} 
                placeholder="ex: EURUSD"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] text-text-muted uppercase font-black px-1">{t('admin.type')}</label>
              <select className="w-full h-11 bg-bg-input border border-border-subtle rounded-xl px-4 text-sm text-text-primary" value={newAlert.type} onChange={e => setNewAlert({...newAlert, type: e.target.value})}>
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] text-text-muted uppercase font-black px-1">{t('admin.price_zone')}</label>
            <input className="w-full h-11 bg-bg-input border border-border-subtle rounded-xl px-4 text-sm text-text-primary" value={newAlert.zone} onChange={e => setNewAlert({...newAlert, zone: e.target.value})} placeholder="Ex: 1.0850 - 1.0860" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] text-text-muted uppercase font-black px-1">{t('admin.note_optional')}</label>
            <textarea className="w-full bg-bg-input border border-border-subtle rounded-xl px-4 py-3 text-xs text-text-primary resize-none h-20" value={newAlert.note} onChange={e => setNewAlert({...newAlert, note: e.target.value})} placeholder={t('admin.note_placeholder')} />
          </div>
          <button type="submit" className="w-full h-12 bg-accent-warning text-bg-base rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg active:scale-95">
            {t('admin.broadcast_alert')}
          </button>
        </form>
      )}

      {/* Action Overlay */}
      {signalActionState && (
        <div className="fixed inset-0 z-[1000] bg-bg-void/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-sm glass-card p-6 space-y-6 border-accent-neon/30 scale-in">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-widest">{signalActionState.action === 'TP_HIT' ? 'VALIDATION GAIN' : 'VALIDATION PERTE'}</h3>
              <button onClick={() => setSignalActionState(null)} className="p-2 bg-bg-surface rounded-full"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em]">{t('admin.pips_gained')}</label>
              <input 
                type="number"
                className="w-full h-14 bg-bg-input border border-border-subtle rounded-2xl px-6 text-2xl font-black font-mono text-accent-neon outline-none focus:border-accent-neon"
                value={pipsInput}
                onChange={e => setPipsInput(e.target.value)}
              />
            </div>
            <button onClick={confirmAction} className="w-full py-4 bg-accent-neon text-bg-base font-black rounded-2xl uppercase tracking-widest shadow-lg">
              {t('admin.confirm')}
            </button>
          </div>
        </div>
      )}

      {/* Signal List for Management */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">{t('admin.recent_signals')}</h3>
        {liveSignals.map(signal => (
          <GlassCard key={signal.id} className="!p-4 border-border-subtle hover:border-accent-emerald/30 transition-all space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black font-mono text-text-primary">{signal.pair}</span>
                  <Badge variant={signal.type === 'BUY' ? 'neon' : 'danger'}>{signal.type}</Badge>
                  {signal.isVip && <Badge variant="warning">VIP</Badge>}
                </div>
                <span className="text-[9px] text-text-muted font-mono mt-0.5">{signal.status} · {new Date(signal.timestamp).toLocaleTimeString()}</span>
              </div>
              <button onClick={() => deleteSignal(signal.id)} className="p-2 text-text-muted hover:text-accent-red transition-colors">
                <Trash2 size={14} />
              </button>
            </div>

            {signal.status === 'LIVE' ? (
              <div className="flex gap-2">
                <button onClick={() => handleActionClick(signal.id, 'TP_HIT')} className="flex-1 py-2 bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20 rounded-lg text-[9px] font-bold uppercase tracking-widest">TP HIT</button>
                <button onClick={() => handleActionClick(signal.id, 'SL_HIT')} className="flex-1 py-2 bg-accent-red/10 text-accent-red border border-accent-red/20 rounded-lg text-[9px] font-bold uppercase tracking-widest">SL HIT</button>
              </div>
            ) : signal.status === 'WATCH' ? (
              <button onClick={() => convertToLive(signal)} className="w-full py-2 bg-accent-emerald text-bg-base rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg">
                {t('admin.activate_live')}
              </button>
            ) : null}

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">{t('admin.capture')}</span>
                <label className="cursor-pointer text-[9px] font-bold text-accent-neon uppercase tracking-widest flex items-center gap-1 hover:opacity-70 transition-opacity">
                  <ImageIcon size={10} />
                  {t('admin.add_image')}
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleCaptureUpload(e, signal.id)} />
                </label>
              </div>
              
              {uploadingSignalId === signal.id && (
                <div className="flex items-center justify-center py-4 bg-bg-surface rounded-xl border border-dashed border-accent-neon/30">
                  <Loader2 className="animate-spin text-accent-neon" size={16} />
                </div>
              )}

              {signal.resultImage && (
                <div className="grid grid-cols-4 gap-2">
                  {signal.resultImage.split('||').filter(Boolean).map((img: string, i: number) => (
                    <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border-subtle">
                      <img src={img} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removeCapture(signal.id, img)}
                        className="absolute inset-0 bg-accent-red/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};

export default SignalManager;
