const { withProjectBuildGradle } = require("expo/config-plugins");

// react-native-google-mobile-ads >=16.4 pulls play-services-ads 25.4+, which
// ships Kotlin 2.3 metadata. Expo SDK 56 / RN 0.85 still compile with Kotlin
// 2.1, so :react-native-google-mobile-ads:compileDebugKotlin fails. Pin to
// 25.0.0 (the SDK used by ads 16.3.4) until the app can move to Kotlin 2.3.
const FORCE_BLOCK = `
  configurations.all {
    resolutionStrategy {
      force "com.google.android.gms:play-services-ads:25.0.0"
    }
  }
`;

module.exports = function withPlayServicesAdsPin(config) {
  return withProjectBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.contents.includes("play-services-ads:25.0.0")) {
      return modConfig;
    }
    modConfig.modResults.contents = modConfig.modResults.contents.replace(
      /allprojects\s*\{/,
      (match) => `${match}\n${FORCE_BLOCK}`,
    );
    return modConfig;
  });
};
