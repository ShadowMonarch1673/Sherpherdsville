import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  IN_PROGRESS: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  RESOLVED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  REJECTED: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
}

export const priorityColors: Record<string, string> = {
  LOW: 'bg-slate-500/20 text-slate-300',
  MEDIUM: 'bg-sky-500/20 text-sky-300',
  HIGH: 'bg-orange-500/20 text-orange-300',
  URGENT: 'bg-rose-500/20 text-rose-300',
}
