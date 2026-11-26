package com.wedsnap.photographer.utils

import android.content.Context
import android.net.Uri
import java.security.MessageDigest

object ChecksumUtils {
    fun calculateSha256(context: Context, uri: Uri): String {
        val digest = MessageDigest.getInstance("SHA-256")
        context.contentResolver.openInputStream(uri)?.use { stream ->
            val buffer = ByteArray(8192)
            var bytesRead: Int
            while (stream.read(buffer).also { bytesRead = it } != -1) {
                digest.update(buffer, 0, bytesRead)
            }
        } ?: return ""

        return digest.digest().joinToString("") { "%02x".format(it) }
    }
}
