// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Engine purity boundary.
    //
    // `src/engine/core/**` is the pure-TypeScript simulation layer: game
    // rules, entities, scoring, timing. It must stay loadable in a plain
    // Node test with no renderer, no React and no native modules attached —
    // that is what makes a session assertable without rendering it, and what
    // lets a second renderer (the Phase 5 three.js spike) be swapped in
    // without touching gameplay code.
    //
    // If you need platform capability inside core, add a port under
    // `core/ports/` and implement it in `src/engine/adapters/`.
    files: ["src/engine/core/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [
          { name: "react", message: "engine/core must stay pure — use a port in core/ports." },
          { name: "react-native", message: "engine/core must stay pure — use a port in core/ports." },
          { name: "react-native-reanimated", message: "engine/core must stay pure — renderer concern." },
          { name: "react-native-gesture-handler", message: "engine/core must stay pure — feed it via InputManager." },
          { name: "@shopify/react-native-skia", message: "engine/core must stay renderer-agnostic — emit a RenderFrame." },
          { name: "three", message: "engine/core must stay renderer-agnostic — emit a RenderFrame." },
          { name: "@react-native-async-storage/async-storage", message: "engine/core must stay pure — use the SessionSink port." },
        ],
        patterns: [
          { group: ["expo", "expo-*", "@expo/*"], message: "engine/core must stay pure — use a port in core/ports." },
          { group: ["@react-native-firebase/*"], message: "engine/core must stay pure — use the SessionSink port." },
          {
            group: ["@/services/*", "@/hooks/*", "@/stores/*", "@/components/*", "@/screens/*"],
            message: "engine/core must not depend on app layers — invert it with a port.",
          },
        ],
      }],
    },
  },
  {
    // Gameplay purity boundary.
    //
    // `src/features/eyeArcade/**` holds game *rules* — beats, route logic,
    // damage, scoring, and the draw pass that turns state into a
    // `RenderFrame`. Same contract as `engine/core`, one level up: a whole
    // encounter must be playable in a plain Node test with no renderer and
    // no React attached, which is exactly what
    // `cometCommand/__tests__/encounter.test.ts` does.
    //
    // The engine itself is fair game to import (that is the point); React,
    // Skia and Expo are not. Screens live in `src/screens/`, and platform
    // capability arrives through `engine/core/ports/`.
    files: ["src/features/eyeArcade/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [
          { name: "react", message: "gameplay must stay pure — the shell lives in src/screens." },
          { name: "react-native", message: "gameplay must stay pure — the shell lives in src/screens." },
          { name: "react-native-reanimated", message: "gameplay must stay pure — renderer concern." },
          { name: "react-native-gesture-handler", message: "gameplay must stay pure — feed it via InputManager." },
          { name: "@shopify/react-native-skia", message: "gameplay must stay renderer-agnostic — emit a RenderFrame." },
        ],
        patterns: [
          { group: ["expo", "expo-*", "@expo/*"], message: "gameplay must stay pure — use a port in engine/core/ports." },
          {
            group: ["@/engine/renderers/*", "@/components/*", "@/screens/*", "@/hooks/*"],
            message: "gameplay must not depend on the renderer or the app shell.",
          },
        ],
      }],
    },
  },
]);
