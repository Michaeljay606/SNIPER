import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Link2, Share2, Users, WalletCards } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useClientConfig } from '../../../hooks/useClientConfig';
import PlanBadge from '../../PlanBadge';
import { useTranslation } from 'react-i18next';

type PlanId = 'free' | 'basic' | 'premium' | 'empire' | 'pause';
type ReferralStatus = 'pending' | 'validated' | 'paid';

interface ReferralTenant {
  tenant_id: string;
  mentor_name: string | null;
  plan: PlanId | null;
  created_at: string | null;
}

interface ReferralEvent {
  id: string;
  referrer_id: string;
  referred_id: string;
  month_number: number;
  amount_cents: number;
  plan_at_time: string;
  status: ReferralStatus;
  created_at: string;
  validated_at: string | null;
}

interface ReferralRow extends ReferralTenant {
  paidMonths: number;
  totalEarnedCents: number;
}

interface ReferralTabProps {
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning') => void;
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const commissionRate = 10;

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 10,
};

export default function ReferralTab({ onShowToast }: ReferralTabProps) {
  const { t } = useTranslation();
  const { tenant_id } = useParams();
  const tenantId = tenant_id || 'default';
  const { config } = useClientConfig();
  const [referrals, setReferrals] = useState<ReferralTenant[]>([]);
  const [events, setEvents] = useState<ReferralEvent[]>([]);
  const [copied, setCopied] = useState(false);
  const [copiedMiniApp, setCopiedMiniApp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const referralCode = config?.referral_code || '...';
  const referralLink = `https://t.me/SniperTradingBot?start=ref_${referralCode}`;
  const miniAppLink = `https://t.me/SniperTradingBot/app?startapp=${encodeURIComponent(tenantId)}`;

  useEffect(() => {
    let cancelled = false;

    async function loadReferralData() {
      setIsLoading(true);
      const [tenantsRes, eventsRes] = await Promise.all([
        supabase
          .from('tenants')
          .select('tenant_id, mentor_name, plan, created_at')
          .eq('referred_by', tenantId)
          .order('created_at', { ascending: false }),
        supabase
          .from('referral_events')
          .select('*')
          .eq('referrer_id', tenantId),
      ]);

      if (cancelled) return;

      if (tenantsRes.error || eventsRes.error) {
        onShowToast(t('referral_admin.load_error'), 'error');
      } else {
        setReferrals((tenantsRes.data || []) as ReferralTenant[]);
        setEvents((eventsRes.data || []) as ReferralEvent[]);
      }

      setIsLoading(false);
    }

    loadReferralData();

    return () => {
      cancelled = true;
    };
  }, [tenantId, onShowToast]);

  const rows = useMemo<ReferralRow[]>(() => {
    return referrals.map(referral => {
      const validatedEvents = events.filter(event =>
        event.referred_id === referral.tenant_id &&
        (event.status === 'validated' || event.status === 'paid')
      );

      return {
        ...referral,
        paidMonths: validatedEvents.length,
        totalEarnedCents: validatedEvents.reduce((sum, event) => sum + event.amount_cents, 0),
      };
    });
  }, [events, referrals]);

  const totals = useMemo(() => {
    return events.reduce(
      (acc, event) => {
        if (event.status === 'pending') acc.pending += event.amount_cents;
        if (event.status === 'validated') acc.validated += event.amount_cents;
        acc.total += event.amount_cents;
        return acc;
      },
      { pending: 0, validated: 0, total: 0 }
    );
  }, [events]);

  const copyCode = async () => {
    await navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const shareLink = () => {
    const text =
      t('referral_admin.share_referral_text', { code: referralCode });
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`;
    window.Telegram?.WebApp?.openTelegramLink?.(shareUrl);
  };

  const copyMiniAppLink = async () => {
    await navigator.clipboard.writeText(miniAppLink);
    setCopiedMiniApp(true);
    setTimeout(() => setCopiedMiniApp(false), 1800);
  };

  const shareMiniAppLink = () => {
    const mentorName = config?.mentorName || config?.mentor_name || t('referral_admin.my_mentor');
    const text =
      t('referral_admin.share_miniapp_text', { mentor: mentorName });
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(miniAppLink)}&text=${encodeURIComponent(text)}`;
    window.Telegram?.WebApp?.openTelegramLink?.(shareUrl);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <section style={{ ...cardStyle, borderTop: '2px solid #00FF41', padding: 16 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
          {t('referral_admin.your_code')}
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 700, color: '#00FF41', letterSpacing: '0.2em', textAlign: 'center', padding: '16px 0' }}>
          {referralCode}
        </div>
        <button
          type="button"
          onClick={copyCode}
          style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', cursor: 'pointer', marginBottom: 12 }}
        >
          <Copy size={13} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
          {copied ? t('common.copied') : t('referral_admin.copy_code')}
        </button>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(255,255,255,0.35)', wordBreak: 'break-all', lineHeight: 1.6, marginBottom: 12 }}>
          {referralLink}
        </div>
        <button
          type="button"
          onClick={shareLink}
          style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: '#00FF41', color: '#050507', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 900, letterSpacing: '0.08em', cursor: 'pointer' }}
        >
          <Share2 size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
          {t('referral_admin.share_link')}
        </button>
      </section>

      <section style={{ ...cardStyle, padding: 14, background: 'linear-gradient(180deg, rgba(0,255,65,0.055) 0%, rgba(255,255,255,0.018) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#fff', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5 }}>
              {t('referral_admin.partner_system')}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: 11, lineHeight: 1.45 }}>
              {t('referral_admin.partner_desc')}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 900, color: '#00FF41', lineHeight: 1 }}>
              {commissionRate}%
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>
              {t('referral_admin.per_payment')}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {[
            ['1', t('referral_admin.step_1', { rate: commissionRate })],
            ['2', t('referral_admin.step_2')],
            ['3', t('referral_admin.step_3')],
          ].map(([step, text]) => (
            <div key={step} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ width: 18, height: 18, borderRadius: 6, display: 'grid', placeItems: 'center', flexShrink: 0, background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.2)', color: '#00FF41', fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 900 }}>
                {step}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.52)', fontSize: 11, lineHeight: 1.55 }}>
                {text}
              </span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(255,214,10,0.08)', border: '1px solid rgba(255,214,10,0.18)', color: 'rgba(255,255,255,0.62)', fontSize: 10.5, lineHeight: 1.55 }}>
          {t('referral_admin.example')}
        </div>
      </section>

      <section style={{ ...cardStyle, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--mono)', fontSize: 10, color: '#00FF41', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
          <Link2 size={14} />
          {t('referral_admin.miniapp_link')}
        </div>
        <p style={{ color: 'rgba(255,255,255,0.48)', fontSize: 11, lineHeight: 1.6, marginBottom: 12 }}>
          {t('referral_admin.miniapp_desc')}
        </p>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(255,255,255,0.35)', wordBreak: 'break-all', lineHeight: 1.6, marginBottom: 12, padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {miniAppLink}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            type="button"
            onClick={copyMiniAppLink}
            style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', cursor: 'pointer' }}
          >
            <Copy size={12} style={{ display: 'inline', marginRight: 5, verticalAlign: -2 }} />
            {copiedMiniApp ? t('common.copied') : t('common.copy')}
          </button>
          <button
            type="button"
            onClick={shareMiniAppLink}
            style={{ padding: 12, borderRadius: 10, border: 'none', background: '#00FF41', color: '#050507', fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 900, letterSpacing: '0.08em', cursor: 'pointer' }}
          >
            <Share2 size={12} style={{ display: 'inline', marginRight: 5, verticalAlign: -2 }} />
            {t('common.share')}
          </button>
        </div>
      </section>

      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--mono)', fontSize: 10, color: '#00FF41', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>
          <Users size={14} />
          {t('referral_admin.active_referrals', { count: rows.length })}
        </div>
        {isLoading ? (
          <div style={{ ...cardStyle, padding: 18, color: 'rgba(255,255,255,0.35)', fontSize: 11, textAlign: 'center' }}>
            {t('common.loading')}
          </div>
        ) : rows.length === 0 ? (
          <div style={{ ...cardStyle, padding: 24, textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontStyle: 'italic', lineHeight: 1.6, marginBottom: 12 }}>
              {t('referral_admin.empty_desc')}
            </p>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(255,255,255,0.25)', wordBreak: 'break-all' }}>
              {referralLink}
            </div>
          </div>
        ) : rows.map(row => {
          const progress = Math.min(100, (row.paidMonths / 12) * 100);
          return (
            <div key={row.tenant_id} style={{ ...cardStyle, padding: '12px 14px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
                    {row.mentor_name || row.tenant_id}
                  </div>
                  <PlanBadge plan={row.plan || 'free'} />
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>
                    {t('referral_admin.registered_on', { date: row.created_at ? new Date(row.created_at).toLocaleDateString() : '-' })}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>
                    {t('referral_admin.months_of_12', { count: row.paidMonths })}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: '#00FF41', marginTop: 4 }}>
                    {money(row.totalEarnedCents)}
                  </div>
                </div>
              </div>
              <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.06)', marginTop: 8, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: '#00FF41' }} />
              </div>
            </div>
          );
        })}
      </section>

      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--mono)', fontSize: 10, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>
          <WalletCards size={14} />
          {t('referral_admin.my_earnings')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <StatCard label={t('referral_admin.pending_earnings')} value={money(totals.pending)} color="#FFD60A" sub={t('referral_admin.validation')} />
          <StatCard label={t('referral_admin.validated_earnings')} value={money(totals.validated)} color="#00FF41" sub={t('referral_admin.invoice_credit')} />
          <StatCard label={t('referral_admin.total_earnings')} value={money(totals.total)} color="#fff" sub={t('referral_admin.over_12_months')} />
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', lineHeight: 1.6, marginTop: 12 }}>
          {t('referral_admin.earnings_note')}
        </p>
      </section>
    </div>
  );
}

function StatCard({ label, value, color, sub }: { label: string; value: string; color: string; sub: string }) {
  return (
    <div style={{ ...cardStyle, padding: 10 }}>
      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', minHeight: 22 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color, marginTop: 6 }}>
        {value}
      </div>
      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
        {sub}
      </div>
    </div>
  );
}
