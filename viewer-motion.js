// Exact critically damped spring: preserves position and velocity when retargeted.
export function springTo(state, target, dt, speed = 13, immediate = false) {
  if (immediate || (Math.abs(state.value - target) < 0.0001 && Math.abs(state.velocity) < 0.0001)) {
    const changed = state.value !== target || state.velocity !== 0;
    state.value = target;
    state.velocity = 0;
    return changed;
  }
  const offset = state.value - target;
  const impulse = state.velocity + speed * offset;
  const decay = Math.exp(-speed * dt);
  state.value = target + (offset + impulse * dt) * decay;
  state.velocity = (state.velocity - speed * impulse * dt) * decay;
  return true;
}

export const assemblyOffsets = {
  battery: [0, 1.65, 0], wiring: [0, .9, 0], gps: [-.4, .9, 0],
  radio: [.4, .9, 0], fc: [0, .75, .55], power: [0, .1, 0],
  becpi: [-.9, .7, 0], becfc: [.9, .7, 0], pi: [0, -.8, 0],
  cooling: [0, -1.55, 0], camera: [0, -2.1, .5], props: [0, 1, 0]
};
