import React, { useEffect, useRef } from 'react';
import "../pensieve.css";

const PARTICLE_COUNT = 430;

function makeParticle() {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * 0.92;

    return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        px: Math.cos(angle) * radius,
        py: Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        size: 0.45 + Math.random() * 1.5,
        alpha: 0.08 + Math.random() * 0.22,
        phase: Math.random() * Math.PI * 2,
    };
}

export default function Bowl() {
    const canvasRef = useRef(null);
    const particlesRef = useRef([]);
    const pointerRef = useRef({
        x: 0,
        y: 0,
        lastX: 0,
        lastY: 0,
        vx: 0,
        vy: 0,
        active: false,
    });
    const frameRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        particlesRef.current = Array.from({ length: PARTICLE_COUNT }, makeParticle);

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.max(1, Math.floor(rect.width * dpr));
            canvas.height = Math.max(1, Math.floor(rect.height * dpr));
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(canvas);

        const draw = (time) => {
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            const cx = width / 2;
            const cy = height / 2;
            const radius = Math.min(width, height) * 0.5;

            // Slowly repaint the base so previous strokes linger like disturbed liquid.
            ctx.globalCompositeOperation = "source-over";
            ctx.fillStyle = "rgba(4, 13, 16, 0.16)";
            ctx.fillRect(0, 0, width, height);

            const water = ctx.createRadialGradient(
                cx - radius * 0.12,
                cy - radius * 0.16,
                radius * 0.03,
                cx,
                cy,
                radius
            );
            water.addColorStop(0, "rgba(151, 207, 211, 0.10)");
            water.addColorStop(0.26, "rgba(48, 111, 120, 0.09)");
            water.addColorStop(0.68, "rgba(17, 55, 63, 0.10)");
            water.addColorStop(1, "rgba(2, 11, 14, 0.34)");
            ctx.fillStyle = water;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();

            const pointer = pointerRef.current;
            const particles = particlesRef.current;
            const timeSeconds = time * 0.001;

            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, radius * 0.965, 0, Math.PI * 2);
            ctx.clip();
            ctx.globalCompositeOperation = "screen";

            for (let i = 0; i < particles.length; i += 1) {
                const p = particles[i];

                p.px = p.x;
                p.py = p.y;

                // Gentle natural circulation keeps the liquid alive when untouched.
                const centerDistance = Math.hypot(p.x, p.y) + 0.001;
                const ambient = 0.00012 + (1 - centerDistance) * 0.00018;
                p.vx += (-p.y / centerDistance) * ambient;
                p.vy += (p.x / centerDistance) * ambient;

                // Tiny drifting turbulence so the surface never forms perfect rings.
                p.vx += Math.sin(timeSeconds * 0.7 + p.phase + p.y * 5) * 0.00008;
                p.vy += Math.cos(timeSeconds * 0.65 + p.phase + p.x * 5) * 0.00008;

                if (pointer.active) {
                    const dx = p.x - pointer.x;
                    const dy = p.y - pointer.y;
                    const distance = Math.hypot(dx, dy);
                    const influenceRadius = 0.58;

                    if (distance < influenceRadius) {
                        const influence = Math.pow(1 - distance / influenceRadius, 2);
                        const speed = Math.hypot(pointer.vx, pointer.vy);

                        // The cursor physically drags nearby liquid.
                        p.vx += pointer.vx * 0.15 * influence;
                        p.vy += pointer.vy * 0.15 * influence;

                        // Motion also creates a vortex around the cursor.
                        if (distance > 0.015 && speed > 0.001) {
                            const direction =
                                Math.sign(pointer.vx * dy - pointer.vy * dx) || 1;
                            const vortex = Math.min(speed * 0.10, 0.012) * influence * direction;

                            p.vx += (-dy / distance) * vortex;
                            p.vy += (dx / distance) * vortex;
                        }
                    }
                }

                p.vx *= 0.982;
                p.vy *= 0.982;
                p.x += p.vx;
                p.y += p.vy;

                const distFromCenter = Math.hypot(p.x, p.y);
                if (distFromCenter > 0.94) {
                    const nx = p.x / distFromCenter;
                    const ny = p.y / distFromCenter;
                    p.x = nx * 0.94;
                    p.y = ny * 0.94;

                    const outwardVelocity = p.vx * nx + p.vy * ny;
                    if (outwardVelocity > 0) {
                        p.vx -= outwardVelocity * nx * 1.7;
                        p.vy -= outwardVelocity * ny * 1.7;
                    }
                }

                const x1 = cx + p.px * radius;
                const y1 = cy + p.py * radius;
                const x2 = cx + p.x * radius;
                const y2 = cy + p.y * radius;

                const speed = Math.hypot(p.vx, p.vy);
                const brightness = Math.min(0.48, p.alpha + speed * 9);

                ctx.strokeStyle = `rgba(176, 224, 226, ${brightness})`;
                ctx.lineWidth = p.size + Math.min(speed * 65, 2.3);
                ctx.lineCap = "round";
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();

                // A few particles form soft cloudy patches like the film surface.
                if (i % 22 === 0) {
                    const glowRadius = 10 + p.size * 7 + speed * 120;
                    const cloud = ctx.createRadialGradient(
                        x2,
                        y2,
                        0,
                        x2,
                        y2,
                        glowRadius
                    );
                    cloud.addColorStop(0, `rgba(199, 231, 230, ${brightness * 0.22})`);
                    cloud.addColorStop(1, "rgba(80, 151, 158, 0)");
                    ctx.fillStyle = cloud;
                    ctx.beginPath();
                    ctx.arc(x2, y2, glowRadius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            ctx.restore();

            pointer.vx *= 0.80;
            pointer.vy *= 0.80;

            frameRef.current = requestAnimationFrame(draw);
        };

        frameRef.current = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(frameRef.current);
            observer.disconnect();
        };
    }, []);

    const updatePointer = (event) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
        const pointer = pointerRef.current;

        pointer.vx = x - pointer.lastX;
        pointer.vy = y - pointer.lastY;
        pointer.lastX = x;
        pointer.lastY = y;
        pointer.x = x;
        pointer.y = y;
        pointer.active = Math.hypot(x, y) <= 1;
    };

    const enterSurface = (event) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
        const pointer = pointerRef.current;

        pointer.x = x;
        pointer.y = y;
        pointer.lastX = x;
        pointer.lastY = y;
        pointer.vx = 0;
        pointer.vy = 0;
        pointer.active = Math.hypot(x, y) <= 1;
    };

    const leaveSurface = () => {
        pointerRef.current.active = false;
        pointerRef.current.vx = 0;
        pointerRef.current.vy = 0;
    };

    return (
        <div className="bowl-container">
            <div className="bowl-rim">
                <div className="bowl-inner-rim">
                    <canvas
                        ref={canvasRef}
                        className="pensieve-liquid"
                        onPointerEnter={enterSurface}
                        onPointerMove={updatePointer}
                        onPointerLeave={leaveSurface}
                    />
                    <div className="surface-sheen" />
                </div>
            </div>
        </div>
    );
}
