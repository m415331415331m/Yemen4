import type { ServiceProvider } from '@/types/database';

export function detectProviderFromNumber(
  phoneNumber: string,
  providers: ServiceProvider[]
): ServiceProvider | null {
  const cleanNumber = phoneNumber.replace(/\s/g, '').replace(/^\+?967?/, '');
  if (cleanNumber.length < 2) return null;

  const prefix = cleanNumber.substring(0, 2);
  return providers.find((p) => p.phone_prefixes?.includes(prefix)) || null;
}

export function formatPhoneNumber(phone: string): string {
  let clean = phone.replace(/\s/g, '').replace(/^\+?967?/, '');
  if (clean.length > 9) clean = clean.substring(0, 9);
  return clean;
}

export function formatDataSize(mb: number | null | undefined): string {
  if (!mb || mb === 0) return '';
  if (mb >= 1024) return `${(mb / 1024).toFixed(0)} جيجابايت`;
  return `${mb} ميجابايت`;
}

export function formatAmount(amount: number): string {
  return amount.toLocaleString('en-US');
}
