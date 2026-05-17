import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatISK(amount) {
    if (!amount) return '0.00'
    if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(2) + ' B'
    if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(2) + ' M'
    if (amount >= 1_000) return (amount / 1_000).toFixed(2) + ' K'
    return amount.toFixed(2)
}
