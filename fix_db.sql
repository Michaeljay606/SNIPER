-- 0. Ajouter is_free et forcer la mise à jour du cache
ALTER TABLE academy_lessons ADD COLUMN IF NOT EXISTS is_free boolean DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS telegram_contact_url TEXT;
NOTIFY pgrst, 'reload schema';

-- 1. Ajouter la colonne manquante pour l'Academy
ALTER TABLE academy_modules ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE academy_lessons ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 2. Forcer la création des buckets (s'ils n'existent pas)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile', 'profile', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('results', 'results', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Autoriser les uploads (Policies)
CREATE POLICY "Public Upload Results" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'results');
CREATE POLICY "Public Update Results" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'results');
CREATE POLICY "Public Read Results" ON storage.objects FOR SELECT TO public USING (bucket_id = 'results');
CREATE POLICY "Public Delete Results" ON storage.objects FOR DELETE TO public USING (bucket_id = 'results');

CREATE POLICY "Public Upload Profile" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'profile');
CREATE POLICY "Public Update Profile" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'profile');
CREATE POLICY "Public Read Profile" ON storage.objects FOR SELECT TO public USING (bucket_id = 'profile');
CREATE POLICY "Public Delete Profile" ON storage.objects FOR DELETE TO public USING (bucket_id = 'profile');

-- 4. Ajouter la colonne logo_url pour le plan PREMIUM
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS broker_links JSONB DEFAULT '[]'::jsonb;
NOTIFY pgrst, 'reload schema';
