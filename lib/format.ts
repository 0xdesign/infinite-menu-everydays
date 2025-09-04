/**
 * Format utilities for consistent data display
 */

/**
 * Format a date string to uppercase short format (e.g., "MAR 23, 2023")
 */
export function formatMintDate(dateString?: string | null): string {
  if (!dateString) return 'DATE UNKNOWN';
  
  try {
    const parsedDate = new Date(dateString);
    if (isNaN(parsedDate.getTime())) {
      return 'DATE UNKNOWN';
    }
    
    return parsedDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }).toUpperCase();
  } catch {
    return 'DATE UNKNOWN';
  }
}

/**
 * Format a hash/address for display (e.g., "0x1234...abcd")
 */
export function formatHash(address?: string): string {
  if (!address) return '';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

/**
 * Get the appropriate block explorer URL for a given network
 */
export function getBlockExplorerUrl(address?: string, network?: string): string {
  if (!address) return '#';
  
  const key = (network ?? '').toUpperCase();
  const explorers: Record<string, string> = {
    'ETHEREUM-MAINNET': 'https://etherscan.io/address/',
    'ETHEREUM-SEPOLIA': 'https://sepolia.etherscan.io/address/',
    'ZORA-MAINNET': 'https://explorer.zora.energy/address/',
    'ZORA-SEPOLIA': 'https://sepolia.explorer.zora.energy/address/',
  };
  
  const base = explorers[key];
  return base ? base + address : '#';
}