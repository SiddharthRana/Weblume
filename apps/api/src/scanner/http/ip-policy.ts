import ipaddr from 'ipaddr.js';

/**
 * Outbound destination policy for user-influenced requests.
 * Allow-list approach: only globally routable unicast addresses pass; everything else
 * (loopback, private, link-local incl. cloud metadata, CGNAT, multicast, reserved, documentation,
 * benchmarking, NAT64/6to4/Teredo tunnels, …) is blocked.
 */
export type AddressPolicy = (ip: string) => boolean;

// Ranges ipaddr.js classifies as 'unicast' but which must not be reachable.
const EXTRA_BLOCKED_V4: [string, number][] = [
  ['0.0.0.0', 8],
  ['100.64.0.0', 10],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 3], // multicast + reserved 240/4 + broadcast
];
const EXTRA_BLOCKED_V6: [string, number][] = [
  ['64:ff9b::', 96], // NAT64 well-known prefix
  ['64:ff9b:1::', 48], // local-use NAT64
  ['100::', 64], // discard-only
  ['2001::', 23], // IETF protocol assignments (Teredo, benchmarking, ORCHID…)
  ['2001:db8::', 32], // documentation
  ['2002::', 16], // 6to4
  ['3fff::', 20], // documentation (RFC 9637)
  ['5f00::', 16], // segment routing SIDs
  ['fc00::', 7], // unique local
  ['fe80::', 10], // link-local
  ['fec0::', 10], // deprecated site-local
  ['ff00::', 8], // multicast
];

function inAny(addr: ipaddr.IPv4 | ipaddr.IPv6, ranges: [string, number][]): boolean {
  return ranges.some(([net, bits]) => {
    const parsed = ipaddr.parse(net);
    return parsed.kind() === addr.kind() && addr.match(parsed, bits);
  });
}

export const isPublicAddress: AddressPolicy = (ip) => {
  let addr: ipaddr.IPv4 | ipaddr.IPv6;
  try {
    // Strip IPv6 zone ids and URL brackets.
    addr = ipaddr.parse(ip.replace(/^\[|\]$/g, '').split('%')[0]!);
  } catch {
    return false;
  }
  if (addr.kind() === 'ipv6') {
    const v6 = addr as ipaddr.IPv6;
    // ::ffff:a.b.c.d and the deprecated ::a.b.c.d forms carry an IPv4 address — judge that instead.
    if (v6.isIPv4MappedAddress()) return isPublicAddress(v6.toIPv4Address().toString());
    if (v6.parts.slice(0, 6).every((p) => p === 0)) return false; // ::, ::1, ::a.b.c.d
    return v6.range() === 'unicast' && !inAny(v6, EXTRA_BLOCKED_V6);
  }
  const v4 = addr as ipaddr.IPv4;
  return v4.range() === 'unicast' && !inAny(v4, EXTRA_BLOCKED_V4);
};

/** True if the string is an IP literal (v4 or v6, with or without brackets). */
export function isIpLiteral(host: string): boolean {
  return ipaddr.isValid(host.replace(/^\[|\]$/g, ''));
}
