const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("@expo/config-plugins");

const ALARM_RINGTONES = [
  ["assets/sounds/alarms/morning-alarm.mp3", "morning_alarm.mp3"],
  ["assets/sounds/alarms/gentle-chime.mp3", "gentle_chime.mp3"],
  ["assets/sounds/alarms/peaceful-morning.mp3", "peaceful_morning.mp3"],
  ["assets/sounds/alarms/wind-chime.mp3", "wind_chime.mp3"],
  ["assets/sounds/alarms/night-bells.mp3", "night_bells.mp3"],
  ["assets/sounds/alarms/soft-ringtone.mp3", "soft_ringtone.mp3"],
  ["assets/sounds/alarms/classic-ring.mp3", "classic_ring.mp3"],
  ["assets/sounds/alarms/marimba-melody.mp3", "marimba_melody.mp3"],
  ["assets/sounds/alarms/marimba-pulse.mp3", "marimba_pulse.mp3"],
  ["assets/sounds/alarms/digital-pulse.mp3", "digital_pulse.mp3"],
  ["assets/sounds/alarms/energy-pulse.mp3", "energy_pulse.mp3"],
  ["assets/sounds/alarms/sharp-alert.mp3", "sharp_alert.mp3"],
  ["assets/sounds/alarms/urgent-alarm.mp3", "urgent_alarm.mp3"],
  ["assets/sounds/alarms/classic-siren.mp3", "classic_siren.mp3"],
];

module.exports = function withAlarmRingtones(config) {
  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const rawDir = path.join(projectRoot, "android", "app", "src", "main", "res", "raw");
      fs.mkdirSync(rawDir, { recursive: true });

      for (const [source, resourceName] of ALARM_RINGTONES) {
        fs.copyFileSync(
          path.join(projectRoot, source),
          path.join(rawDir, resourceName),
        );
      }

      return modConfig;
    },
  ]);
};
