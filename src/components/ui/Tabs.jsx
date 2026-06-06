import { cn } from '@/lib/utils'

export function Tabs({ tabs, activeTab, onChange }) {
    return (
        <div className="flex gap-6 mb-8 border-b border-border">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={cn(
                        "bg-none border-none border-b-2 py-3 px-1 text-sm font-bold cursor-pointer transition-all",
                        activeTab === tab.id 
                            ? "border-secondary text-secondary" 
                            : "border-transparent text-foreground-dim hover:text-foreground-muted"
                    )}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    )
}
