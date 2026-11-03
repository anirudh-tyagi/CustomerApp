import { Alert, Linking, Share } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import {
  callCustomer,
  copyAddress,
  dialableNumber,
  directionsUrls,
  openDirections,
  shareCustomer,
  shareMessage,
  telUrl,
} from '../src/services/customerActions';
import type { Customer } from '../src/types/customer';

const base: Customer = {
  id: 1,
  name: 'Example Test Customer',
  address: 'Shop No. 4, Main Road, Andheri West, Mumbai, Maharashtra - 400058',
  phone: '+91 98765 43210',
  latitude: 19.1363,
  longitude: 72.8277,
};

let alertSpy: jest.SpyInstance;
let openSpy: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('phone', () => {
  it.each([
    ['+91 98765 43210', '+919876543210'],
    ['098765-43210', '09876543210'],
    ['(022) 2345 6789', '02223456789'],
    ['12', null],
    ['', null],
    [null, null],
    ['abc', null],
  ])('dialableNumber(%p) = %p', (input, out) => {
    expect(dialableNumber(input)).toBe(out);
  });
  it('tel: URL never uses an auto-dial scheme', () => {
    expect(telUrl('+91 98765 43210')).toBe('tel:+919876543210');
  });
});

describe('directionsUrls', () => {
  it('Android: geo: with coordinates and label, then https fallback', () => {
    expect(directionsUrls(base, 'android')).toEqual([
      'geo:19.1363,72.8277?q=19.1363,72.8277(Example%20Test%20Customer)',
      'https://www.google.com/maps/dir/?api=1&destination=19.1363,72.8277',
    ]);
  });
  it('iOS: Apple Maps, then https fallback', () => {
    const [apple, web] = directionsUrls(base, 'ios');
    expect(apple).toBe('maps://?daddr=19.1363,72.8277&q=Example%20Test%20Customer');
    expect(web).toContain('destination=19.1363,72.8277');
  });
  it('strips parentheses from the label and handles a missing name', () => {
    expect(directionsUrls({ ...base, name: 'A (B) C' }, 'android')[0]).toContain('(A%20%20B%20%20C)');
    expect(directionsUrls({ ...base, name: null }, 'android')[0]).toContain('(Customer)');
  });
});

describe('actions', () => {
  it('call opens the dialer URL', async () => {
    await callCustomer(base);
    expect(openSpy).toHaveBeenCalledWith('tel:+919876543210');
    expect(alertSpy).not.toHaveBeenCalled();
  });
  it('call without phone alerts instead of opening anything', async () => {
    await callCustomer({ ...base, phone: null });
    expect(openSpy).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('No phone number', expect.any(String));
  });
  it('call failure shows a friendly alert', async () => {
    openSpy.mockRejectedValue(new Error('No Activity found'));
    await expect(callCustomer(base)).resolves.toBeUndefined();
    expect(alertSpy).toHaveBeenCalledWith('Could not open the dialer', expect.any(String));
  });
  it('directions falls back to https when no maps app handles geo:', async () => {
    openSpy.mockRejectedValueOnce(new Error('no handler')).mockResolvedValueOnce(true);
    await openDirections(base);
    expect(openSpy).toHaveBeenCalledTimes(2);
    expect(openSpy.mock.calls[1][0]).toMatch(/^https:\/\/www\.google\.com\/maps\/dir/);
    expect(alertSpy).not.toHaveBeenCalled();
  });
  it('directions alerts when every URL fails', async () => {
    openSpy.mockRejectedValue(new Error('nothing'));
    await openDirections(base);
    expect(alertSpy).toHaveBeenCalledWith('Could not open directions', expect.any(String));
  });
  it('copy puts the address on the clipboard', () => {
    expect(copyAddress(base)).toBe(true);
    expect(Clipboard.setString).toHaveBeenCalledWith(base.address);
  });
  it('copy failure and missing address are handled', () => {
    (Clipboard.setString as jest.Mock).mockImplementationOnce(() => {
      throw new Error('denied');
    });
    expect(copyAddress(base)).toBe(false);
    expect(copyAddress({ ...base, address: null })).toBe(false);
    expect(alertSpy).toHaveBeenCalledTimes(2);
  });
  it('share sends name, address and phone; failures alert', async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    await shareCustomer(base);
    expect(shareSpy.mock.calls[0][0]).toEqual({
      message: `Example Test Customer\n${base.address}\nPhone: +91 98765 43210`,
      title: 'Example Test Customer',
    });
    shareSpy.mockRejectedValueOnce(new Error('x'));
    await shareCustomer(base);
    expect(alertSpy).toHaveBeenCalledWith('Could not share', expect.any(String));
  });
  it('share message falls back to coordinates when details are missing', () => {
    expect(shareMessage({ ...base, name: null, address: null, phone: null })).toBe(
      'Location: 19.1363,72.8277',
    );
  });
});

describe('privacy', () => {
  it('failure logs never contain phone, name or address', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    openSpy.mockRejectedValue(new Error("Could not open URL 'tel:+919876543210'"));
    await callCustomer(base);
    await openDirections(base);
    (Clipboard.setString as jest.Mock).mockImplementationOnce(() => {
      throw new Error(`denied ${base.address}`);
    });
    copyAddress(base);
    const logged = JSON.stringify(logSpy.mock.calls);
    expect(logged).not.toMatch(/9876543210|98765 43210/);
    expect(logged).not.toContain('Example Test');
    expect(logged).not.toContain('Andheri');
  });
});
