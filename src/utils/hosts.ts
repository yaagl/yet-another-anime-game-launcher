const BLOCKING_HOSTS = new Set(["0.0.0.0", "127.0.0.1", "::1"]);

export function findBlockedHostsEntries(
  hostsText: string,
  blockedDomains: string[]
) {
  const domains = new Set(
    blockedDomains.map(domain => domain.toLowerCase()).filter(Boolean)
  );
  if (!domains.size) return [];

  const matches: string[] = [];
  for (const rawLine of hostsText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const [address, ...hosts] = line.split(/\s+/);
    if (!BLOCKING_HOSTS.has(address.toLowerCase())) continue;
    if (hosts.some(host => domains.has(host.toLowerCase()))) {
      matches.push(rawLine);
    }
  }

  return matches;
}
