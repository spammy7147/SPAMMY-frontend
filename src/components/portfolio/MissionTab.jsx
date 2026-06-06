import { useEffect, useState } from 'react'
import { formatISK } from '../../lib/utils'
import { useConfig } from '../../store/ConfigContext'
import { api } from '@/services/api'

export function MissionTab() {
    const { iskAbbreviation } = useConfig()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchMissions = async () => {
            try {
                const result = await api.characters.missions()
                setData(result)
            } catch (error) {
                console.error('Missions fetch failed', error)
            } finally {
                setLoading(false)
            }
        }

        fetchMissions()
    }, [])

    if (loading) return (
        <div className="text-center py-12 text-foreground-dim tracking-[2px]">
            LOADING MISSIONS...
        </div>
    )
    if (!data) return (
        <div className="text-center py-12 text-foreground-dim">
            NO MISSION DATA AVAILABLE
        </div>
    )

    const missionStats = [
        { label: '총 미션 수 (30일)', value: data.stats.totalCount, unit: '개', color: 'text-primary' },
        { label: '미션 ISK 수입', value: formatISK(data.stats.totalIsk, iskAbbreviation), unit: 'ISK', color: 'text-success' },
        { label: '추정 LP 획득', value: data.stats.totalLp.toLocaleString(), unit: 'LP', color: 'text-gold' },
        { label: '추정 LP 가치', value: formatISK(data.stats.totalLpValue, iskAbbreviation), unit: 'ISK', color: 'text-gold' },
    ]

    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
                {missionStats.map((stat, i) => (
                    <div key={i} className="bg-card border border-border rounded p-5 text-center shadow-sm">
                        <div className="text-[11px] text-foreground-dim mb-2 tracking-wider font-bold">
                            {stat.label}
                        </div>
                        <div className={`text-2xl font-extrabold ${stat.color} leading-none`}>
                            {stat.value}
                            <span className="text-xs text-foreground-muted ml-1 font-medium">{stat.unit}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-card border border-border rounded overflow-hidden">
                <div className="p-4 px-5 border-b border-border bg-muted">
                    <span className="text-[13px] font-extrabold tracking-wider text-foreground uppercase">
                        미션 일별 기록 (최근 30일)
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[13px]">
                        <thead>
                            <tr className="border-b border-border bg-muted">
                                {['날짜', '미션 수', 'ISK 수입', '추정 LP', '일일 총 수입'].map(h => (
                                    <th key={h} className={`p-3 text-[10px] tracking-wider text-foreground-dim uppercase font-bold ${h === '날짜' ? 'text-left' : 'text-right'}`}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.dailyRecords.map((log, i) => (
                                <tr key={i} className="border-b border-border bg-card hover:bg-border/5 transition-colors">
                                    <td className="p-3 text-foreground font-semibold">{log.date}</td>
                                    <td className="p-3 text-right text-primary font-bold">{log.count}개</td>
                                    <td className="p-3 text-right text-success font-bold">{formatISK(log.iskIncome, iskAbbreviation)}</td>
                                    <td className="p-3 text-right text-gold font-bold">{log.lpEarned.toLocaleString()} LP</td>
                                    <td className="p-3 text-right text-foreground font-extrabold">{formatISK(log.totalIncome, iskAbbreviation)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
