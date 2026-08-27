package expo.modules.mindpulsealarm

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AlarmRingtoneCatalogTest {
  @Test
  fun `maps every selectable sleep ringtone id to its packaged raw resource`() {
    val expected = mapOf(
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

    assertEquals(expected.keys, AlarmRingtoneCatalog.supportedIds())
    expected.forEach { (ringtoneId, rawResource) ->
      assertEquals(rawResource, AlarmRingtoneCatalog.rawResourceNameFor(ringtoneId))
    }
  }

  @Test
  fun `accepts legacy raw resource names for persisted snooze or restore state`() {
    assertEquals("gentle_chime", AlarmRingtoneCatalog.rawResourceNameFor("gentle_chime"))
    assertEquals("classic_siren", AlarmRingtoneCatalog.rawResourceNameFor("classic_siren"))
  }

  @Test
  fun `unknown ringtone id has no selected resource and reports legacy fallback for schedule logs`() {
    assertNull(AlarmRingtoneCatalog.rawResourceNameFor("not-a-real-tone"))
    assertEquals(
      AlarmRingtoneCatalog.LEGACY_FALLBACK_RAW_RESOURCE,
      AlarmRingtoneCatalog.scheduleLogResourceName("not-a-real-tone"),
    )
  }

  @Test
  fun `blank ringtone id has no selected resource and reports legacy fallback for schedule logs`() {
    assertNull(AlarmRingtoneCatalog.rawResourceNameFor(""))
    assertNull(AlarmRingtoneCatalog.rawResourceNameFor(null))
    assertEquals(
      AlarmRingtoneCatalog.LEGACY_FALLBACK_RAW_RESOURCE,
      AlarmRingtoneCatalog.scheduleLogResourceName(null),
    )
  }

  @Test
  fun `default ringtone is a selectable bundled ringtone`() {
    assertTrue(AlarmRingtoneCatalog.supportedIds().contains(AlarmRingtoneCatalog.DEFAULT_RINGTONE_ID))
    assertEquals("morning_alarm", AlarmRingtoneCatalog.rawResourceNameFor(AlarmRingtoneCatalog.DEFAULT_RINGTONE_ID))
  }
}
