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
]);
