import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDate(date: string | Date, fmt = 'dd MMM yyyy, HH:mm') {
  return format(new Date(date), fmt);
}

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  PENDING_USER: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  ESCALATED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CLOSED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  REOPENED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

export const CATEGORY_LABELS: Record<string, string> = {
  WINDOWS_ISSUE: 'Windows Issue',
  PRINTER: 'Printer',
  NETWORK_WIFI: 'Network / WiFi',
  EMAIL: 'Email',
  VPN: 'VPN',
  SOFTWARE_INSTALL: 'Software Install',
  PERFORMANCE: 'Performance',
  PASSWORD_RESET: 'Password Reset',
  HARDWARE: 'Hardware',
  OTHER: 'Other',
};

export function getRoleDashboard(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN':
    case 'ADMIN': return '/admin/dashboard';
    case 'ENGINEER': return '/engineer/dashboard';
    default: return '/dashboard';
  }
}
