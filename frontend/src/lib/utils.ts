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
  PENDING: 'bg-[#FAF1DF] text-[#94651F] border-[#E7CE9E]',
  IN_PROGRESS: 'bg-[#F8E9E6] text-[#9F564F] border-[#E8C1BB]',
  RESOLVED: 'bg-[#EAF3EC] text-[#39734A] border-[#C5DCCB]',
  REJECTED: 'bg-[#F8E9E6] text-[#9F4B45] border-[#E8C1BB]',
}

export const priorityColors: Record<string, string> = {
  LOW: 'bg-slate-500/20 text-slate-300',
  MEDIUM: 'bg-sky-500/20 text-sky-300',
  HIGH: 'bg-orange-500/20 text-orange-300',
  URGENT: 'bg-rose-500/20 text-rose-300',
}
