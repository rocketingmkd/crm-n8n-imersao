-- =====================================================
-- Execute este SQL no Supabase SQL Editor para criar
-- o bucket de logos das organizações.
--
-- Acesse: https://supabase.com/dashboard/project/detsacgocmirxkgjusdf/sql/new
-- Cole este conteúdo e clique em "Run"
-- =====================================================

-- 1. Criar bucket público
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'organization-logos',
  'organization-logos',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Policies de acesso

-- Upload por usuários autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'org_logos_insert' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "org_logos_insert"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'organization-logos');
  END IF;
END $$;

-- Update por usuários autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'org_logos_update' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "org_logos_update"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'organization-logos');
  END IF;
END $$;

-- Leitura pública (bucket é público)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'org_logos_select' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "org_logos_select"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'organization-logos');
  END IF;
END $$;

-- Delete por usuários autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'org_logos_delete' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "org_logos_delete"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'organization-logos');
  END IF;
END $$;
