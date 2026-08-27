const { withAppBuildGradle } = require("@expo/config-plugins");

// APK builds (dev client / preview / local `assembleRelease`) otherwise ship
// one universal binary containing arm64-v8a + armeabi-v7a + x86 + x86_64 native
// libs, ~3-4x bigger than what any single device needs. This restricts APK
// output to arm64-v8a only (covers the overwhelming majority of Android
// devices in active use). Google Play app bundles (`bundleRelease`, used by
// the EAS "production" profile) ignore `splits` entirely and keep shipping
// per-device optimized splits via Play, so production is unaffected.
const SPLIT_BLOCK = `
    splits {
        abi {
            enable true
            reset()
            include "arm64-v8a"
            universalApk false
        }
    }
`;

module.exports = function withAbiSplit(config) {
  return withAppBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.contents.includes("splits {")) {
      return modConfig;
    }
    modConfig.modResults.contents = modConfig.modResults.contents.replace(
      /android\s*\{/,
      (match) => `${match}\n${SPLIT_BLOCK}`,
    );
    return modConfig;
  });
};
