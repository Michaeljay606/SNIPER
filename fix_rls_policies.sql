-- ============================================================
-- Fix RLS Policies for timeline_events, mentor_badges, and signals
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ─── TIMELINE EVENTS RLS ──────────────────────────────────
-- On désactive temporairement le RLS pour débloquer l'insertion
ALTER TABLE timeline_events DISABLE ROW LEVEL SECURITY;

-- ─── MENTOR BADGES RLS ────────────────────────────────────
-- Idem pour les badges
ALTER TABLE mentor_badges DISABLE ROW LEVEL SECURITY;

-- ─── SIGNALS RLS ─────────────────────────────────────────
-- Désactiver RLS sur les signaux pour garantir la visibilité immédiate pour tous les étudiants
ALTER TABLE signals DISABLE ROW LEVEL SECURITY;
