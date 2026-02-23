-- Criar bucket para fotos de contatos
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos-contatos', 'fotos-contatos', true)
ON CONFLICT (id) DO NOTHING;

-- Política de leitura pública
CREATE POLICY "Fotos de contatos são publicamente acessíveis"
ON storage.objects FOR SELECT
USING (bucket_id = 'fotos-contatos');

-- Política de upload para usuários autenticados
CREATE POLICY "Usuários autenticados podem fazer upload de fotos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'fotos-contatos' AND auth.role() = 'authenticated');

-- Política de atualização
CREATE POLICY "Usuários autenticados podem atualizar fotos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'fotos-contatos' AND auth.role() = 'authenticated');

-- Política de exclusão
CREATE POLICY "Usuários autenticados podem excluir fotos"
ON storage.objects FOR DELETE
USING (bucket_id = 'fotos-contatos' AND auth.role() = 'authenticated');