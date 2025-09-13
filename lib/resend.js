import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

// Si no tienes dominio verificado aún, usa onboarding@resend.dev
export const FROM =
  process.env.RESEND_FROM || 'Playlist AI <onboarding@resend.dev>';

// Tu email para avisos internos
export const ADMIN =
  process.env.CONTACT_EMAIL || process.env.ADMIN_EMAIL || '';
