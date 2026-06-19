function formatDate(value) {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString()
}

function matchLabel(match) {
    if (!match) return '-'
    if (match.matchType === 'STRONG') return 'STRONG'
    if (match.matchType === 'CANDIDATE') return 'CANDIDATE'
    return match.matchType || '-'
}

export function JobsTab({ run }) {
    if (!run) {
        return (
            <div className="bg-card border border-border rounded p-12 text-center text-foreground-dim">
                Select a production run first.
            </div>
        )
    }

    const jobs = run.plannedJobs || []

    return (
        <div className="bg-card border border-border rounded overflow-hidden">
            <table className="w-full border-collapse text-[13px]">
                <thead>
                    <tr className="bg-muted border-b border-border">
                        <th className="px-3 py-2.5 text-left text-[9px] text-foreground-dim uppercase tracking-wider">Product</th>
                        <th className="px-3 py-2.5 text-right text-[9px] text-foreground-dim uppercase tracking-wider">Runs</th>
                        <th className="px-3 py-2.5 text-left text-[9px] text-foreground-dim uppercase tracking-wider">Status</th>
                        <th className="px-3 py-2.5 text-left text-[9px] text-foreground-dim uppercase tracking-wider">Assigned character</th>
                        <th className="px-3 py-2.5 text-left text-[9px] text-foreground-dim uppercase tracking-wider">Match type</th>
                        <th className="px-3 py-2.5 text-left text-[9px] text-foreground-dim uppercase tracking-wider">ESI status</th>
                        <th className="px-3 py-2.5 text-left text-[9px] text-foreground-dim uppercase tracking-wider">End date</th>
                    </tr>
                </thead>
                <tbody>
                    {jobs.length > 0 ? jobs.map((job) => (
                        <tr key={job.id} className="border-b border-border bg-card hover:bg-border/5 transition-colors">
                            <td className="px-3 py-2.5 text-foreground font-semibold">{job.productTypeName}</td>
                            <td className="px-3 py-2.5 text-right text-foreground-muted font-mono">{Number(job.runs || 0).toLocaleString()}</td>
                            <td className="px-3 py-2.5">
                                <span className="text-[9px] px-1.5 py-0.5 rounded-[2px] border border-primary text-primary font-bold uppercase">
                                    {job.status}
                                </span>
                            </td>
                            <td className="px-3 py-2.5 text-foreground-muted">{job.assignedCharacterName || '-'}</td>
                            <td className="px-3 py-2.5 text-foreground-muted">{matchLabel(job.match)}</td>
                            <td className="px-3 py-2.5 text-foreground-muted">{job.match?.esiStatus || '-'}</td>
                            <td className="px-3 py-2.5 text-foreground-dim text-[11px]">{formatDate(job.match?.endDate)}</td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan="7" className="text-center py-20 text-foreground-dim font-mono tracking-[2px]">
                                NO PLANNED JOBS
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}
