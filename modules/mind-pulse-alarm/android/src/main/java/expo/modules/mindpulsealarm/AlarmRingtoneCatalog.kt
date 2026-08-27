package expo.modules.mindpulsealarm

object AlarmRingtoneCatalog {
  const val DEFAULT_RINGTONE_ID = "morning-alarm"
  const val LEGACY_FALLBACK_RAW_RESOURCE = "alarm"

  private val ringtoneRawResources = linkedMapOf(
    "morning-alarm" to "morning_alarm",
    "gentle-chime" to "gentle_chime",
    "peaceful-morning" to "peaceful_morning",
    "wind-chime" to "wind_chime",
    "night-bells" to "night_bells",
    "soft-ringtone" to "soft_ringtone",
    "classic-ring" to "classic_ring",
    "marimba-melody" to "marimba_melody",
    "marimba-pulse" to "marimba_pulse",
    "digital-pulse" to "digital_pulse",
    "energy-pulse" to "energy_pulse",
    "sharp-alert" to "sharp_alert",
    "urgent-alarm" to "urgent_alarm",
    "classic-siren" to "classic_siren",
  )

  fun rawResourceNameFor(ringtoneId: String?): String? {
    val normalized = normalizeRingtoneId(ringtoneId) ?: return null
    return ringtoneRawResources[normalized]
      ?: ringtoneRawResources.entries.firstOrNull { it.value == normalized }?.value
  }

  fun scheduleLogResourceName(ringtoneId: String?): String {
    return rawResourceNameFor(ringtoneId) ?: LEGACY_FALLBACK_RAW_RESOURCE
  }

  fun supportedIds(): Set<String> = ringtoneRawResources.keys

  private fun normalizeRingtoneId(ringtoneId: String?): String? {
    return ringtoneId
      ?.lowercase()
      ?.replace(Regex("[^a-z0-9_-]+"), "-")
      ?.trim('-', '_')
      ?.takeIf { it.isNotBlank() }
  }
}
