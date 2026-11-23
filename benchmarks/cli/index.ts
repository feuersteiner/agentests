/** The harness is not built: say so and fail, so this is never mistaken for a completed run. */
console.error('Error: the benchmark harness is not built yet; nothing was run.');
console.error('See benchmarks/README.md for the method and its status.');
process.exitCode = 1;
