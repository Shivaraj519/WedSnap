package com.wedsnap.photographer.service

import android.app.*
import android.content.ContentUris
import android.content.Intent
import android.database.ContentObserver
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.MediaStore
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.work.*
import com.wedsnap.photographer.MainActivity
import com.wedsnap.photographer.data.local.PhotoEntity
import com.wedsnap.photographer.data.local.WedSnapDatabase
import com.wedsnap.photographer.utils.ChecksumUtils
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MediaObserverService : Service() {

    private val serviceScope = CoroutineScope(Dispatchers.IO)
    private var contentObserver: ContentObserver? = null
    private var sessionActivationTimestamp: Long = 0L

    override fun onCreate() {
        super.onCreate()
        // Record baseline timestamp so existing camera roll photos are NOT uploaded
        sessionActivationTimestamp = System.currentTimeMillis() / 1000L
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, createNotification("Monitoring camera for new photos..."))
        registerMediaObserver()
    }

    private fun registerMediaObserver() {
        val db = WedSnapDatabase.getDatabase(applicationContext)

        contentObserver = object : ContentObserver(Handler(Looper.getMainLooper())) {
            override fun onChange(selfChange: Boolean, uri: Uri?) {
                super.onChange(selfChange, uri)
                scanNewPhotos(db)
            }
        }

        contentResolver.registerContentObserver(
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
            true,
            contentObserver!!
        )
        Log.i("WedSnapService", "MediaObserver registered. Baseline timestamp: $sessionActivationTimestamp")
    }

    private fun scanNewPhotos(db: WedSnapDatabase) {
        serviceScope.launch {
            val projection = arrayOf(
                MediaStore.Images.Media._ID,
                MediaStore.Images.Media.DISPLAY_NAME,
                MediaStore.Images.Media.SIZE,
                MediaStore.Images.Media.DATE_ADDED
            )
            // Query only photos taken AFTER session activation
            val selection = "${MediaStore.Images.Media.DATE_ADDED} >= ?"
            val selectionArgs = arrayOf(sessionActivationTimestamp.toString())
            val sortOrder = "${MediaStore.Images.Media.DATE_ADDED} ASC"

            contentResolver.query(
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                projection,
                selection,
                selectionArgs,
                sortOrder
            )?.use { cursor ->
                val idCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
                val nameCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME)
                val sizeCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.SIZE)
                val dateCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED)

                var newFound = false
                while (cursor.moveToNext()) {
                    val id = cursor.getLong(idCol)
                    val name = cursor.getString(nameCol) ?: "camera_photo.jpg"
                    val size = cursor.getLong(sizeCol)
                    val dateAdded = cursor.getLong(dateCol)

                    val contentUri = ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id)
                    val checksum = ChecksumUtils.calculateSha256(applicationContext, contentUri)

                    if (checksum.isNotBlank()) {
                        val photo = PhotoEntity(
                            uri = contentUri.toString(),
                            filename = name,
                            checksum = checksum,
                            fileSize = size,
                            captureTimestamp = dateAdded * 1000L
                        )
                        val rowId = db.photoDao().insert(photo)
                        if (rowId != -1L) {
                            newFound = true
                            Log.i("WedSnapService", "Detected new wedding capture: $name ($size bytes)")
                        }
                    }
                }

                if (newFound) {
                    triggerUploadWorker()
                }
            }
        }
    }

    private fun triggerUploadWorker() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val uploadWork = OneTimeWorkRequestBuilder<PhotoUploadWorker>()
            .setConstraints(constraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, java.util.concurrent.TimeUnit.SECONDS)
            .build()

        WorkManager.getInstance(applicationContext).enqueueUniqueWork(
            "WedSnapPhotoUpload",
            ExistingWorkPolicy.APPEND_OR_REPLACE,
            uploadWork
        )
    }

    private fun createNotification(statusText: String): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("WedSnap Photographer Sync")
            .setContentText(statusText)
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "WedSnap Photo Synchronization",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        contentObserver?.let { contentResolver.unregisterContentObserver(it) }
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        const val CHANNEL_ID = "wedsnap_sync_channel"
        const val NOTIFICATION_ID = 1001
    }
}
