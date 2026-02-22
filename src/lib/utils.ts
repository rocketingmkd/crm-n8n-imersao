import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata número de telefone para o padrão brasileiro (XX) XXXXX-XXXX
 * Aceita vários formatos de entrada:
 * - 5511977748661@s.whatsapp.net
 * - 5511977748661
 * - 11977748661
 * - (11) 97774-8661
 */
/**
 * Normaliza URLs de imagem para uso em <img src>.
 *
 * URLs do Google Drive (lh3.google.com, lh3.googleusercontent.com) são usadas
 * diretamente — o browser envia os cookies de autenticação do Google automaticamente
 * e a imagem é servida sem necessidade de conversão.
 *
 * URLs do drive.google.com/file/d/... e open?id=... são convertidas para o
 * endpoint de thumbnail, que funciona para arquivos com acesso público.
 *
 * Qualquer outra URL passa sem alteração.
 */
/**
 * Extrai o FILE_ID de qualquer URL do Google Drive/Photos, ou null se não for URL do Google.
 */
export function extrairIdGoogleDrive(url: string | null | undefined): string | null {
  const raw = typeof url === "string" ? url.trim() : "";
  if (!raw) return null;
  const m =
    raw.match(/lh3\.google\.com\/u\/\d+\/d\/([a-zA-Z0-9_-]+)/) ||
    raw.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/) ||
    raw.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    raw.match(/drive\.google\.com\/open\?.*id=([a-zA-Z0-9_-]+)/) ||
    raw.match(/drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/) ||
    raw.match(/drive\.google\.com\/thumbnail\?.*id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

export function resolverUrlImagem(url: string | null | undefined): string | null {
  const raw = typeof url === "string" ? url.trim() : "";
  if (!raw) return null;

  const gDrive = (id: string) => `https://drive.google.com/thumbnail?id=${id}&sz=w800`;
  const gCdn  = (id: string) => `https://lh3.googleusercontent.com/d/${id}`;

  // lh3.google.com/u/{n}/d/{FILE_ID} — converte para CDN direto do Google
  const lh3Match = raw.match(/lh3\.google\.com\/u\/\d+\/d\/([a-zA-Z0-9_-]+)/);
  if (lh3Match) return gCdn(lh3Match[1]);

  // lh3.googleusercontent.com — já é CDN, usar direto
  if (/lh3\.googleusercontent\.com/.test(raw)) return raw;

  // drive.google.com/file/d/{FILE_ID}/...
  const fileMatch = raw.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return gDrive(fileMatch[1]);

  // drive.google.com/open?id={FILE_ID}
  const openMatch = raw.match(/drive\.google\.com\/open\?.*id=([a-zA-Z0-9_-]+)/);
  if (openMatch) return gDrive(openMatch[1]);

  // drive.google.com/uc?export=view&id={FILE_ID} (legado)
  const legacyMatch = raw.match(/drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/);
  if (legacyMatch) return gDrive(legacyMatch[1]);

  return raw;
}

export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "";

  // Remover tudo que não é número
  const cleanPhone = phone.replace(/\D/g, "");

  // Se começar com 55 (código do Brasil), remover
  const phoneWithoutCountry = cleanPhone.startsWith("55") 
    ? cleanPhone.substring(2) 
    : cleanPhone;

  // Extrair DDD e número
  if (phoneWithoutCountry.length >= 10) {
    const ddd = phoneWithoutCountry.substring(0, 2);
    const firstPart = phoneWithoutCountry.substring(2, phoneWithoutCountry.length - 4);
    const lastPart = phoneWithoutCountry.substring(phoneWithoutCountry.length - 4);
    
    return `(${ddd}) ${firstPart}-${lastPart}`;
  }

  // Se não conseguir formatar, retornar original
  return phone;
}