-- =====================================================
-- MIGRATION 035: Criar bucket para logos das organizações
-- =====================================================

-- Criar bucket público para logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'organization-logos',
  'organization-logos',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Policies para o bucket
DO $$
BEGIN
  -- Upload por usuários autenticados
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'org_logos_insert' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "org_logos_insert"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'organization-logos');
  END IF;

  -- Update por usuários autenticados
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'org_logos_update' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "org_logos_update"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'organization-logos');
  END IF;

  -- Leitura pública
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'org_logos_select' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "org_logos_select"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'organization-logos');
  END IF;

  -- Delete por usuários autenticados
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'org_logos_delete' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "org_logos_delete"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'organization-logos');
  END IF;
END $$;
