import { PIECE_COLORS } from './constants.js';

const MAX_PARTICLES = 120;
const DEFAULT_GRAVITY = 10;

export function createParticleSystem() {
    let particles = [];
    let shockwaves = [];
    let dropBeams = [];

    function spawnLineClear(y, rowValues = [], cols = 10) {
        const length = rowValues.length || cols;
        for (let x = 0; x < length; x++) {
            const val = rowValues[x] || 7;
            const color = PIECE_COLORS[val] || '#FF6A3D';
            const count = 3;
            for (let i = 0; i < count; i++) {
                if (particles.length >= MAX_PARTICLES) break;
                const angle = Math.random() * Math.PI * 2;
                const speed = 1.5 + Math.random() * 3.5;
                particles.push({
                    x: x + 0.5,
                    y: y + 0.5,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 1.5,
                    color,
                    size: 0.1 + Math.random() * 0.14,
                    life: 0.35 + Math.random() * 0.25,
                    maxLife: 0.6,
                    gravity: DEFAULT_GRAVITY,
                });
            }
        }
    }

    function spawnSpecialBurst(centerX, centerY, color = '#FF6A3D', count = 24) {
        shockwaves.push({
            x: centerX,
            y: centerY,
            radius: 0.2,
            maxRadius: 4.5,
            color,
            life: 0.4,
            maxLife: 0.4,
        });

        const numParticles = Math.min(count, MAX_PARTICLES - particles.length);
        for (let i = 0; i < numParticles; i++) {
            const angle = (i / numParticles) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
            const speed = 2.0 + Math.random() * 4.5;
            particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color,
                size: 0.12 + Math.random() * 0.16,
                life: 0.4 + Math.random() * 0.3,
                maxLife: 0.7,
                gravity: DEFAULT_GRAVITY * 0.5,
            });
        }
    }

    function spawnDropBeams(columns = [], startY = 0, endY = 0, color = '#FF6A3D') {
        if (!columns || columns.length === 0 || endY <= startY) return;
        for (const col of columns) {
            dropBeams.push({
                x: col,
                startY,
                endY,
                color,
                life: 0.18,
                maxLife: 0.18,
            });
        }
    }

    function spawnGroundImpact(cells = [], color = '#FF6A3D') {
        if (!cells || cells.length === 0) return;
        for (const cell of cells) {
            const count = 2;
            for (let i = 0; i < count; i++) {
                if (particles.length >= MAX_PARTICLES) break;
                const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
                const speed = 1.6 + Math.random() * 2.8;
                particles.push({
                    x: cell.x + 0.5,
                    y: cell.y + 0.8,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    color,
                    size: 0.08 + Math.random() * 0.1,
                    life: 0.22 + Math.random() * 0.15,
                    maxLife: 0.37,
                    gravity: DEFAULT_GRAVITY * 1.2,
                });
            }
        }
    }

    function update(deltaSeconds) {
        if (!deltaSeconds || deltaSeconds <= 0) return;

        for (const p of particles) {
            p.x += p.vx * deltaSeconds;
            p.y += p.vy * deltaSeconds;
            p.vy += p.gravity * deltaSeconds;
            p.life -= deltaSeconds;
        }
        particles = particles.filter(p => p.life > 0);

        for (const w of shockwaves) {
            w.life -= deltaSeconds;
            w.radius = w.maxRadius * (1 - Math.max(0, w.life / w.maxLife));
        }
        shockwaves = shockwaves.filter(w => w.life > 0);

        for (const b of dropBeams) {
            b.life -= deltaSeconds;
        }
        dropBeams = dropBeams.filter(b => b.life > 0);
    }

    function draw(ctx) {
        if (particles.length === 0 && shockwaves.length === 0 && dropBeams.length === 0) return;

        ctx.save();

        for (const b of dropBeams) {
            const t = Math.max(0, Math.min(1, b.life / b.maxLife));
            const height = Math.max(0.1, b.endY - b.startY);
            ctx.globalAlpha = t * 0.28;
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x + 0.05, b.startY, 0.9, height);

            ctx.globalAlpha = t * 0.65;
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(b.x + 0.36, b.startY, 0.28, height);
        }

        for (const p of particles) {
            const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }

        for (const w of shockwaves) {
            const alpha = Math.max(0, Math.min(1, w.life / w.maxLife));
            ctx.globalAlpha = alpha * 0.7;
            ctx.strokeStyle = w.color;
            ctx.lineWidth = 0.12;
            if (typeof ctx.beginPath === 'function') {
                ctx.beginPath();
                ctx.arc(w.x, w.y, Math.max(0.01, w.radius), 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    function clear() {
        particles = [];
        shockwaves = [];
        dropBeams = [];
    }

    return {
        spawnLineClear,
        spawnSpecialBurst,
        spawnDropBeams,
        spawnGroundImpact,
        update,
        draw,
        clear,
        get particles() { return particles; },
        get shockwaves() { return shockwaves; },
        get dropBeams() { return dropBeams; },
    };
}
