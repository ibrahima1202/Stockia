import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd/MM/yyyy', { locale: fr })
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: fr })
}

export function generateReference(prefix: string): string {
  const date = format(new Date(), 'yyyyMMdd')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `${prefix}-${date}-${random}`
}

export function formatPaymentMethod(method: string): string {
  const map: Record<string, string> = {
    especes: 'Espèces',
    mobile_money: 'Mobile Money',
    carte: 'Carte bancaire',
  }
  return map[method] || method
}

export function formatExpenseCategory(cat: string): string {
  const map: Record<string, string> = {
    transport: 'Transport',
    loyer: 'Loyer',
    divers: 'Divers',
  }
  return map[cat] || cat
}
