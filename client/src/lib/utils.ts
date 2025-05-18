import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Failed to copy: ', err);
    throw err;
  }
}

/**
 * Format a number to a human-readable string with abbreviations for large values
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 1)
 * @param currency - Whether to include currency symbol (default: false)
 * @returns Formatted string (e.g., 1.5M, $2.7B)
 */
export function formatLargeNumber(value: number | string, decimals: number = 1, currency: boolean = false): string {
  // Handle string inputs by converting to number
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Handle NaN, null, undefined
  if (isNaN(numValue) || numValue === null || numValue === undefined) {
    return currency ? '$0' : '0';
  }
  
  if (numValue === 0) return currency ? '$0' : '0';
  
  const absValue = Math.abs(numValue);
  const sign = numValue < 0 ? '-' : '';
  const currencySymbol = currency ? '$' : '';
  
  if (absValue >= 1_000_000_000_000) {
    return `${currencySymbol}${(numValue / 1_000_000_000_000).toFixed(decimals)}T`;
  } else if (absValue >= 1_000_000_000) {
    return `${currencySymbol}${(numValue / 1_000_000_000).toFixed(decimals)}B`;
  } else if (absValue >= 1_000_000) {
    return `${currencySymbol}${(numValue / 1_000_000).toFixed(decimals)}M`;
  } else if (absValue >= 1_000) {
    return `${currencySymbol}${(numValue / 1_000).toFixed(decimals)}K`;
  } else {
    return `${currencySymbol}${numValue.toFixed(decimals)}`;
  }
}

/**
 * Simplified format function that's robust against different data types
 * Use this for chart values and text display
 */
export function formatValue(value: any, isCurrency: boolean = false): string {
  // Handle null, undefined, NaN
  if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) {
    return isCurrency ? '$0' : '0';
  }
  
  // Convert to number if it's a string
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Return formatted value
  return formatLargeNumber(numValue, 2, isCurrency);
}
