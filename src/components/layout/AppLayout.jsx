import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'

export default function AppLayout() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <Navbar />
            <main className="max-w-[1440px] mx-auto p-8">
                <Outlet />
            </main>
        </div>
    )
}
