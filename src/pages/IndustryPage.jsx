import { IndustryWorkspace } from '../components/industry/IndustryWorkspace'

export default function IndustryPage() {
    return (
        <>
            <div className="flex items-center gap-3 mb-8">
                <h1 className="m-0 text-2xl font-extrabold text-foreground tracking-tight">
                    Industry
                </h1>
                <div className="flex-1 h-px bg-border opacity-50"></div>
            </div>
            <IndustryWorkspace />
        </>
    )
}
