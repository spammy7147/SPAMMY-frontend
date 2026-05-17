import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { useTheme } from '../../store/ThemeContext'
import { cn } from '@/lib/utils'

export function Navbar() {
    const navigate = useNavigate()
    const location = useLocation()
    const { logout } = useAuth()
    const { theme, toggleTheme } = useTheme()

    const navItems = [
        { label: 'Assets', path: '/assets' },
        { label: 'Missions', path: '/missions' },
        { label: 'Market', path: '/market' },
    ]

    const isActive = (path) => location.pathname === path

    return (
        <nav className="bg-card/98 border-b border-border px-8 h-16 flex items-center justify-between sticky top-0 z-100 backdrop-blur-xl">
            <div className="flex items-center gap-10">
                <div 
                    className="flex flex-col cursor-pointer" 
                    onClick={() => navigate('/')} 
                    role="button"
                >
                    <span className="font-extrabold text-xl tracking-[3px] text-primary leading-none">
                        SPAMMY
                    </span>
                    <span className="text-[7px] text-foreground-dim tracking-[0.5px] mt-1 font-semibold uppercase">
                        Asset Management & Monitoring Yard
                    </span>
                </div>

                <div className="flex gap-6 h-16">
                    {navItems.map(item => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={cn(
                                "bg-none border-none border-b-3 px-1 transition-all text-sm font-bold tracking-[0.5px] cursor-pointer",
                                isActive(item.path) 
                                    ? "border-primary text-primary" 
                                    : "border-transparent text-foreground-muted hover:text-foreground"
                            )}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <button 
                    onClick={toggleTheme}
                    className="bg-muted border border-border rounded px-2.5 py-1.5 cursor-pointer text-foreground-muted hover:text-foreground transition-colors"
                >
                    {theme === 'dark' ? '🌙' : '☀️'}
                </button>
                <button 
                    onClick={() => navigate('/settings')}
                    className="bg-none border-none p-2 cursor-pointer text-foreground-muted hover:text-foreground transition-colors text-lg"
                >⚙️</button>
                <button 
                    onClick={logout}
                    className="text-[11px] font-bold text-destructive bg-transparent border border-destructive px-3 py-1.25 rounded cursor-pointer hover:bg-destructive/10 transition-colors"
                >Logout</button>
            </div>
        </nav>
    )
}
