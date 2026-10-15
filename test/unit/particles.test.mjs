import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createParticleSystem } from '../../src/js/particles.js';

test('createParticleSystem initializes empty and spawns particles on line clear', () => {
    const sys = createParticleSystem();
    assert.equal(sys.particles.length, 0);
    assert.equal(sys.shockwaves.length, 0);
    assert.equal(sys.dropBeams.length, 0);

    sys.spawnLineClear(19, [1, 2, 3, 4, 5, 6, 7, 1, 2, 3], 10);
    assert.ok(sys.particles.length > 0);
    const initialLife = sys.particles[0].life;
    sys.update(0.1);
    assert.ok(sys.particles[0].life < initialLife);

    sys.update(1.0); // should expire
    assert.equal(sys.particles.length, 0);
});

test('spawnSpecialBurst creates particles and a shockwave ring', () => {
    const sys = createParticleSystem();
    sys.spawnSpecialBurst(5, 10, '#FF6A3D', 20);
    assert.equal(sys.shockwaves.length, 1);
    assert.equal(sys.particles.length, 20);

    const initialRadius = sys.shockwaves[0].radius;
    sys.update(0.1);
    assert.ok(sys.shockwaves[0].radius > initialRadius); // shockwave expanded

    sys.clear();
    assert.equal(sys.particles.length, 0);
    assert.equal(sys.shockwaves.length, 0);
    assert.equal(sys.dropBeams.length, 0);
});

test('spawnDropBeams and spawnGroundImpact add beams and impact sparks', () => {
    const sys = createParticleSystem();
    sys.spawnDropBeams([3, 4, 5], 2, 18, '#00F0FF');
    assert.equal(sys.dropBeams.length, 3);
    assert.equal(sys.dropBeams[0].x, 3);
    assert.equal(sys.dropBeams[0].startY, 2);
    assert.equal(sys.dropBeams[0].endY, 18);

    sys.spawnGroundImpact([{x: 3, y: 18}, {x: 4, y: 18}], '#00F0FF');
    assert.ok(sys.particles.length >= 4);

    sys.update(0.1);
    assert.ok(sys.dropBeams[0].life < 0.18);

    sys.update(0.3);
    assert.equal(sys.dropBeams.length, 0);
});

test('particle draw does not throw on canvas context', () => {
    const sys = createParticleSystem();
    sys.spawnSpecialBurst(5, 10);
    sys.spawnDropBeams([4, 5], 0, 15);
    const fakeCtx = {
        save() {},
        restore() {},
        fillRect() {},
        beginPath() {},
        arc() {},
        stroke() {},
        set strokeStyle(v) {},
        set fillStyle(v) {},
        set globalAlpha(v) {},
        set lineWidth(v) {},
    };
    assert.doesNotThrow(() => sys.draw(fakeCtx));
});
