/**
 * Reads what can be read reliably from a pasted customer message (text,
 * WhatsApp, email). For now that's only the phone number: names and problem
 * descriptions vary too much between messages for simple rules. The pasted
 * message itself is saved to the job's history so the details aren't lost.
 *
 * This is the seam for a future AI step or a real WhatsApp/website
 * integration: anything that returns `MessageExtraction` can be swapped in
 * without touching the Add Job form.
 */

export interface MessageExtraction {
  phone: string | null;
}

// US-style 10-digit numbers, optional +1: 555-777-1234, (555) 777 1234, +1 555.777.1234.
// The lookarounds stop it matching part of a longer number (order IDs, etc.).
const PHONE = /(?<!\d)(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/;

export function extractFromMessage(message: string): MessageExtraction {
  return { phone: message.match(PHONE)?.[0]?.trim() ?? null };
}
