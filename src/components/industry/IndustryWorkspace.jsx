import { useEffect, useState } from 'react'
import { Tabs } from '@/components/ui/Tabs'
import { industryApi } from '@/services/industryApi'
import { JobsTab } from './JobsTab'
import { MaterialsTab } from './MaterialsTab'
import { RunsTab } from './RunsTab'
import { ShoppingTab } from './ShoppingTab'
import { TemplatesTab } from './TemplatesTab'

const tabs = [
    { id: 'templates', label: 'Templates' },
    { id: 'runs', label: 'Runs' },
    { id: 'materials', label: 'Materials' },
    { id: 'jobs', label: 'Jobs' },
    { id: 'shopping', label: 'Shopping' },
]

export function IndustryWorkspace() {
    const [activeTab, setActiveTab] = useState('templates')
    const [templates, setTemplates] = useState([])
    const [runs, setRuns] = useState([])
    const [selectedRun, setSelectedRun] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let mounted = true

        Promise.all([industryApi.templates(), industryApi.runs()])
            .then(([templateData, runData]) => {
                if (!mounted) return
                setTemplates(templateData || [])
                setRuns(runData || [])
            })
            .catch((err) => {
                if (mounted) setError(err.message)
            })
            .finally(() => {
                if (mounted) setLoading(false)
            })

        return () => {
            mounted = false
        }
    }, [])

    const handleTemplateCreated = (template) => {
        setTemplates((current) => [template, ...current])
    }

    if (loading) {
        return (
            <div className="text-center py-12 text-foreground-dim tracking-[2px]">
                LOADING INDUSTRY WORKSPACE...
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-card border border-destructive/50 rounded p-5 text-destructive text-sm">
                {error}
            </div>
        )
    }

    return (
        <>
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
            <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                {activeTab === 'templates' && (
                    <TemplatesTab templates={templates} onTemplateCreated={handleTemplateCreated} />
                )}
                {activeTab === 'runs' && (
                    <RunsTab runs={runs} selectedRun={selectedRun} onSelectRun={setSelectedRun} />
                )}
                {activeTab === 'materials' && <MaterialsTab run={selectedRun} />}
                {activeTab === 'jobs' && <JobsTab run={selectedRun} />}
                {activeTab === 'shopping' && <ShoppingTab run={selectedRun} />}
            </div>
        </>
    )
}
