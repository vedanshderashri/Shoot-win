import React, { useState, useEffect, useRef } from 'react';
import gameEngine from './engine/game';
import Scoreboard from './ui/scoreboard.jsx';
import { isMobile } from './player/touchControls';

function App() {
    const [screen, setScreen] = useState('lobby');
    const [playerName, setPlayerName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [joinError, setJoinError] = useState('');
    const [winnerData, setWinnerData] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [activeWeapon, setActiveWeapon] = useState('Rifle');
    const [selectedMap, setSelectedMap] = useState('warzone');

    const [health, setHealth] = useState(100);
    const [stamina, setStamina] = useState(100);
    const [ammo, setAmmo] = useState(30);
    const [reserveAmmo, setReserveAmmo] = useState(90);
    const [canResupply, setCanResupply] = useState(false);
    const [resupplyProgress, setResupplyProgress] = useState(-1);
    const [grenades, setGrenades] = useState(3);
    const [kills, setKills] = useState(0);
    const [deaths, setDeaths] = useState(0);
    const [killFeed, setKillFeed] = useState([]);
    const [scores, setScores] = useState([]);
    const [showHitmarker, setShowHitmarker] = useState(false);
    const [isHeadshot, setIsHeadshot] = useState(false);
    const [tookDamage, setTookDamage] = useState(false);
    const [showScoreboard, setShowScoreboard] = useState(false);
    const [isScoping, setIsScoping] = useState(false);
    const [isWakingUp, setIsWakingUp] = useState(false);

    const canvasContainerRef = useRef(null);

    const displayKillFeed = (msg) => {
        setKillFeed(prev => [...prev.slice(-4), msg]);
        setTimeout(() => setKillFeed(prev => prev.slice(1)), 4000);
    };

    const gameCallbacks = {
        onHealthChange: (hp) => { setHealth(hp); setTookDamage(true); setTimeout(() => setTookDamage(false), 300); },
        onKill: () => setKills(prev => prev + 1),
        onDeath: () => setDeaths(prev => prev + 1),
        onAmmoChange: (a, r) => { setAmmo(a); if (r !== undefined) setReserveAmmo(r); },
        onGrenadeChange: (g) => setGrenades(g),
        onHitmarker: (headshot) => { setIsHeadshot(headshot); setShowHitmarker(true); setTimeout(() => setShowHitmarker(false), 200); },
        onStaminaChange: (s) => setStamina(s),
        onKillFeed: (msg) => displayKillFeed(msg),
        onScoresUpdate: (s) => setScores(s),
        onGameOver: (data) => { setWinnerData(data); setScreen('gameover'); document.exitPointerLock(); },
        onWeaponChange: (w) => setActiveWeapon(w),
        onCrateProximity: (near) => setCanResupply(near),
        onResupplyProgress: (prog) => setResupplyProgress(prog)
    };

    const startGame = (code) => { setRoomCode(code); setScreen('playing'); };

    const handleCreateRoom = async () => {
        const name = playerName.trim() || 'Ghost';
        try {
            gameEngine.init(canvasContainerRef.current, '', gameCallbacks);
            const code = await gameEngine.createRoom(name, selectedMap);
            startGame(code);
        } catch (err) {
            setJoinError(err.message.toUpperCase());
            setScreen('lobby');
        }
    };

    const handleJoinRoom = async () => {
        const name = playerName.trim() || 'Ghost';
        const code = joinCode.trim().toUpperCase();
        if (!code || code.length < 4) { setJoinError('INVALID ROOM CODE'); return; }

        try {
            gameEngine.init(canvasContainerRef.current, code, gameCallbacks);
            await gameEngine.joinRoom(code, name);
            startGame(code);
        } catch (err) {
            setJoinError(err.message.toUpperCase());
        }
    };

    // Scoreboard + scope state
    useEffect(() => {
        const socket = gameEngine.getSocket();

        const updateConnection = () => setIsConnected(socket.connected);
        socket.on('connect', updateConnection);
        socket.on('disconnect', updateConnection);
        updateConnection();

        const onKeyDown = (e) => { if (e.code === 'Tab') { e.preventDefault(); setShowScoreboard(true); } };
        const onKeyUp = (e) => { if (e.code === 'Tab') setShowScoreboard(false); };
        const onMouseDown = (e) => { if (e.button === 2) setIsScoping(true); };
        const onMouseUp = (e) => { if (e.button === 2) setIsScoping(false); };
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mouseup', onMouseUp);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('keyup', onKeyUp);
            document.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, []);

    useEffect(() => {
        // Aggressive Wakeup Ping for Render Free Tier
        const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:3000'
            : 'https://warzone-battlefield.onrender.com';

        const wakeup = async () => {
            setIsWakingUp(true);
            try {
                // Fetch is faster than Socket.IO for waking up a sleeping instance
                await fetch(serverUrl, { mode: 'no-cors' });
                console.log("[Lobby] Wakeup ping dispatched.");
            } catch (e) {
                console.warn("[Lobby] Wakeup ping failed, relying on Socket.IO.", e);
            }
        };
        wakeup();

        return () => gameEngine.cleanup();
    }, []);

    const kd = deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2);
    const healthPct = Math.max(0, Math.min(100, health));

    return (
        <div className="app-container">

            {/* ───────── HOME / LOBBY SCREEN ───────── */}
            {(screen === 'lobby' || screen === 'create' || screen === 'join') && (
                <div className="lobby-wrapper">
                    {/* Background scanlines + noise overlay */}
                    <div className="lobby-bg">
                        <div className="scanlines"></div>
                        <div className="vignette"></div>
                    </div>

                    <div className="lobby-center">
                        {screen === 'lobby' && (
                            <>
                                {/* Game logo/title */}
                                <div className="game-logo">
                                    <div className="logo-tag">CLASSIFIED // TOP SECRET</div>
                                    <h1 className="logo-title">WARZONE</h1>
                                    <div className="logo-subtitle">CONFLICT ZONE ALPHA · ACTIVE ENGAGEMENT</div>
                                </div>

                                {/* Alert strip */}
                                <div className="alert-strip">
                                    ⚠ HOSTILE FORCES DETECTED · SECTOR 4 COMPROMISED · ALL UNITS DEPLOY IMMEDIATELY
                                </div>

                                {/* Connection Status */}
                                <div className="connection-status">
                                    {isConnected ?
                                        <span className="status-online">● SATELLITE LINK ESTABLISHED</span> :
                                        <div className="status-offline-container">
                                            <span className="status-offline">
                                                ○ {window.location.hostname === 'localhost' ? 'SYNCING LOCAL...' : 'CONNECTING TO COMMAND...'}
                                            </span>
                                            <div className="connection-loader">
                                                <div className="loader-fill"></div>
                                            </div>
                                        </div>
                                    }
                                </div>

                                {joinError && screen === 'lobby' && (
                                    <div className="mil-error" style={{ margin: '10px 0' }}>⚠ {joinError}</div>
                                )}

                                {/* Call sign input */}
                                <div className="mil-input-group">
                                    <label className="mil-label">▶ CALL SIGN / IDENTIFIER</label>
                                    <input
                                        type="text"
                                        value={playerName}
                                        onChange={(e) => setPlayerName(e.target.value)}
                                        placeholder="e.g. GHOST, VIPER, REAPER..."
                                        maxLength={16}
                                        className="mil-input"
                                        onKeyDown={(e) => e.key === 'Enter' && setScreen('create')}
                                    />
                                </div>

                                <div className="mil-buttons">
                                    <button
                                        className={`mil-btn mil-btn-primary ${!isConnected ? 'disabled' : ''}`}
                                        onClick={() => isConnected && setScreen('create')}
                                        disabled={!isConnected}
                                    >
                                        <span className="btn-icon">⬡</span>
                                        <span>CREATE OPERATION</span>
                                    </button>
                                    <button
                                        className={`mil-btn mil-btn-secondary ${!isConnected ? 'disabled' : ''}`}
                                        onClick={() => isConnected && setScreen('join')}
                                        disabled={!isConnected}
                                    >
                                        <span className="btn-icon">◈</span>
                                        <span>JOIN SQUAD</span>
                                    </button>
                                </div>

                                {/* Controls reference (desktop only) */}
                                {!isMobile && (
                                    <div className="controls-ref">
                                        <div className="controls-title">◆ FIELD MANUAL</div>
                                        <div className="controls-grid">
                                            {[
                                                ['W A S D', 'MOVE'], ['MOUSE', 'AIM'], ['L-CLICK', 'FIRE'],
                                                ['R-CLICK', 'SCOPE'], ['R', 'RELOAD'], ['SHIFT', 'SPRINT'],
                                                ['CTRL', 'CROUCH'], ['SPACE', 'JUMP'], ['TAB', 'INTEL'],
                                            ].map(([key, action]) => (
                                                <div key={key} className="ctrl-row">
                                                    <span className="ctrl-key">{key}</span>
                                                    <span className="ctrl-action">{action}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {screen === 'create' && (
                            <div className="mil-card">
                                <div className="mil-card-header">⬡ CREATE OPERATION</div>
                                <div className="mil-input-group">
                                    <label className="mil-label">▶ OPERATOR NAME</label>
                                    <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)}
                                        placeholder="GHOST" maxLength={16} className="mil-input" />
                                </div>
                                <div className="mil-input-group" style={{ marginTop: '4px' }}>
                                    <label className="mil-label">▶ SELECT THEATRE OF WAR</label>
                                    <div className="map-selection-grid">
                                        {[
                                            { id: 'warzone', name: 'WARZONE', desc: 'INDUSTRIAL RUINS' },
                                            { id: 'desert', name: 'DESERT', desc: 'CANYONS & BUNKERS' },
                                            { id: 'cqb', name: 'CQB SQUAD', desc: 'CLOSE QUARTERS' },
                                            { id: 'arctic', name: 'ARCTIC', desc: 'SNOWY OUTPOST' }
                                        ].map(m => (
                                            <button
                                                key={m.id}
                                                type="button"
                                                className={`map-select-card ${selectedMap === m.id ? 'active' : ''}`}
                                                onClick={() => setSelectedMap(m.id)}
                                            >
                                                <div className="map-select-name">{m.name}</div>
                                                <div className="map-select-desc">{m.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button className="mil-btn mil-btn-primary full-w" onClick={handleCreateRoom} style={{ marginTop: '12px' }}>
                                    <span className="btn-icon">🚀</span> DEPLOY OPERATION
                                </button>
                                <button className="mil-btn mil-btn-ghost full-w" onClick={() => setScreen('lobby')}>
                                    ← ABORT
                                </button>
                            </div>
                        )}

                        {screen === 'join' && (
                            <div className="mil-card">
                                <div className="mil-card-header">◈ JOIN SQUAD</div>
                                <div className="mil-input-group">
                                    <label className="mil-label">▶ OPERATOR NAME</label>
                                    <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)}
                                        placeholder="GHOST" maxLength={16} className="mil-input" />
                                </div>
                                <div className="mil-input-group">
                                    <label className="mil-label">▶ OPERATION CODE</label>
                                    <input type="text" value={joinCode} maxLength={6} className="mil-input code-input"
                                        placeholder="ALPHA-7" onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }} />
                                </div>
                                {joinError && <div className="mil-error">⚠ {joinError}</div>}
                                <button className="mil-btn mil-btn-primary full-w" onClick={handleJoinRoom}>
                                    <span className="btn-icon">🎮</span> DEPLOY & LINK
                                </button>
                                <button className="mil-btn mil-btn-ghost full-w" onClick={() => setScreen('lobby')}>
                                    ← ABORT
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <footer className="developer-credit">Developed by vedansh derashri</footer>

            {/* Game Canvas */}
            {tookDamage && <div className="damage-flash"></div>}
            <div id="game-container" ref={canvasContainerRef}></div>

            {/* ───────── IN-GAME HUD ───────── */}
            {screen === 'playing' && (
                <div className="hud">

                    {/* Top-left: Room code + status */}
                    <div className="hud-tl">
                        <div className="op-badge">
                            <span className="op-label">OP</span>
                            <span className="op-code">{roomCode}</span>
                        </div>
                        <div className="status-strip">ACTIVE · HOSTILE ZONE</div>
                    </div>

                    {/* Top-center: K/D stats */}
                    <div className="hud-tc">
                        <div className="stat-pill kills"><span className="sp-label">KIA</span><span className="sp-val">{kills}</span></div>
                        <div className="stat-pill kd"><span className="sp-label">K/D</span><span className="sp-val">{kd}</span></div>
                        <div className="stat-pill deaths"><span className="sp-label">DOWN</span><span className="sp-val">{deaths}</span></div>
                    </div>

                    {/* Scope overlay (when aiming) */}
                    {isScoping && (
                        <div className="scope-overlay">
                            <div className="scope-vignette"></div>
                            <div className="scope-reticle">
                                <div className="scope-circle"></div>
                                <div className="scope-line scope-h"></div>
                                <div className="scope-line scope-v"></div>
                                <div className="scope-dot"></div>
                                {/* Mil-dot markers */}
                                {[-100, -50, 50, 100].map(off => (
                                    <div key={off} className="scope-mildot" style={{ left: `calc(50% + ${off}px)`, top: '50%' }}></div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Crosshair */}
                    {!isScoping && (
                        <div className="crosshair-container">
                            <div className="crosshair"></div>
                            {showHitmarker && <div className={`hitmarker ${isHeadshot ? 'headshot' : ''}`}>✕</div>}
                        </div>
                    )}

                    {/* Bottom-left: Health + Stamina */}
                    <div className="hud-bl">
                        {/* Health */}
                        <div className="vital-row">
                            <div className="vital-label">
                                <span className="vital-icon">♥</span>
                                <span className="vital-name">HEALTH</span>
                            </div>
                            <div className="vital-bar-track">
                                <div className="vital-bar health-fill" style={{ width: `${healthPct}%`, background: healthPct > 50 ? '#4caf50' : healthPct > 25 ? '#ff9800' : '#f44336' }}></div>
                                <div className="vital-bar-segments"></div>
                            </div>
                            <span className="vital-num">{Math.round(health)}</span>
                        </div>
                        {/* Stamina */}
                        <div className="vital-row">
                            <div className="vital-label">
                                <span className="vital-icon">⚡</span>
                                <span className="vital-name">STAMINA</span>
                            </div>
                            <div className="vital-bar-track">
                                <div className="vital-bar stamina-fill" style={{ width: `${stamina}%` }}></div>
                            </div>
                            <span className="vital-num">{Math.round(stamina)}</span>
                        </div>
                    </div>

                    {/* Bottom-right: Ammo readout */}
                    <div className="hud-br">
                        <div className="weapon-name">{activeWeapon === 'Rifle' ? 'M4A1-S // PRIMARY ASSAULT' : 'AWM-50 // BOLT-ACTION SNIPER'}</div>
                        <div className="ammo-readout">
                            <div className="ammo-mag">{String(ammo).padStart(2, '0')}</div>
                            <div className="ammo-sep">/</div>
                            <div className="ammo-reserve">{String(reserveAmmo).padStart(2, '0')}</div>
                        </div>
                        {!isMobile && (
                            <div className="ammo-bullets">
                                {Array.from({ length: activeWeapon === 'Rifle' ? 30 : 5 }).map((_, i) => (
                                    <div key={i} className={`bullet-pip ${i < ammo ? 'full' : 'empty'}`}></div>
                                ))}
                            </div>
                        )}
                        <div className="grenade-row">
                            <span className="grenade-label">💣 GRENADES</span>
                            <div className="grenade-pips">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className={`grenade-pip ${i < grenades ? 'full' : 'empty'}`}>●</div>
                                ))}
                            </div>
                        </div>
                        {!isMobile && <div className="reload-hint">[R] RELOAD + RESUPPLY  [G] GRENADE</div>}
                    </div>

                    {/* Kill feed */}
                    <div className="kill-feed">
                        {killFeed.map((msg, i) => (
                            <div key={i} className="kill-feed-item">{msg}</div>
                        ))}
                    </div>

                    {/* Scoreboard overlay */}
                    <Scoreboard visible={showScoreboard} players={scores.length > 0 ? scores : [{ name: playerName || 'You', kills, deaths }]} />

                    {/* Ammo Crate Resupply HUD Elements */}
                    {canResupply && resupplyProgress === -1 && (
                        <div 
                            className="resupply-prompt"
                            style={isMobile ? { cursor: 'pointer' } : {}}
                            onClick={() => {
                                if (isMobile && window.gameEngine?.weaponSystem) {
                                    window.gameEngine.weaponSystem.startResupply();
                                }
                            }}
                            onTouchStart={() => {
                                if (isMobile && window.gameEngine?.weaponSystem) {
                                    window.gameEngine.weaponSystem.startResupply();
                                }
                            }}
                        >
                            <span className="resupply-key">{isMobile ? 'TAP' : 'L'}</span>
                            <span className="resupply-text">SECURE AMMUNITION</span>
                        </div>
                    )}

                    {resupplyProgress !== -1 && (
                        <div className="resupply-channel-container">
                            <div className="resupply-title">
                                {resupplyProgress === 100 ? 'AMMUNITION SECURED' : 'SECURING SUPPLIES...'}
                            </div>
                            <div className="resupply-bar-track">
                                <div className="resupply-bar-fill" style={{ width: `${resupplyProgress}%` }}></div>
                            </div>
                            <div className="resupply-pct">{Math.round(resupplyProgress)}%</div>
                        </div>
                    )}

                    {/* ── Mobile Touch Buttons ── */}
                    {isMobile && (
                        <div className="mobile-controls">
                            <button
                                className="mobile-action-btn fire-btn"
                                onTouchStart={(e) => {
                                    e.preventDefault();
                                    if (window.gameEngine?.weaponSystem) {
                                        window.gameEngine.weaponSystem.isMouseDown = true;
                                        window.gameEngine.weaponSystem.shoot();
                                    }
                                }}
                                onTouchEnd={(e) => {
                                    e.preventDefault();
                                    if (window.gameEngine?.weaponSystem) {
                                        window.gameEngine.weaponSystem.isMouseDown = false;
                                    }
                                }}
                            >
                                🔫
                            </button>
                            <button
                                className="mobile-action-btn aim-btn"
                                onTouchStart={(e) => {
                                    e.preventDefault();
                                    setIsScoping(true);
                                    if (window.gameEngine?.weaponSystem?.currentWeapon?.setAiming) {
                                        window.gameEngine.weaponSystem.isAiming = true;
                                        window.gameEngine.weaponSystem.currentWeapon.setAiming(true);
                                    }
                                }}
                                onTouchEnd={(e) => {
                                    e.preventDefault();
                                    setIsScoping(false);
                                    if (window.gameEngine?.weaponSystem?.currentWeapon?.setAiming) {
                                        window.gameEngine.weaponSystem.isAiming = false;
                                        window.gameEngine.weaponSystem.currentWeapon.setAiming(false);
                                    }
                                }}
                            >
                                🎯
                            </button>
                            <button
                                className="mobile-action-btn reload-btn"
                                onTouchStart={(e) => {
                                    e.preventDefault();
                                    if (window.gameEngine?.weaponSystem) {
                                        window.gameEngine.weaponSystem.reload();
                                        window.gameEngine.weaponSystem.grenadesLeft = window.gameEngine.weaponSystem.maxGrenades;
                                        if (window.gameEngine.weaponSystem.onGrenadeChange) {
                                            window.gameEngine.weaponSystem.onGrenadeChange(window.gameEngine.weaponSystem.grenadesLeft);
                                        }
                                    }
                                }}
                            >
                                ↻
                            </button>
                            <button
                                className="mobile-action-btn jump-btn"
                                onTouchStart={(e) => {
                                    e.preventDefault();
                                    if (window.gameEngine?.localPlayer?.controls) {
                                        window.gameEngine.localPlayer.controls.keys.space = true;
                                    }
                                }}
                                onTouchEnd={(e) => {
                                    e.preventDefault();
                                    if (window.gameEngine?.localPlayer?.controls) {
                                        window.gameEngine.localPlayer.controls.keys.space = false;
                                    }
                                }}
                            >
                                ⬆
                            </button>
                            <button
                                className="mobile-action-btn grenade-btn"
                                onTouchStart={(e) => {
                                    e.preventDefault();
                                    if (window.gameEngine?.weaponSystem) {
                                        window.gameEngine.weaponSystem.throwGrenade();
                                    }
                                }}
                            >
                                💣
                            </button>
                        </div>
                    )}
                </div>
            )}
            {/* ───────── GAME OVER SCREEN ───────── */}
            {screen === 'gameover' && (
                <div className="lobby-wrapper game-over-screen">
                    <div className="lobby-bg">
                        <div className="scanlines"></div>
                        <div className="vignette" style={{ background: 'radial-gradient(circle, transparent 20%, rgba(0,0,0,0.9) 100%)' }}></div>
                    </div>

                    <div className="lobby-center">
                        <div className="game-logo">
                            <div className="logo-tag" style={{ color: '#ff9800' }}>OPERATION CONCLUDED</div>
                            <h1 className="logo-title">MISSION END</h1>
                            <div className="logo-subtitle">RECAPITULATION OF ENGAGEMENT</div>
                        </div>

                        <div className="winner-announcement">
                            <div className="winner-label">TOP OPERATOR</div>
                            <div className="winner-name">{winnerData?.winnerName}</div>
                            <div className="winner-sub">TOTAL ELIMINATIONS: 20</div>
                        </div>

                        <div className="mil-card stats-card">
                            <div className="mil-card-header">FINAL INTEL</div>
                            <div className="final-stats-grid">
                                <div className="final-stat">
                                    <span className="fs-label">YOUR KILLS</span>
                                    <span className="fs-val">{kills}</span>
                                </div>
                                <div className="final-stat">
                                    <span className="fs-label">YOUR DEATHS</span>
                                    <span className="fs-val">{deaths}</span>
                                </div>
                                <div className="final-stat">
                                    <span className="fs-label">FINAL K/D</span>
                                    <span className="fs-val">{kd}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mil-buttons">
                            <button className="mil-btn mil-btn-primary" onClick={() => {
                                // Simple re-match: re-join the same room
                                setScreen('playing');
                                setKills(0);
                                setDeaths(0);
                                setHealth(100);
                                // The server will reset the player state on respawn/re-join logic
                                // However, for a clean sweep, we might want to tell the server.
                                // For now, let's keep it simple as requested.
                            }}>
                                <span className="btn-icon">↺</span>
                                <span>RE-MATCH</span>
                            </button>
                            <button className="mil-btn mil-btn-secondary" onClick={() => {
                                gameEngine.cleanup();
                                window.location.reload(); // Hard reset for exit
                            }}>
                                <span className="btn-icon">✖</span>
                                <span>EXIT TO MAIN</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
