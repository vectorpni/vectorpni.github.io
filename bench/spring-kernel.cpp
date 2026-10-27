#include <cmath>
#include <emscripten/emscripten.h>

// One JS -> WASM call for the full animation-state array.
// Layout per state: value, velocity, target, speed (all doubles).
extern "C" EMSCRIPTEN_KEEPALIVE void step_batch(double* data, int count, double dt) {
  for (int i = 0; i < count; ++i) {
    double* state = data + i * 4;
    const double offset = state[0] - state[2];
    if (std::abs(offset) < 0.0001 && std::abs(state[1]) < 0.0001) {
      state[0] = state[2]; state[1] = 0; continue;
    }
    const double impulse = state[1] + state[3] * offset;
    const double decay = std::exp(-state[3] * dt);
    state[0] = state[2] + (offset + impulse * dt) * decay;
    state[1] = (state[1] - state[3] * impulse * dt) * decay;
  }
}
