import { useEffect, useRef, useState, useCallback } from 'react';
import { CubeScene } from './cube/CubeScene';
import { isSolved, MoveType } from './cube/CubeState';

const SCRAMBLE_MOVES: MoveType[] = ['U', "U'", 'D', "D'", 'F', "F'", 'B', "B'", 'L', "L'", 'R', "R'"];

const MOVE_GROUPS = [
  { label: 'Up / Down', moves: ['U', "U'", 'D', "D'"] as MoveType[] },
  { label: 'Front / Back', moves: ['F', "F'", 'B', "B'"] as MoveType[] },
  { label: 'Left / Right', moves: ['L', "L'", 'R', "R'"] as MoveType[] },
  { label: 'Middle Slices', moves: ['M', "M'", 'E', "E'", 'S', "S'"] as MoveType[] },
];

// Force Panel Component
function ForcePanel({ 
  isOpen, 
  onClose, 
  cubeScene, 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  cubeScene: CubeScene | null; 
}) {
  if (!isOpen) return null;

  const [forceEnabled, setForceEnabled] = useState(false);
  const [forceSnapshotExists, setForceSnapshotExists] = useState(false);
  const [status, setStatus] = useState<string>('');

  // Sync with cubeScene armed state on mount
  useEffect(() => {
    if (cubeScene) {
      setForceEnabled(cubeScene.isForceModeArmed());
      setForceSnapshotExists(!!cubeScene.getForceSnapshot());
    }
  }, [cubeScene]);

  const handleSetSnapshot = () => {
    if (!cubeScene) return;
    cubeScene.setForceSnapshot();
    setForceSnapshotExists(true);
    setStatus('Force Cube SNAPSHOT stored (exact copy of current cube)');
  };

  const handleClear = () => {
    if (!cubeScene) return;
    cubeScene.setForceSnapshot(); // This will clear if we pass null, but let's check
    // Actually we need a clear method - let's just set to null internally
    (cubeScene as any).forceSnapshot = null;
    setForceSnapshotExists(false);
    setStatus('Force Cube cleared');
  };

const handleToggleForce = () => {
    if (!cubeScene) return;
    cubeScene.toggleForceModeArmed();
    setForceEnabled(cubeScene.isForceModeArmed());
    setStatus(cubeScene.isForceModeArmed() ? 'Force mode ARMED' : 'Force mode DISARMED');
  };

  const handleTestForce = () => {
    if (!cubeScene || !forceSnapshotExists) return;
    cubeScene.activateForceMode();
    setStatus('Force ACTIVATED - rotate cube to see hidden faces transform');
  };

  return (
    <div className="force-panel-overlay" onClick={onClose}>
      <div className="force-panel" onClick={e => e.stopPropagation()}>
        <div className="force-panel-header">
          <h2>🔮 Force Mode (Secret)</h2>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="force-panel-content">
          <label className="force-checkbox">
            <input 
              type="checkbox" 
              checked={forceEnabled} 
              onChange={handleToggleForce} 
              disabled={!forceSnapshotExists}
            />
            <span>Force Mode Enabled</span>
            {!forceSnapshotExists && <span className="force-warning">(Snapshot cube first)</span>}
          </label>

          <div className="force-buttons">
            <button onClick={handleSetSnapshot} className="force-btn">
              Snapshot Force Cube (Exact Copy)
            </button>
            <button onClick={handleClear} className="force-btn force-btn-danger">
              Clear Force Cube
            </button>
            <button onClick={handleTestForce} className="force-btn force-btn-test" disabled={!forceSnapshotExists || forceEnabled}>
              Test Force (Rotate Cube)
            </button>
          </div>

          {status && <div className="force-status">{status}</div>}

          <div className="force-hint">
            <p><strong>How it works:</strong> Tap FORCE button in toolbar, then rotate hidden faces away</p>
            <p>Hidden faces → force state when rotated out of view</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const cubeSceneRef = useRef<CubeScene | null>(null);
  const [solved, setSolved] = useState(true);
  const [moveCount, setMoveCount] = useState(0);
  const [showMoves, setShowMoves] = useState(false);
  const [scrambling, setScrambling] = useState(false);
  const [solving, setSolving] = useState(false);
  const [showSolvedBanner, setShowSolvedBanner] = useState(false);
  const [showForcePanel, setShowForcePanel] = useState(false);
  const [forceActive, setForceActive] = useState(false);
  const [forceArmed, setForceArmed] = useState(false);
  const scrambleRef = useRef(false);
  const solveRef = useRef(false);
  const titlePressTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const scene = new CubeScene(mountRef.current);
    cubeSceneRef.current = scene;
    scene.setOnStateChange((state) => {
      const s = isSolved(state);
      setSolved(s);
      if (s) {
        setShowSolvedBanner(true);
        setTimeout(() => setShowSolvedBanner(false), 3000);
      }
    });
    scene.onForceActiveChange = setForceActive;
    scene.onForceArmedChange = setForceArmed;
    return () => { scene.destroy(); cubeSceneRef.current = null; };
  }, []);

  const handleScramble = useCallback(() => {
    if (!cubeSceneRef.current || scrambling || solving) return;
    solveRef.current = false;
    setSolving(false);
    setScrambling(true);
    scrambleRef.current = true;
    setMoveCount(0);
    setSolved(false);
    setShowSolvedBanner(false);
    cubeSceneRef.current.clearHistory();
    const total = 20;
    let count = 0;
    let lastFace = '';
    const next = () => {
      if (count >= total || !scrambleRef.current) {
        setScrambling(false);
        scrambleRef.current = false;
        return;
      }
      let move: MoveType;
      do { move = SCRAMBLE_MOVES[Math.floor(Math.random() * SCRAMBLE_MOVES.length)]; } while (move[0] === lastFace);
      lastFace = move[0];
      cubeSceneRef.current?.executeMove(move);
      count++;
      setMoveCount(count);
      setTimeout(next, 90);
    };
    next();
  }, [scrambling, solving]);

  const handleSolve = useCallback(() => {
    if (!cubeSceneRef.current || scrambling || solving || solved) return;
    const sequence = cubeSceneRef.current.getSolveSequence();
    if (sequence.length === 0) return;
    setSolving(true);
    solveRef.current = true;
    let index = 0;
    const next = () => {
      if (index >= sequence.length || !solveRef.current) {
        setSolving(false);
        solveRef.current = false;
        return;
      }
      cubeSceneRef.current?.executeSolveMove(sequence[index]);
      index++;
      setMoveCount(prev => prev + 1);
      setTimeout(next, 220);
    };
    next();
  }, [scrambling, solving, solved]);

  const handleReset = useCallback(() => {
    if (!cubeSceneRef.current) return;
    scrambleRef.current = false;
    solveRef.current = false;
    setScrambling(false);
    setSolving(false);
    cubeSceneRef.current.reset();
    cubeSceneRef.current.resetRotation();
    setMoveCount(0);
    setSolved(true);
    setShowSolvedBanner(false);
  }, []);

  const handleMove = useCallback((move: MoveType) => {
    if (!cubeSceneRef.current) return;
    cubeSceneRef.current.executeMove(move);
    setMoveCount(prev => prev + 1);
    setSolved(false);
  }, []);

  const busy = scrambling || solving;

  const handleForceTrigger = useCallback(() => {
    if (!cubeSceneRef.current) return;
    if (cubeSceneRef.current.isForceModeActive()) {
      cubeSceneRef.current.deactivateForceMode();
    } else {
      cubeSceneRef.current.activateForceMode();
    }
  }, []);

  // Title long press handlers
  const onTitleMouseDown = () => {
    titlePressTimer.current = window.setTimeout(() => {
      setShowForcePanel(true);
    }, 3000);
  };

  const onTitleMouseUp = () => {
    if (titlePressTimer.current) {
      clearTimeout(titlePressTimer.current);
      titlePressTimer.current = null;
    }
  };

  return (
    <div className="app-root">
      {/* ── Top bar ── */}
      <header className="topbar">
        <button className="topbar-icon" onClick={() => setShowMoves(v => !v)} aria-label="Menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <span 
          className="topbar-title" 
          onMouseDown={onTitleMouseDown}
          onMouseUp={onTitleMouseUp}
          onMouseLeave={onTitleMouseUp}
          onTouchStart={onTitleMouseDown}
          onTouchEnd={onTitleMouseUp}
        >
          CUBEMIX
        </span>
        <div className="topbar-stats">
          <div className="stat">
            <span className="stat-num">{moveCount}</span>
            <span className="stat-lbl">moves</span>
          </div>
          <div className={`status-dot ${solved ? 'dot-solved' : 'dot-unsolved'}`} />
        </div>
      </header>

      {/* ── Solved overlay ── */}
      {showSolvedBanner && (
        <div className="solved-toast">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          <span>Solved!</span>
        </div>
      )}

      {/* ── Cube ── */}
      <div className="cube-area">
        <div ref={mountRef} className="canvas-wrap" style={{ touchAction: 'none' }} />
      </div>

      {/* ── Force Active Indicator ── */}
      {forceActive && <div className="force-dot" />}

      {/* ── Bottom toolbar ── */}
      <nav className="toolbar">
        <button className={`tool ${scrambling ? 'active' : ''}`} onClick={handleScramble} disabled={busy}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
          <span>{scrambling ? 'Mixing…' : 'Scramble'}</span>
        </button>
        <button className={`tool tool-primary ${solving ? 'active' : ''}`} onClick={handleSolve} disabled={busy || solved}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          <span>{solving ? 'Solving…' : 'Solve'}</span>
        </button>
        <button className="tool" onClick={handleReset}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          <span>Reset</span>
        </button>
        {forceArmed && (
          <button className={`tool ${forceActive ? 'tool-force active' : ''}`} onClick={handleForceTrigger}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
            <span>{forceActive ? 'FORCE ON' : 'FORCE'}</span>
          </button>
        )}
      </nav>

      {/* ── Moves drawer ── */}
      {showMoves && (
        <>
          <div className="overlay" onClick={() => setShowMoves(false)} />
          <aside className="drawer">
            <div className="drawer-head">
              <h2>Moves</h2>
              <button className="drawer-close" onClick={() => setShowMoves(false)}>✕</button>
            </div>
            {MOVE_GROUPS.map(g => (
              <div key={g.label} className="move-section">
                <p className="move-section-title">{g.label}</p>
                <div className="move-grid">
                  {g.moves.map(m => (
                    <button key={m} className="move-chip" onClick={() => handleMove(m)}>{m}</button>
                  ))}
                </div>
              </div>
            ))}
          </aside>
        </>
      )}

      {/* ── Force Panel ── */}
      <ForcePanel 
        isOpen={showForcePanel} 
        onClose={() => setShowForcePanel(false)}
        cubeScene={cubeSceneRef.current}
      />
    </div>
  );
}