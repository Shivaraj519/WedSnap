package com.wedsnap.photographer.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

enum class UploadStatus {
    PENDING,
    UPLOADING,
    COMPLETED,
    FAILED
}

@Entity(tableName = "photo_queue")
data class PhotoEntity(
    @PrimaryKey
    val uri: String,
    val filename: String,
    val checksum: String,
    val fileSize: Long,
    val captureTimestamp: Long,
    val uploadStatus: UploadStatus = UploadStatus.PENDING,
    val retryCount: Int = 0,
    val errorMessage: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)
