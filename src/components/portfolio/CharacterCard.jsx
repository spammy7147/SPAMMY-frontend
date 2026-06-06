import { useState } from 'react'
import { formatISK, formatDate, cn } from '@/lib/utils'
import { useConfig } from '../../store/ConfigContext'

export function CharacterCard({ char, onUpdateOmega }) {
    const { iskAbbreviation, timezone } = useConfig();
    const [isEditing, setIsEditing] = useState(false);

    // 남은 날짜 계산 함수
    const getRemainingDays = (dateStr) => {
        if (!dateStr) return null;
        const diff = new Date(dateStr) - new Date();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    const remainingDays = getRemainingDays(char.omegaExpiresAt);

    // 날짜 연장 함수
    const addDuration = (days, months = 0) => {
        const now = new Date();
        let baseDate = char.omegaExpiresAt && new Date(char.omegaExpiresAt) > now 
            ? new Date(char.omegaExpiresAt) 
            : now;
        
        const newDate = new Date(baseDate.getTime());
        if (months > 0) {
            newDate.setMonth(newDate.getMonth() + months);
        } else {
            newDate.setDate(newDate.getDate() + days);
        }
        
        onUpdateOmega(char.characterId, newDate.toISOString());
        setIsEditing(false);
    };

    const quickButtons = [
        { label: '30D', days: 30 },
        { label: '90D', days: 90 },
        { label: '6M', months: 6 },
        { label: '1Y', months: 12 },
        { label: '2Y', months: 24 },
    ];

    const getOmegaColorClass = () => {
        if (remainingDays === null) return 'text-foreground-dim';
        if (remainingDays <= 3) return 'text-destructive';
        if (remainingDays <= 7) return 'text-gold';
        return 'text-success';
    };

    return (
        <div className={cn(
            "bg-card rounded overflow-hidden transition-all",
            char.isMain 
                ? "border-[1.5px] border-primary shadow-[0_0_15px_rgba(122,162,247,0.1)]" 
                : "border border-border shadow-none"
        )}>
            {/* 헤더 */}
            <div className="flex items-center gap-2.5 px-4 py-3.5 bg-muted border-b border-border">
                <img 
                    src={char.portraitUrl || `https://images.evetech.net/characters/${char.characterId}/portrait?size=64`} 
                    alt={char.characterName}
                    className="w-9 h-9 rounded-full border border-border-hover object-cover"
                />
                <div className="flex-1">
                    <div className="text-[15px] font-bold text-foreground leading-tight">
                        {char.characterName}
                    </div>
                    <div className="text-[11px] text-foreground-muted font-medium">
                        {char.corporationName || 'Unknown Corp'}
                    </div>
                    <div className="text-[10px] text-foreground-dim min-h-[12px]">
                        {char.allianceName || ''}
                    </div>
                </div>
                {char.isMain && <span className="text-sm">⭐</span>}
            </div>

            {/* 바디 */}
            <div className="px-4 py-3.5">
                <div className="flex justify-between items-center py-1.5 border-b border-primary/10">
                    <span className="text-foreground-muted text-[11px] font-semibold">지갑</span>
                    <span className="text-success text-sm font-bold">{formatISK(char.balance, iskAbbreviation)} ISK</span>
                </div>

                <div className="py-2 border-b border-primary/10">
                    <div className="flex justify-between items-start">
                        <span className="text-foreground-muted text-[11px] font-semibold mt-0.5">오메가 만료</span>
                        <div className="text-right">
                            <div className="flex items-center justify-end gap-2">
                                <span className={cn("text-sm font-bold", getOmegaColorClass())}>
                                    {remainingDays !== null ? (remainingDays > 0 ? `${remainingDays}일 남음` : '만료됨') : '정보 없음'}
                                </span>
                                <button 
                                    onClick={() => setIsEditing(!isEditing)}
                                    className="bg-none border-none text-foreground-dim cursor-pointer p-0 text-xs hover:text-foreground transition-colors"
                                    title="오메가 기간 갱신"
                                >📅</button>
                            </div>
                            <div className="text-[10px] text-foreground-dim mt-0.5 font-medium">
                                {formatDate(char.omegaExpiresAt, timezone) || 'N/A'}
                            </div>
                        </div>
                    </div>

                    {isEditing && (
                        <div className="mt-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="grid grid-cols-5 gap-1">
                                {quickButtons.map(btn => (
                                    <button
                                        key={btn.label}
                                        onClick={() => addDuration(btn.days || 0, btn.months || 0)}
                                        className="py-1 text-[10px] font-bold bg-muted border border-border rounded-[2px] text-foreground-muted cursor-pointer hover:bg-border/20 transition-colors"
                                    >+{btn.label}</button>
                                ))}
                            </div>
                            <input 
                                type="datetime-local"
                                defaultValue={char.omegaExpiresAt ? new Date(new Date(char.omegaExpiresAt).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        onUpdateOmega(char.characterId, new Date(e.target.value).toISOString());
                                        setIsEditing(false);
                                    }
                                }}
                                className="w-full bg-background border border-border text-foreground text-[11px] p-1 rounded-[2px] outline-none [color-scheme:dark]"
                            />
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center py-1.5">
                    <span className="text-foreground-muted text-[11px] font-semibold">마지막 동기화</span>
                    <span className="text-foreground text-[12px] font-medium">
                        {char.lastSyncedAt ? formatDate(char.lastSyncedAt, timezone) : 'Never'}
                    </span>
                </div>
            </div>
        </div>
    )
}
