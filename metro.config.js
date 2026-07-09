// Sentry's Expo metro config (source maps for readable stack traces) wrapped
// with NativeWind — both extend the default Expo config.
const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withNativeWind } = require("nativewind/metro");

const config = getSentryExpoConfig(__dirname);

module.exports = withNativeWind(config, { input: "./src/app/global.css" });
