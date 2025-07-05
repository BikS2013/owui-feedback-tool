import * as os from 'os';

/**
 * Get all network interfaces and their IP addresses
 */
export function getNetworkInterfaces(): Record<string, string[]> {
  const interfaces = os.networkInterfaces();
  const result: Record<string, string[]> = {};

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    
    const ips = addrs
      .filter(addr => !addr.internal) // Exclude loopback addresses
      .map(addr => `${addr.address} (${addr.family})`);
    
    if (ips.length > 0) {
      result[name] = ips;
    }
  }

  return result;
}

/**
 * Get a formatted string of all IP addresses
 */
export function getFormattedIPs(): string {
  const interfaces = getNetworkInterfaces();
  const allIPs: string[] = [];

  for (const [interfaceName, ips] of Object.entries(interfaces)) {
    ips.forEach(ip => {
      allIPs.push(`${interfaceName}: ${ip}`);
    });
  }

  if (allIPs.length === 0) {
    // If no external IPs found, include loopback
    const loopbackInterfaces = os.networkInterfaces();
    for (const [name, addrs] of Object.entries(loopbackInterfaces)) {
      if (!addrs) continue;
      const loopback = addrs.find(addr => addr.internal);
      if (loopback) {
        allIPs.push(`${name}: ${loopback.address} (${loopback.family}) [loopback]`);
      }
    }
  }

  return allIPs.join(', ');
}

/**
 * Extract host and port from a PostgreSQL connection string
 */
export function parsePostgresConnectionString(connectionString: string): { host?: string; port?: string; database?: string } {
  try {
    // PostgreSQL connection string format: postgresql://username:password@host:port/database
    const match = connectionString.match(/^(?:postgres(?:ql)?:\/\/)(?:[^:@]+:[^@]+@)?([^:\/]+)(?::(\d+))?(?:\/(.+))?/);
    
    if (match) {
      return {
        host: match[1],
        port: match[2] || '5432', // Default PostgreSQL port
        database: match[3]
      };
    }

    // Try alternative format: host:port
    const simpleMatch = connectionString.match(/^([^:]+):(\d+)$/);
    if (simpleMatch) {
      return {
        host: simpleMatch[1],
        port: simpleMatch[2]
      };
    }

    return {};
  } catch (error) {
    console.error('Error parsing connection string:', error);
    return {};
  }
}

/**
 * Format connection details for logging
 */
export function formatConnectionDetails(connectionString: string): string {
  const { host, port, database } = parsePostgresConnectionString(connectionString);
  const sourceIPs = getFormattedIPs();
  
  const details: string[] = [
    `Target Host: ${host || 'unknown'}`,
    `Target Port: ${port || 'unknown'}`,
    `Database: ${database || 'unknown'}`,
    `Source IPs: ${sourceIPs}`
  ];

  return details.join(' | ');
}