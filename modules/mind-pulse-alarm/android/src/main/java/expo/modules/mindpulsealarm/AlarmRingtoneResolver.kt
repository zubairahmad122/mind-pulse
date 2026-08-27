package expo.modules.mindpulsealarm

import android.content.Context
import android.media.RingtoneManager
import android.net.Uri

data class AlarmRingtoneResolution(
  val selectedRingtone: String?,
  val resolvedResourceName: String?,
  val resolvedResourceId: Int,
  val resolvedUri: Uri?,
  val fallbackUsed: Boolean,
  val fallbackReason: String?,
)

object AlarmRingtoneResolver {
  fun resolve(context: Context, ringtoneId: String?): AlarmRingtoneResolution {
    val selectedResource = AlarmRingtoneCatalog.rawResourceNameFor(ringtoneId)
    if (selectedResource != null) {
      val selectedId = context.resources.getIdentifier(selectedResource, "raw", context.packageName)
      if (selectedId != 0) {
        return AlarmRingtoneResolution(
          selectedRingtone = ringtoneId,
          resolvedResourceName = selectedResource,
          resolvedResourceId = selectedId,
          resolvedUri = resourceUri(context, selectedResource),
          fallbackUsed = false,
          fallbackReason = null,
        )
      }
      return fallback(context, ringtoneId, "selected resource missing: $selectedResource")
    }

    return fallback(
      context,
      ringtoneId,
      if (ringtoneId.isNullOrBlank()) "missing ringtone id" else "unknown ringtone id",
    )
  }

  private fun fallback(
    context: Context,
    ringtoneId: String?,
    reason: String,
  ): AlarmRingtoneResolution {
    val defaultResource = AlarmRingtoneCatalog.rawResourceNameFor(AlarmRingtoneCatalog.DEFAULT_RINGTONE_ID)
    if (defaultResource != null) {
      val defaultId = context.resources.getIdentifier(defaultResource, "raw", context.packageName)
      if (defaultId != 0) {
        return AlarmRingtoneResolution(
          selectedRingtone = ringtoneId,
          resolvedResourceName = defaultResource,
          resolvedResourceId = defaultId,
          resolvedUri = resourceUri(context, defaultResource),
          fallbackUsed = true,
          fallbackReason = reason,
        )
      }
    }

    val legacyResource = AlarmRingtoneCatalog.LEGACY_FALLBACK_RAW_RESOURCE
    val legacyId = context.resources.getIdentifier(legacyResource, "raw", context.packageName)
    if (legacyId != 0) {
      return AlarmRingtoneResolution(
        selectedRingtone = ringtoneId,
        resolvedResourceName = legacyResource,
        resolvedResourceId = legacyId,
        resolvedUri = resourceUri(context, legacyResource),
        fallbackUsed = true,
        fallbackReason = "$reason; default resource missing",
      )
    }

    return AlarmRingtoneResolution(
      selectedRingtone = ringtoneId,
      resolvedResourceName = null,
      resolvedResourceId = 0,
      resolvedUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
        ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
        ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
      fallbackUsed = true,
      fallbackReason = "$reason; bundled fallback resources missing",
    )
  }

  private fun resourceUri(context: Context, resourceName: String): Uri {
    return Uri.parse("android.resource://${context.packageName}/raw/$resourceName")
  }
}
