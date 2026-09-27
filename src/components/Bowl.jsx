import React, { useEffect, useRef } from 'react';
import "../pensieve.css";

export default function Bowl() {
    const containerRef = useRef(null);
    const rafRef = useRef(0);
    const targetRef = useRef({ x: 0, y: 0 });
    const currentRef = useRef({ x: 0, y: 0 });

    const animate = () => {
        const el = containerRef.current;
        if (!el) return;

        // Smooth the motion so it feels like liquid inertia.
        currentRef.current.x += (targetRef.current.x - currentRef.current.x) * 0.08;
        currentRef.current.y += (targetRef.current.y - currentRef.current.y) * 0.08;

        el.style.setProperty('--mx', `${currentRef.current.x.toFixed(4)}`);
        el.style.setProperty('--my', `${currentRef.current.y.toFixed(4)}`);

        rafRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        rafRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onMouseMove = (e) => {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / (rect.width / 2);
        const dy = (e.clientY - cy) / (rect.height / 2);
        // Clamp to [-1, 1]
        targetRef.current.x = Math.max(-1, Math.min(1, dx));
        targetRef.current.y = Math.max(-1, Math.min(1, dy));
    };

    const onMouseLeave = () => {
        targetRef.current.x = 0;
        targetRef.current.y = 0;
    };

    return (
        <div
            ref={containerRef}
            className="bowl-container"
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
        >
            {/* Stone/Metal Rim with Runes */}
            <div className="bowl-rim">
                <div className="runes-ring" />
            </div>

            {/* The Liquid Contents */}
            <div className="bowl-liquid">

                {/* SVG Filter for the "Smoke/Liquid" effect */}
                <svg className="liquid-filter-def" width="0" height="0">
                    <defs>
                        <filter id="liquidSmoke" x="-20%" y="-20%" width="140%" height="140%">
                            {/* Generate noise */}
                            <feTurbulence
                                type="fractalNoise"
                                baseFrequency="0.02"
                                numOctaves="4"
                                result="noise"
                            >
                                <animate
                                    attributeName="baseFrequency"
                                    dur="18s"
                                    values="0.02;0.008;0.02"
                                    repeatCount="indefinite"
                                />
                            </feTurbulence>

                            {/* Displace the source graphic (swirls) with the noise */}
                            <feDisplacementMap
                                in="SourceGraphic"
                                in2="noise"
                                scale="85"
                                xChannelSelector="R"
                                yChannelSelector="G"
                            />

                            {/* Add some glow/blur */}
                            <feGaussianBlur stdDeviation="1.25" result="blurred" />
                            <feColorMatrix
                                type="matrix"
                                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
                                result="goo"
                            />
                            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                        </filter>

                        {/* A second silvery shimmer filter */}
                        <filter id="silverSheen">
                            <feTurbulence
                                type="turbulence"
                                baseFrequency="0.05"
                                numOctaves="2"
                                result="noise"
                            />
                            <feColorMatrix
                                type="saturate"
                                values="0"
                                result="grayNoise"
                            />
                            <feComponentTransfer>
                                <feFuncA type="linear" slope="0.5" />
                            </feComponentTransfer>
                        </filter>
                    </defs>
                </svg>

                <div className="liquid-surface">
                    <div className="swirl swirl-a" />
                    <div className="swirl swirl-b" />
                    <div className="swirl swirl-c" />
                    <div className="swirl swirl-d" />
                    <div className="silver-veil veil-a" />
                    <div className="silver-veil veil-b" />
                    <div className="liquid-highlight" />
                </div>

                <div className="bowl-glow" />
            </div>
        </div>
    );
}
