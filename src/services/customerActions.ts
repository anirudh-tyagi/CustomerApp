import { Alert, Linking, Platform, Share } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import type { Customer } from '../types/customer';
import { logger } from '../utils/logger';

/**
 * Customer actions (call, directions, copy, share). Each one catches its own
 * failures and shows a friendly alert; none can throw into the UI.
 * Logs contain only the action name and outcome, never customer data.
 */

/** "+91 98765 43210" -> "+919876543210"; null if it can't be a phone number. */
export function dialableNumber(phone: string | null): string | null {
  if (!phone) {
    return null;
  }
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 3 || digits.length > 15) {
    return null;
  }
  return (trimmed.startsWith('+') ? '+' : '') + digits;
}

/** tel: URL. Opens the dialer pre-filled (ACTION_VIEW / iOS prompt); never dials. */
export function telUrl(phone: string | null): string | null {
  const n = dialableNumber(phone);
  return n ? `tel:${n}` : null;
}

function directionsLabel(c: Customer): string {
  // Parentheses would break the geo: label syntax.
  return (c.name ?? 'Customer').replace(/[()]/g, ' ').trim() || 'Customer';
}

/**
 * Candidate URLs for directions, tried in order.
 * Android: geo: (any installed maps app, labelled pin) -> Google Maps https.
 * iOS:     Apple Maps (maps:) -> Google Maps https. (iOS UNVERIFIED)
 */
export function directionsUrls(c: Customer, os: string = Platform.OS): string[] {
  const ll = `${c.latitude},${c.longitude}`;
  const label = encodeURIComponent(directionsLabel(c));
  const web = `https://www.google.com/maps/dir/?api=1&destination=${ll}`;
  if (os === 'ios') {
    return [`maps://?daddr=${ll}&q=${label}`, web];
  }
  return [`geo:${ll}?q=${ll}(${label})`, web];
}

export function shareMessage(c: Customer): string {
  const lines: string[] = [];
  if (c.name) {
    lines.push(c.name);
  }
  if (c.address) {
    lines.push(c.address);
  }
  if (c.phone) {
    lines.push(`Phone: ${c.phone}`);
  }
  if (lines.length === 0 || !c.address) {
    lines.push(`Location: ${c.latitude},${c.longitude}`);
  }
  return lines.join('\n');
}

function fail(title: string, message: string, action: string, e?: unknown): void {
  // Never log the native error text: Linking errors embed the URL, which
  // contains the phone number (tel:) or the customer name (geo:/maps: label).
  logger.warn('action failed', { action, hadError: e !== undefined });
  Alert.alert(title, message);
}

export async function callCustomer(c: Customer): Promise<void> {
  const url = telUrl(c.phone);
  if (!url) {
    fail('No phone number', 'This customer has no valid phone number.', 'call');
    return;
  }
  try {
    await Linking.openURL(url);
    logger.info('action', { action: 'call', ok: true });
  } catch (e) {
    fail('Could not open the dialer', 'No app on this device can make phone calls.', 'call', e);
  }
}

export async function openDirections(c: Customer): Promise<void> {
  let lastError: unknown;
  for (const url of directionsUrls(c)) {
    try {
      await Linking.openURL(url);
      logger.info('action', { action: 'directions', scheme: url.split(':')[0], ok: true });
      return;
    } catch (e) {
      lastError = e;
    }
  }
  fail(
    'Could not open directions',
    'No maps app or browser is available to show directions.',
    'directions',
    lastError,
  );
}

/** Returns true if copied (caller shows the confirmation). */
export function copyAddress(c: Customer): boolean {
  if (!c.address) {
    fail('No address', 'This customer has no address to copy.', 'copy');
    return false;
  }
  try {
    Clipboard.setString(c.address);
    logger.info('action', { action: 'copy', ok: true });
    return true;
  } catch (e) {
    fail('Could not copy', 'The address could not be copied to the clipboard.', 'copy', e);
    return false;
  }
}

export async function shareCustomer(c: Customer): Promise<void> {
  try {
    const res = await Share.share({ message: shareMessage(c), title: c.name ?? 'Customer' });
    logger.info('action', { action: 'share', result: res.action });
  } catch (e) {
    fail('Could not share', 'Sharing is not available right now.', 'share', e);
  }
}
