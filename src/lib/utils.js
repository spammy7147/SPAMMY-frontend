import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatISK(amount, abbreviate = true) {
    if (!amount) return '0.00'
    
    if (abbreviate) {
        const isNegative = amount < 0;
        const absAmount = Math.abs(amount);
        const sign = isNegative ? '-' : '';
        
        if (absAmount >= 1_000_000_000) return sign + (absAmount / 1_000_000_000).toFixed(2) + ' B';
        if (absAmount >= 1_000_000) return sign + (absAmount / 1_000_000).toFixed(2) + ' M';
        if (absAmount >= 1_000) return sign + (absAmount / 1_000).toFixed(2) + ' K';
        return sign + absAmount.toFixed(2);
    } else {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
}

export function formatDate(dateString, timezone = 'UTC') {
    if (!dateString) return '';
    const date = new Date(dateString);
    
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };

    if (timezone === 'UTC') {
        options.timeZone = 'UTC';
    } else if (timezone === 'KST') {
        options.timeZone = 'Asia/Seoul';
    }
    // timezone === 'LOCAL' means use default browser timezone (omit timeZone option)

    return new Intl.DateTimeFormat('ko-KR', options).format(date).replace(/\. /g, '-').replace('.', '');
}
