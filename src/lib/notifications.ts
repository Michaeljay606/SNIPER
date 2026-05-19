import { supabase } from './supabase';

export interface NotificationPayload {
  type: string;
  tenant_id: string;
  target_type: 'member' | 'mentor' | 'all_members' | 'vip_members' | 'free_members';
  target_telegram_id?: number | string | null;
  data: Record<string, any>;
}

/**
 * Triggers a notification via the send-notification edge function.
 * If the Deno edge function call fails, falls back to direct API fetch.
 */
export async function triggerNotification(payload: NotificationPayload) {
  try {
    const cleanPayload = {
      ...payload,
      target_telegram_id: payload.target_telegram_id ? Number(payload.target_telegram_id) : undefined
    };

    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: cleanPayload
    });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Supabase function invoke error, trying fallback fetch:', err);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(payload)
      });
      return await response.json();
    } catch (fetchErr) {
      console.error('Fallback fetch for send-notification failed:', fetchErr);
      return { success: false, error: String(fetchErr) };
    }
  }
}
