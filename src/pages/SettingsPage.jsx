import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import { useConfig } from '../store/ConfigContext'
import { Navbar } from '../components/layout/Navbar'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
    const navigate = useNavigate()
    const { user, checkAuth } = useAuth()
    const { iskAbbreviation, timezone, updateSettings } = useConfig()
    const [characters, setCharacters] = useState([])
    const [loading, setLoading] = useState(true)
    const [confirmModal, setConfirmModal] = useState({ show: false, charId: null, charName: '' })

    const fetchCharacters = async () => {
        try {
            const res = await fetch('/api/auth/characters', { credentials: 'include' })
            if (res.ok) {
                const data = await res.json()
                setCharacters(data)
            }
        } catch (error) {
            console.error('Failed to fetch characters', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCharacters()
    }, [])

    const handleSetMain = async () => {
        const { charId } = confirmModal
        if (!charId) return
        
        try {
            const res = await fetch(`/api/auth/characters/${charId}/main`, { 
                method: 'PATCH',
                credentials: 'include'
            })
            if (res.ok) {
                await fetchCharacters()
                await checkAuth()
                setConfirmModal({ show: false, charId: null, charName: '' })
            }
        } catch (error) {
            console.error('API Error:', error)
        }
    }

    const handleUnlink = async (charId) => {
        if (!confirm('이 캐릭터를 연결 해제하시겠습니까?')) return
        
        try {
            const res = await fetch(`/api/auth/characters/${charId}`, { 
                method: 'DELETE',
                credentials: 'include'
            })
            if (res.ok) {
                fetchCharacters()
            }
        } catch (error) {
            console.error('API Error:', error)
        }
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="w-11 h-11 border-2 border-border border-t-primary rounded-full animate-spin-fast"></div>
        </div>
    )

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <Navbar />

            <main className="max-w-200 mx-auto py-12 px-8">
                
                {/* 헤더 */}
                <div className="flex items-end justify-between mb-10">
                    <div>
                        <div 
                            onClick={() => navigate('/')}
                            className="text-foreground-dim text-xs cursor-pointer mb-2 tracking-wider hover:text-foreground transition-colors"
                        >← BACK TO PORTFOLIO</div>
                        <h1 className="m-0 text-3xl font-extrabold text-foreground tracking-tight">Account Settings</h1>
                    </div>
                    <button 
                        onClick={() => window.location.href = '/api/auth/link'}
                        className="bg-transparent border border-success text-success px-4 py-2 rounded text-[13px] font-bold cursor-pointer hover:bg-success/5 transition-colors"
                    >+ Add Character</button>
                </div>

                {/* 캐릭터 관리 섹션 */}
                <div className="bg-card border border-border rounded overflow-hidden mb-8">
                    <div className="p-5 px-6 border-b border-border bg-black/20">
                        <h2 className="m-0 text-sm font-bold text-foreground-muted tracking-wider uppercase">Linked Characters</h2>
                        <p className="m-0 mt-1 text-[11px] text-foreground-dim">연동된 캐릭터들을 관리하고 메인 계정을 설정합니다.</p>
                    </div>

                    <div className="flex flex-col">
                        {characters.map((char, index) => (
                            <div key={char.characterId} className={cn(
                                "flex items-center justify-between p-5 px-6 border-b border-primary/10 last:border-b-0 transition-colors",
                                char.main ? "bg-primary/5" : "bg-transparent"
                            )}>
                                <div className="flex items-center gap-4">
                                    <img 
                                        src={char.portraitUrl || `https://images.evetech.net/characters/${char.characterId}/portrait?size=64`} 
                                        alt={char.characterName} 
                                        className={cn(
                                            "w-12 h-12 rounded border",
                                            char.main ? "border-primary" : "border-border"
                                        )}
                                    />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-foreground text-base">{char.characterName}</span>
                                            {char.main && (
                                                <span className="text-[9px] bg-primary text-background px-1.5 py-0.5 rounded font-extrabold tracking-wider">MAIN</span>
                                            )}
                                        </div>
                                        <div className="text-[11px] text-foreground-dim mt-0.5">Corp ID: {char.corporationId}</div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {!char.main && (
                                        <button 
                                            onClick={() => setConfirmModal({ show: true, charId: char.characterId, charName: char.characterName })}
                                            className="bg-muted border border-border text-foreground-muted px-3 py-1.5 rounded text-xs font-bold cursor-pointer hover:bg-border/20 transition-colors"
                                        >Set as Main</button>
                                    )}
                                    <button 
                                        onClick={() => handleUnlink(char.characterId)}
                                        className="bg-transparent border border-destructive/30 text-destructive px-3 py-1.5 rounded text-xs font-bold cursor-pointer hover:bg-destructive/10 transition-colors"
                                    >Unlink</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 설정 섹션 */}
                <div className="bg-card border border-border rounded overflow-hidden">
                    <div className="p-5 px-6 border-b border-border bg-black/20">
                        <h2 className="m-0 text-sm font-bold text-foreground-muted tracking-wider uppercase">Display Settings</h2>
                        <p className="m-0 mt-1 text-[11px] text-foreground-dim">UI에 표시되는 데이터 형식을 설정합니다.</p>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-bold text-foreground">ISK 금액 축약 표시</div>
                                <div className="text-[11px] text-foreground-dim mt-0.5">금액을 K, M, B 단위로 줄여서 표시합니다. (예: 1,500,000 → 1.50 M)</div>
                            </div>
                            <button 
                                onClick={() => updateSettings({ iskAbbreviation: !iskAbbreviation, timezone })}
                                className={cn(
                                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                                    iskAbbreviation ? "bg-primary" : "bg-muted border border-border"
                                )}
                            >
                                <span className={cn(
                                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                    iskAbbreviation ? "translate-x-6" : "translate-x-1"
                                )} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-primary/5">
                            <div>
                                <div className="text-sm font-bold text-foreground">타임존 설정</div>
                                <div className="text-[11px] text-foreground-dim mt-0.5">날짜 및 시간 표시 기준을 설정합니다.</div>
                            </div>
                            <select 
                                value={timezone}
                                onChange={(e) => updateSettings({ iskAbbreviation, timezone: e.target.value })}
                                className="bg-muted border border-border text-foreground text-[12px] px-3 py-1.5 rounded outline-none focus:border-primary transition-colors"
                            >
                                <option value="UTC">UTC (EVE Time)</option>
                                <option value="KST">KST (한국 시간)</option>
                                <option value="LOCAL">Local Time (브라우저 기준)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-[10px] text-foreground-dim tracking-wider">
                        SPAMMY Account ID: {user?.userId || 'GUEST_MODE'} · {characters.length} characters linked
                    </p>
                </div>
            </main>

            {/* 다크 테마 커스텀 모달 */}
            {confirmModal.show && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[1000] animate-in fade-in duration-200">
                    <div className="bg-card border border-border rounded p-10 w-[90%] max-w-[400px] text-center shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ease-out">
                        <div className="text-3xl mb-4">👑</div>
                        <h3 className="m-0 mb-2 text-lg font-extrabold text-foreground tracking-wide">메인 캐릭터 변경</h3>
                        <p className="m-0 mb-8 text-sm text-foreground-muted leading-relaxed">
                            <span className="text-primary font-bold">{confirmModal.charName}</span> 캐릭터를<br />
                            포트폴리오의 메인 계정으로 설정하시겠습니까?
                        </p>
                        <div className="flex gap-2.5">
                            <button 
                                onClick={() => setConfirmModal({ show: false, charId: null, charName: '' })}
                                className="flex-1 py-3 rounded border border-border bg-transparent text-foreground-dim text-sm font-bold cursor-pointer hover:text-foreground transition-colors"
                            >Cancel</button>
                            <button 
                                onClick={handleSetMain}
                                className="flex-1 py-3 rounded border-none bg-primary text-background text-sm font-extrabold cursor-pointer hover:bg-primary/90 transition-colors"
                            >Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
