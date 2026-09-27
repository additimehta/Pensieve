import React, { useEffect, useRef } from 'react';
import "../pensieve.css";

const N = 92;
const ITERATIONS = 10;
const DT = 0.58;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const index = (x, y) => x + y * N;

function sample(field, x, y) {
    x = clamp(x, 0.5, N - 1.5);
    y = clamp(y, 0.5, N - 1.5);

    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;
    const sx = x - x0;
    const sy = y - y0;

    const a = field[index(x0, y0)] * (1 - sx) + field[index(x1, y0)] * sx;
    const b = field[index(x0, y1)] * (1 - sx) + field[index(x1, y1)] * sx;

    return a * (1 - sy) + b * sy;
}

function insideBowl(x, y) {
    const nx = (x / (N - 1)) * 2 - 1;
    const ny = (y / (N - 1)) * 2 - 1;
    return nx * nx + ny * ny <= 0.97 * 0.97;
}

function setBoundary(field, damping = 0.96) {
    for (let y = 0; y < N; y += 1) {
        for (let x = 0; x < N; x += 1) {
            if (!insideBowl(x, y)) {
                field[index(x, y)] = 0;
                continue;
            }

            const nx = (x / (N - 1)) * 2 - 1;
            const ny = (y / (N - 1)) * 2 - 1;
            const r = Math.hypot(nx, ny);

            if (r > 0.90) {
                field[index(x, y)] *= damping;
            }
        }
    }
}

function project(u, v, pressure, divergence) {
    for (let y = 1; y < N - 1; y += 1) {
        for (let x = 1; x < N - 1; x += 1) {
            const i = index(x, y);

            if (!insideBowl(x, y)) {
                divergence[i] = 0;
                pressure[i] = 0;
                continue;
            }

            divergence[i] = -0.5 * (
                u[index(x + 1, y)] - u[index(x - 1, y)] +
                v[index(x, y + 1)] - v[index(x, y - 1)]
            ) / N;

            pressure[i] = 0;
        }
    }

    for (let k = 0; k < ITERATIONS; k += 1) {
        for (let y = 1; y < N - 1; y += 1) {
            for (let x = 1; x < N - 1; x += 1) {
                if (!insideBowl(x, y)) continue;

                const i = index(x, y);
                pressure[i] = (
                    divergence[i] +
                    pressure[index(x - 1, y)] +
                    pressure[index(x + 1, y)] +
                    pressure[index(x, y - 1)] +
                    pressure[index(x, y + 1)]
                ) * 0.25;
            }
        }
    }

    for (let y = 1; y < N - 1; y += 1) {
        for (let x = 1; x < N - 1; x += 1) {
            if (!insideBowl(x, y)) continue;

            const i = index(x, y);
            u[i] -= 0.5 * N * (
                pressure[index(x + 1, y)] - pressure[index(x - 1, y)]
            );
            v[i] -= 0.5 * N * (
                pressure[index(x, y + 1)] - pressure[index(x, y - 1)]
            );
        }
    }

    setBoundary(u, 0.78);
    setBoundary(v, 0.78);
}

function advect(target, source, u, v, decay = 1) {
    for (let y = 1; y < N - 1; y += 1) {
        for (let x = 1; x < N - 1; x += 1) {
            const i = index(x, y);

            if (!insideBowl(x, y)) {
                target[i] = 0;
                continue;
            }

            const backX = x - DT * u[i] * N;
            const backY = y - DT * v[i] * N;
            target[i] = sample(source, backX, backY) * decay;
        }
    }

    setBoundary(target);
}

function seedLiquid(dye) {
    for (let y = 0; y < N; y += 1) {
        for (let x = 0; x < N; x += 1) {
            const i = index(x, y);

            if (!insideBowl(x, y)) {
                dye[i] = 0;
                continue;
            }

            const nx = (x / (N - 1)) * 2 - 1;
            const ny = (y / (N - 1)) * 2 - 1;
            const radius = Math.hypot(nx, ny);
            const angle = Math.atan2(ny, nx);

            const cloudy =
                0.34 +
                Math.sin(angle * 3.2 + radius * 10) * 0.11 +
                Math.sin(nx * 7 - ny * 5) * 0.08 +
                Math.cos(nx * 4 + ny * 8) * 0.07;

            dye[i] = clamp(cloudy * (1 - radius * 0.25), 0.04, 0.72);
        }
    }
}

