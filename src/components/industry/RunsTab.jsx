import { useState } from 'react'
import { cn } from '@/lib/utils'
import { industryApi } from '@/services/industryApi'

function formatDate(value) {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString()
}

export function RunsTab({ runs, selectedRun, onSelectRun }) {
    const [loadingRunId, setLoadingRunId] = useState(null)
    const [error, setError] = useState(null)

    const selectRun = async (run) => {
        setLoadingRunId(run.id)
        setError(null)
        try {
            const detail = await industryApi.run(run.id)
            onSelectRun(detail)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoadingRunId(null)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            {error && (
                <div className="bg-card border border-destructive/50 rounded px-4 py-3 text-destructive text-sm">
                    {error}
                </div>
            )}
            <div className="bg-card border border-border rounded overflow-hidden">
                <table className="w-full border-collapse text-[13px]">
                    <thead>
                        <tr className="bg-muted border-b border-border">
                            <th className="px-3 py-2.5 text-left text-[9px] text-foreground-dim uppercase tracking-wider">Run</th>
                            <th className="px-3 py-2.5 text-left text-[9px] text-foreground-dim uppercase tracking-wider">Template</th>
                            <th className="px-3 py-2.5 text-left text-[9px] text-foreground-dim uppercase tracking-wider">Status</th>
                            <th className="px-3 py-2.5 text-left text-[9px] text-foreground-dim uppercase tracking-wider">Location Group</th>
                            <th className="px-3 py-2.5 text-left text-[9px] text-foreground-dim uppercase tracking-wider">Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        {runs.length > 0 ? runs.map((run) => {
                            const selected = selectedRun?.id === run.id
                            return (
                                <tr
                                    key={run.id}
                                    className={cn(
                                        'border-b border-border bg-card hover:bg-border/5 transition-colors',
                                        selected && 'bg-border/10',
                                    )}
                                >
                                    <td className="px-3 py-2.5">
                                        <button
                                            type="button"
                                            onClick={() => selectRun(run)}
                                            className="bg-transparent border-none p-0 text-left text-secondary font-bold cursor-pointer hover:text-secondary/80"
                                        >
                                            {loadingRunId === run.id ? 'Loading...' : run.name}
                                        </button>
                                    </td>
                                    <td className="px-3 py-2.5 text-foreground-muted">{run.templateName || '-'}</td>
                                    <td className="px-3 py-2.5">
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-[2px] border border-primary text-primary font-bold uppercase">
                                            {run.status}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-foreground-muted">{run.locationGroupName || '-'}</td>
                                    <td className="px-3 py-2.5 text-foreground-dim text-[11px]">{formatDate(run.createdAt)}</td>
                                </tr>
                            )
                        }) : (
                            <tr>
                                <td colSpan="5" className="text-center py-20 text-foreground-dim font-mono tracking-[2px]">
                                    NO PRODUCTION RUNS
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
