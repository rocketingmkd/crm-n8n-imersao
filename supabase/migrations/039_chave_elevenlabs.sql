-- Migration 039: Adiciona chave de API ElevenLabs nas configurações globais
ALTER TABLE configuracoes_globais
  ADD COLUMN IF NOT EXISTS chave_elevenlabs text;
