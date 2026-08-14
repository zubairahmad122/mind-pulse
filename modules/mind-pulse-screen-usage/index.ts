// Local Expo module: native Android bridge to android.app.usage.UsageStatsManager
// (Usage Access permission state, "Screen Time Today", and the current/last
// continuous screen session).
//
// The native module is consumed through the service layer in
// `src/services/screenUsageService.ts` via `requireOptionalNativeModule('MindPulseScreenUsage')`,
// so this file only documents the module and triggers autolinking.
export {};
