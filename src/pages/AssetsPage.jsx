import { Navbar } from '../components/layout/Navbar'
import { AssetsTab } from '../components/portfolio/AssetsTab'

export default function AssetsPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <main className="max-w-360 mx-auto p-8">
                <div className="flex items-center gap-3 mb-8">
                    <h1 className="m-0 text-2xl font-extrabold text-foreground tracking-tight">
                        Asset Inventory
                    </h1>
                    <div className="flex-1 h-px bg-border opacity-50"></div>
                </div>
                <AssetsTab apiBase="" />
            </main>
        </div>
    )
}
