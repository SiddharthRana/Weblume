import { describe, expect, it } from 'vitest';
import { isPublicAddress } from '../../src/scanner/http/ip-policy';

describe('isPublicAddress', () => {
  it.each([
    '8.8.8.8',
    '1.1.1.1',
    '93.184.215.14',
    '142.250.183.14',
    '2606:4700:4700::1111',
    '2001:4860:4860::8888',
    '::ffff:8.8.8.8',
  ])('allows public %s', (ip) => {
    expect(isPublicAddress(ip)).toBe(true);
  });

  it.each([
    // IPv4 loopback / unspecified / "this network"
    '127.0.0.1',
    '127.255.255.254',
    '0.0.0.0',
    '0.1.2.3',
    // RFC 1918
    '10.0.0.1',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    // CGNAT
    '100.64.0.1',
    '100.127.255.255',
    // Link-local incl. cloud metadata endpoints
    '169.254.169.254',
    '169.254.170.2',
    // IETF / documentation / benchmarking / reserved / multicast / broadcast
    '192.0.0.8',
    '192.0.2.1',
    '198.18.0.1',
    '198.51.100.7',
    '203.0.113.9',
    '224.0.0.1',
    '239.255.255.250',
    '240.0.0.1',
    '255.255.255.255',
    // IPv6 loopback / unspecified / mapped / compatible
    '::1',
    '::',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    '::ffff:169.254.169.254',
    '::ffff:10.0.0.1',
    '::127.0.0.1',
    // IPv6 private-ish
    'fc00::1',
    'fd12:3456:789a::1',
    'fe80::1',
    'fe80::1%eth0',
    'fec0::1',
    'ff02::1',
    // Tunnels / translation / documentation
    '64:ff9b::7f00:1',
    '64:ff9b:1::1',
    '2002:7f00:1::1',
    '2001:0:4136:e378:8000:63bf:3fff:fdd2',
    '2001:db8::1',
    '3fff::1',
    '100::1',
    // AWS IPv6 metadata endpoint
    'fd00:ec2::254',
    // Bracketed literal forms
    '[::1]',
    // Garbage
    'not-an-ip',
    '',
  ])('blocks %s', (ip) => {
    expect(isPublicAddress(ip)).toBe(false);
  });
});
