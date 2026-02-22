-- Migration 038: Adiciona cor primária da plataforma
ALTER TABLE configuracoes_globais
  ADD COLUMN IF NOT EXISTS cor_primaria text DEFAULT '#D9156C';
