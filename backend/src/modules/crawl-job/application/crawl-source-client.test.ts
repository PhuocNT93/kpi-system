import { describe, expect, it } from 'vitest';
import { isHostAllowlisted, isPrivateNetworkAddress } from './crawl-source-client.js';

describe('crawl source network policy', () => {
  it('blocks loopback, private, link-local, reserved and IPv6 local addresses', () => {
    for (const address of ['127.0.0.1', '10.0.0.8', '172.20.1.2', '192.168.1.1', '169.254.169.254', '::1', 'fd00::1', 'fe80::1']) {
      expect(isPrivateNetworkAddress(address)).toBe(true);
    }
    expect(isPrivateNetworkAddress('8.8.8.8')).toBe(false);
    expect(isPrivateNetworkAddress('2606:4700:4700::1111')).toBe(false);
  });

  it('matches exact and wildcard allowlist entries without matching the parent domain', () => {
    expect(isHostAllowlisted('api.example.com', ['api.example.com'])).toBe(true);
    expect(isHostAllowlisted('jira.example.com', ['*.example.com'])).toBe(true);
    expect(isHostAllowlisted('example.com', ['*.example.com'])).toBe(false);
    expect(isHostAllowlisted('evil-example.com', ['*.example.com'])).toBe(false);
  });
});