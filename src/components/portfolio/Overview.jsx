import { formatISK } from '@/lib/utils'
import { useConfig } from '@/store/ConfigContext'

export function Overview({ totalBalance }) {
    const { iskAbbreviation } = useConfig();
    return (
        <div className="bg-card border border-border rounded p-8 mb-5 relative overflow-hidden text-center">
            {/* 상단 강조 라인 */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
            
            <div className="mt-2.5">
                <span className="text-[48px] font-bold text-primary leading-none">
                    {formatISK(totalBalance, iskAbbreviation)}
                </span>
                <span className="text-xl text-foreground-muted ml-2.5 font-semibold">ISK</span>
            </div>
            
            <div className="text-[11px] text-foreground-muted mt-2">
                포함: 지갑 · 자산 · LP · SP
            </div>
        </div>
    )
}
