# Optional technology benchmark (not part of the website bundle)

Start `npm.cmd run dev -- --port 5174` and open `/bench/math.html`.
In the browser, run `await runVectorMathBenchmark()` for JavaScript.
The dataset uses the real spring function: 1 assembly, 16 highlights, 6 camera
coordinates. All 23 states change in this deliberately pessimistic workload.

If Emscripten is installed, from the project root build the optional C++ kernel:

```powershell
emcc bench/spring-kernel.cpp -O3 --no-entry -sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=web -sEXPORTED_FUNCTIONS=_step_batch,_malloc,_free -sEXPORTED_RUNTIME_METHODS=HEAPF64 -o bench/spring-kernel.js
```

Then run `await runVectorMathBenchmark({wasm:true})` in the same browser/context.
The harness checks numerical parity first, reuses linear memory, batches all
23 states into one call, includes target updates, and frees the allocation.
Run neither implementation with a debugger or simultaneous application load.
This is a math microbenchmark, **not** a measurement of application FPS.

Emscripten and .NET wasm-tools are absent in the current environment. The C++
source and harness are prepared; no WASM speedup or application-level WASM
result has been measured. C# / Blazor is intentionally not prototyped because
the measured bottleneck is draw submission, not a managed computation kernel.
Neither WASM nor .NET runtime is imported by the production application.
