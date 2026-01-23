import React, { useEffect, useMemo, useRef, useState } from 'react';
import "../pensieve.css";

const random = (min, max) => Math.random() * (max - min) + min;

export default function MemoryView({ onBack, memories }) {
    const [showOrbs, setShowOrbs] = useState(false);
    const [selected, setSelected] = useState(null);
    const positionsRef = useRef(new Map());

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.code === 'Space') setShowOrbs(true);
            if (e.code === 'Escape') {
                setSelected(null);
            }
        };
        const onKeyUp = (e) => {
            if (e.code === 'Space') setShowOrbs(false);
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }, []);

    const orbs = useMemo(() => {
        return (memories || []).map((mem) => {
            if (!positionsRef.current.has(mem.id)) {
                positionsRef.current.set(mem.id, {
                    left: `${random(8, 92)}%`,
                    top: `${random(8, 92)}%`,
                    delay: `${random(0, 4)}s`,
                    duration: `${random(10, 18)}s`,
                    scale: random(0.9, 1.6),
                });
            }
            return { ...mem, ...positionsRef.current.get(mem.id) };
        });
    }, [memories]);

    return (
        <div className="memory-view fade-in">
            {showOrbs && orbs.map((orb) => (
                <div
                    key={orb.id}
                    className="orb"
                    style={{
                        left: orb.left,
                        top: orb.top,
                        animationDelay: orb.delay,
                        animationDuration: orb.duration,
                        transform: `scale(${orb.scale})`,
                    }}
                    onClick={() => setSelected(orb)}
                />
            ))}

            <div className="memory-hints">
                <div className="memory-hint">Hold <strong>SPACE</strong> to reveal memories</div>
            </div>

            {selected && (
                <div className="memory-popup-backdrop" onClick={() => setSelected(null)}>
                    <div className="memory-popup" onClick={(e) => e.stopPropagation()}>
                        <div className="memory-popup-title">{selected.title}</div>
                        <div className="memory-popup-text">{selected.text}</div>
                        <button className="memory-popup-close" onClick={() => setSelected(null)}>Close</button>
                    </div>
                </div>
            )}

            <button className="close-btn" onClick={onBack}>
                Surface
            </button>
        </div>
    );
}
