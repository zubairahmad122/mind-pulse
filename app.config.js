// Dynamic Expo config. Loads everything from app.json (passed in as `config`)
// and overrides:
// - the google-services file location, so EAS can inject it from the
//   GOOGLE_SERVICES_JSON file secret at build time, while local/dev builds
//   keep using the committed-locally ./google-services.json.
// - the AdMob app IDs, read from env so the real IDs aren't hardcoded into
//   committed app.json. Falls back to Google's public test app IDs so local
//   builds without the env vars set still produce a working (test-ads) app.
const ADMOB_TEST_ANDROID_APP_ID = "ca-app-pub-3940256099942544~3347511713";
const ADMOB_TEST_IOS_APP_ID = "ca-app-pub-3940256099942544~1458002511";

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? config.android?.googleServicesFile,
  },
  plugins: [
    ...(config.plugins ?? []),
    [
      "react-native-google-mobile-ads",
      {
        androidAppId: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID ?? ADMOB_TEST_ANDROID_APP_ID,
        iosAppId: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID ?? ADMOB_TEST_IOS_APP_ID,
      },
    ],
  ],
});
