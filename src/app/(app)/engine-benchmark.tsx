/**
 * Dev-only route: /engine-benchmark
 *
 * Deliberately not linked from any user-facing screen and not present in the
 * Eye tab's activity metadata — it is reached by typing the path in a dev
 * build. It never writes a score or touches session persistence.
 */
export { default } from '@/screens/dev/EngineBenchmarkScreen';
