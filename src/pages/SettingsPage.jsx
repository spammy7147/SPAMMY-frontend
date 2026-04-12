import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'

const API = ''

export default function SettingsPage() {
    const navigate = useNavigate()
    const { user, checkAuth } = useAuth()
    const [characters, setCharacters] = useState([])
    const [loading, setLoading] = useState(true)
    
    // 모달 상태: { show: boolean, charId: number | null, charName: string }
    const [confirmModal, setConfirmModal] = useState({ show: false, charId: null, charName: '' })

    const fetchCharacters = async () => {
        try {
            const res = await fetch('/auth/characters', { credentials: 'include' })
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
            const res = await fetch(`/auth/characters/${charId}/main`, { 
                method: 'PATCH',
                credentials: 'include'
            })
            if (res.ok) {
                await fetchCharacters()
                await checkAuth()
                setConfirmModal({ show: false, charId: null, charName: '' })
            }
        } catch (error) {
            alert('메인 캐릭터 변경 실패')
        }
    }

    const handleUnlink = async (charId) => {
        if (!confirm('이 캐릭터를 연결 해제하시겠습니까?')) return
        try {
            const res = await fetch(`/auth/characters/${charId}`, { 
                method: 'DELETE',
                credentials: 'include'
            })
            if (res.ok) {
                fetchCharacters()
            } else {
                const msg = await res.text()
                alert(msg || '연결 해제 실패')
            }
        } catch (error) {
            alert('연결 해제 중 오류 발생')
        }
    }

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
            <p style={{ color: '#94a3b8' }}>설정 불러오는 중...</p>
        </div>
    )

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: '"Inter", system-ui, sans-serif', padding: '40px 24px' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                
                {/* 헤더 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                    <div>
                        <button 
                            onClick={() => navigate('/dashboard')}
                            style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '14px', cursor: 'pointer', padding: 0, marginBottom: '8px', display: 'block' }}
                        >← Back to Dashboard</button>
                        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>Account Settings</h1>
                    </div>
                    <button 
                        onClick={() => window.location.href = '/auth/link'}
                        style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                    >+ Add New Character</button>
                </div>

                {/* 캐릭터 관리 섹션 */}
                <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: '#fcfcfd' }}>
                        <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#334155' }}>Linked Characters</h2>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>이 그룹에 연결된 모든 EVE 캐릭터들입니다.</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {characters.map((char, index) => (
                            <div key={char.characterId} style={{ 
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                                padding: '20px 24px', borderBottom: index === characters.length - 1 ? 'none' : '1px solid #f1f5f9',
                                background: char.main ? '#f8faff' : 'transparent'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <img 
                                        src={char.portraitUrl} 
                                        alt={char.characterName} 
                                        style={{ width: '44px', height: '44px', borderRadius: '10px', border: char.main ? '2px solid #2563eb' : '1px solid #e2e8f0' }}
                                    />
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontWeight: '700', color: '#0f172a' }}>{char.characterName}</span>
                                            {char.main && (
                                                <span style={{ fontSize: '10px', background: '#2563eb', color: '#fff', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>MAIN</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>Corp ID: {char.corporationId}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    {!char.main && (
                                        <button 
                                            onClick={() => setConfirmModal({ show: true, charId: char.characterId, charName: char.characterName })}
                                            style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#475569', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                                        >Set as Main</button>
                                    )}
                                    <button 
                                        onClick={() => handleUnlink(char.characterId)}
                                        style={{ background: '#fff', border: '1px solid #fee2e2', color: '#ef4444', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                                    >Unlink</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ marginTop: '24px', padding: '0 8px' }}>
                    <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                        SPAMMY Account ID: {user?.userId} · {characters.length} characters linked
                    </p>
                </div>
            </div>

            {/* 세련된 커스텀 확인 모달 */}
            {confirmModal.show && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        background: '#fff', borderRadius: '24px', padding: '32px',
                        width: '90%', maxWidth: '400px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        textAlign: 'center',
                        transform: 'translateY(0)',
                        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                        <div style={{ 
                            width: '64px', height: '64px', background: '#eff6ff', 
                            borderRadius: '20px', display: 'flex', alignItems: 'center', 
                            justifyContent: 'center', fontSize: '32px', margin: '0 auto 20px' 
                        }}>👑</div>
                        <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>메인 캐릭터 변경</h3>
                        <p style={{ margin: '0 0 32px', fontSize: '15px', color: '#64748b', lineHeight: '1.6' }}>
                            <strong style={{ color: '#2563eb', fontWeight: '700' }}>{confirmModal.charName}</strong> 캐릭터를<br />
                            그룹의 메인 계정으로 설정할까요?
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button 
                                onClick={() => setConfirmModal({ show: false, charId: null, charName: '' })}
                                style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                            >취소</button>
                            <button 
                                onClick={handleSetMain}
                                style={{ flex: 1, padding: '14px', borderRadius: '14px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
                                onMouseLeave={e => e.currentTarget.style.background = '#2563eb'}
                            >설정하기</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 단순 애니메이션용 스타일 태그 */}
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    )
}
