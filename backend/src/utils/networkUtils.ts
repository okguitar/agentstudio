/**
 * Network Utilities
 * 
 * Provides network-related utility functions such as getting local IP addresses.
 */

import os from 'os';

/**
 * Get local network IP addresses (non-localhost)
 * Returns all IPv4 addresses that are not loopback addresses
 */
export function getLocalIPAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];

  for (const interfaceName in interfaces) {
    const networkInterface = interfaces[interfaceName];
    if (!networkInterface) continue;

    for (const details of networkInterface) {
      // Only include IPv4 addresses that are not internal (not loopback)
      if (details.family === 'IPv4' && !details.internal) {
        addresses.push(details.address);
      }
    }
  }

  return addresses;
}

/**
 * Get the best local IP address to use for external access
 * Prefers private network addresses (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
 * Falls back to any non-localhost IP if available
 */
export function getBestLocalIP(): string | null {
  const addresses = getLocalIPAddresses();
  
  if (addresses.length === 0) {
    return null;
  }

  // Prefer private network addresses
  const privateAddresses = addresses.filter(addr => 
    addr.startsWith('192.168.') || 
    addr.startsWith('10.') || 
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(addr)
  );

  if (privateAddresses.length > 0) {
    return privateAddresses[0];
  }

  // If no private addresses, return the first available
  return addresses[0];
}

/**
 * Get network information including IP addresses and hostname
 */
export function getNetworkInfo() {
  return {
    hostname: os.hostname(),
    localIPs: getLocalIPAddresses(),
    bestLocalIP: getBestLocalIP(),
  };
}
