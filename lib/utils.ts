import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // spaces to hyphens
    .replace(/_+/g, '-')         // underscores to hyphens
    .replace(/[^\w\-]+/g, '')   // remove non-word chars except hyphens
    .replace(/\-\-+/g, '-')     // collapse multiple hyphens
    .replace(/^-+/, '')          // trim leading hyphens
    .replace(/-+$/, '');         // trim trailing hyphens
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatPercentage(num: number, decimals: number = 2): string {
  return `${num.toFixed(decimals)}%`;
}

export function calculateConversionRate(conversions: number, views: number): number {
  if (views === 0) return 0;
  return (conversions / views) * 100;
}

export function calculateLift(controlRate: number, variantRate: number): number {
  if (controlRate === 0) return 0;
  return ((variantRate - controlRate) / controlRate) * 100;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'just now';
}