export default function Bowl() {
    const canvasRef = useRef(null);
    const pointerRef = useRef({
        active: false,
        x: 0,
        y: 0,
        lastX: 0,
        lastY: 0,
        dx: 0,
        dy: 0,
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d", { alpha: false });
        const simulationCanvas = document.createElement("canvas");
        simulationCanvas.width = N;
        simulationCanvas.height = N;
        const simulationCtx = simulationCanvas.getContext("2d");
        const image = simulationCtx.createImageData(N, N);

        let u = new Float32Array(N * N);
        let v = new Float32Array(N * N);
        let uPrev = new Float32Array(N * N);
        let vPrev = new Float32Array(N * N);
        let dye = new Float32Array(N * N);
        let dyePrev = new Float32Array(N * N);
        const pressure = new Float32Array(N * N);
        const divergence = new Float32Array(N * N);

        seedLiquid(dye);

        let frame = 0;
        let running = true;

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.max(1, Math.floor(rect.width * dpr));
            canvas.height = Math.max(1, Math.floor(rect.height * dpr));
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.imageSmoothingEnabled = true;
        };

        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(canvas);

        const injectCursor = () => {
            const pointer = pointerRef.current;
            if (!pointer.active) return;

            const gx = ((pointer.x + 1) * 0.5) * (N - 1);
            const gy = ((pointer.y + 1) * 0.5) * (N - 1);
            const radius = 8;
            const speed = Math.hypot(pointer.dx, pointer.dy);
            const force = Math.min(2.4, speed * 18);

            for (let y = Math.max(1, Math.floor(gy - radius)); y <= Math.min(N - 2, Math.ceil(gy + radius)); y += 1) {
                for (let x = Math.max(1, Math.floor(gx - radius)); x <= Math.min(N - 2, Math.ceil(gx + radius)); x += 1) {
                    if (!insideBowl(x, y)) continue;

                    const dx = x - gx;
                    const dy = y - gy;
                    const distance = Math.hypot(dx, dy);
                    if (distance > radius) continue;

                    const falloff = Math.pow(1 - distance / radius, 2);
                    const i = index(x, y);

                    u[i] += pointer.dx * force * falloff;
                    v[i] += pointer.dy * force * falloff;

                    if (distance > 0.001) {
                        const swirl = force * 0.018 * falloff;
                        u[i] += (-dy / distance) * swirl;
                        v[i] += (dx / distance) * swirl;
                    }

                    dye[i] = clamp(dye[i] + 0.10 * falloff, 0, 1);
                }
            }

            pointer.dx *= 0.72;
            pointer.dy *= 0.72;
        };

        const addAmbientFlow = (time) => {
            const t = time * 0.001;

            for (let y = 2; y < N - 2; y += 1) {
                for (let x = 2; x < N - 2; x += 1) {
                    if (!insideBowl(x, y)) continue;

                    const nx = (x / (N - 1)) * 2 - 1;
                    const ny = (y / (N - 1)) * 2 - 1;
                    const r = Math.hypot(nx, ny) + 0.001;
                    const i = index(x, y);

                    const rotation = 0.00036 * (1 - r * 0.5);
                    u[i] += (-ny / r) * rotation;
                    v[i] += (nx / r) * rotation;

                    u[i] += Math.sin(t * 0.35 + ny * 4.5) * 0.000025;
                    v[i] += Math.cos(t * 0.32 + nx * 4.5) * 0.000025;
                }
            }
        };

        const render = () => {
            const data = image.data;

            for (let y = 0; y < N; y += 1) {
                for (let x = 0; x < N; x += 1) {
                    const i = index(x, y);
                    const p = i * 4;

                    if (!insideBowl(x, y)) {
                        data[p] = 2;
                        data[p + 1] = 7;
                        data[p + 2] = 9;
                        data[p + 3] = 255;
                        continue;
                    }

                    const nx = (x / (N - 1)) * 2 - 1;
                    const ny = (y / (N - 1)) * 2 - 1;
                    const radial = Math.hypot(nx, ny);
                    const value = clamp(dye[i], 0, 1);
                    const edgeDarken = clamp(1 - Math.max(0, radial - 0.64) * 1.9, 0.32, 1);

                    const deepR = 7;
                    const deepG = 31;
                    const deepB = 37;

                    const silverR = 168;
                    const silverG = 211;
                    const silverB = 209;

                    const mix = Math.pow(value, 1.35) * 0.88;
                    const highlight = Math.max(0, 1 - Math.hypot(nx + 0.18, ny + 0.22) * 2.1) * 18;

                    data[p] = clamp((deepR + (silverR - deepR) * mix + highlight) * edgeDarken, 0, 255);
                    data[p + 1] = clamp((deepG + (silverG - deepG) * mix + highlight) * edgeDarken, 0, 255);
                    data[p + 2] = clamp((deepB + (silverB - deepB) * mix + highlight) * edgeDarken, 0, 255);
                    data[p + 3] = 255;
                }
            }

            simulationCtx.putImageData(image, 0, 0);

            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            ctx.clearRect(0, 0, width, height);

            ctx.save();
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, Math.min(width, height) * 0.5, 0, Math.PI * 2);
            ctx.clip();

            ctx.drawImage(simulationCanvas, 0, 0, width, height);

            const glow = ctx.createRadialGradient(
                width * 0.42,
                height * 0.38,
                0,
                width * 0.5,
                height * 0.5,
                width * 0.48
            );
            glow.addColorStop(0, "rgba(215, 239, 236, 0.11)");
            glow.addColorStop(0.52, "rgba(74, 151, 158, 0.035)");
            glow.addColorStop(1, "rgba(0, 0, 0, 0.28)");
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, width, height);

            ctx.restore();
        };

        const step = (time) => {
            if (!running) return;

            addAmbientFlow(time);
            injectCursor();

            [uPrev, u] = [u, uPrev];
            [vPrev, v] = [v, vPrev];

            advect(u, uPrev, uPrev, vPrev, 0.994);
            advect(v, vPrev, uPrev, vPrev, 0.994);
            project(u, v, pressure, divergence);

            [dyePrev, dye] = [dye, dyePrev];
            advect(dye, dyePrev, u, v, 0.9992);

            // Very light diffusion keeps the surface cloudy rather than pixel-sharp.
            for (let y = 1; y < N - 1; y += 1) {
                for (let x = 1; x < N - 1; x += 1) {
                    if (!insideBowl(x, y)) continue;

                    const i = index(x, y);
                    dye[i] = (
                        dye[i] * 0.90 +
                        dye[index(x - 1, y)] * 0.025 +
                        dye[index(x + 1, y)] * 0.025 +
                        dye[index(x, y - 1)] * 0.025 +
                        dye[index(x, y + 1)] * 0.025
                    );
                }
            }

            render();
            frame = requestAnimationFrame(step);
        };

        frame = requestAnimationFrame(step);

        return () => {
            running = false;
            cancelAnimationFrame(frame);
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

        pointer.dx = x - pointer.lastX;
        pointer.dy = y - pointer.lastY;
        pointer.lastX = x;
        pointer.lastY = y;
        pointer.x = x;
        pointer.y = y;
        pointer.active = x * x + y * y <= 1;
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
        pointer.dx = 0;
        pointer.dy = 0;
        pointer.active = x * x + y * y <= 1;
    };

    const leaveSurface = () => {
        pointerRef.current.active = false;
        pointerRef.current.dx = 0;
        pointerRef.current.dy = 0;
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
