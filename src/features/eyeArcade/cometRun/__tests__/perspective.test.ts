import { createPerspective, nearness, project, scaleAt } from '../perspective';

const view = createPerspective(1080, 2000);

describe('perspective', () => {
  it('is full scale at the near plane and shrinks with depth', () => {
    expect(scaleAt(view, 0)).toBeCloseTo(1, 6);
    expect(scaleAt(view, view.depth)).toBeCloseTo(0.5, 6);
    expect(scaleAt(view, view.farZ)).toBeLessThan(0.07);
    expect(scaleAt(view, view.farZ)).toBeGreaterThan(0);
  });

  it('converges everything on the vanishing point with distance', () => {
    const near = project(view, view.halfWidth, view.halfHeight, 0);
    const nearX = near.x;
    const nearY = near.y;
    const far = project(view, view.halfWidth, view.halfHeight, view.farZ);

    expect(Math.abs(far.x - view.vanishX)).toBeLessThan(Math.abs(nearX - view.vanishX));
    expect(Math.abs(far.y - view.vanishY)).toBeLessThan(Math.abs(nearY - view.vanishY));
  });

  it('places a world-origin object on the near plane at the play line', () => {
    const at = project(view, 0, 0, 0);
    expect(at.x).toBeCloseTo(view.vanishX, 6);
    expect(at.y).toBeCloseTo(view.nearY, 6);
  });

  it('grows an approaching object monotonically', () => {
    let previous = 0;
    for (let z = view.farZ; z >= 0; z -= 500) {
      const k = scaleAt(view, z);
      expect(k).toBeGreaterThan(previous);
      previous = k;
    }
  });

  it('never mirrors an object that has passed the camera', () => {
    // A negative scale would flip a sprite through the vanishing point,
    // which looks like a rendering fault rather than a passed obstacle.
    expect(scaleAt(view, -view.depth)).toBe(0);
    expect(scaleAt(view, -100_000)).toBe(0);
  });

  it('reports nearness as 0 at the horizon and 1 at the near plane', () => {
    expect(nearness(view, view.farZ)).toBeCloseTo(0, 6);
    expect(nearness(view, 0)).toBeCloseTo(1, 6);
    expect(nearness(view, view.depth)).toBeGreaterThan(0);
    expect(nearness(view, view.depth)).toBeLessThan(1);
  });

  it('keeps the corridor inside the frame at the near plane', () => {
    const left = project(view, -view.halfWidth, 0, 0);
    expect(left.x).toBeGreaterThanOrEqual(0);
    const right = project(view, view.halfWidth, 0, 0);
    expect(right.x).toBeLessThanOrEqual(1080);
  });
});
