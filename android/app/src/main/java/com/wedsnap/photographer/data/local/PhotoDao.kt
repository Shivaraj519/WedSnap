package com.wedsnap.photographer.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface PhotoDao {
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(photo: PhotoEntity): Long

    @Query("SELECT * FROM photo_queue WHERE uploadStatus = 'PENDING' OR uploadStatus = 'FAILED' ORDER BY captureTimestamp ASC")
    suspend fun getPendingPhotos(): List<PhotoEntity>

    @Query("SELECT COUNT(*) FROM photo_queue WHERE uploadStatus = 'COMPLETED'")
    fun getCompletedCountFlow(): Flow<Int>

    @Query("SELECT COUNT(*) FROM photo_queue WHERE uploadStatus = 'PENDING' OR uploadStatus = 'UPLOADING'")
    fun getPendingCountFlow(): Flow<Int>

    @Query("UPDATE photo_queue SET uploadStatus = :status, errorMessage = :error WHERE uri = :uri")
    suspend fun updateStatus(uri: String, status: UploadStatus, error: String? = null)

    @Query("SELECT * FROM photo_queue WHERE checksum = :checksum LIMIT 1")
    suspend fun findByChecksum(checksum: String): PhotoEntity?

    @Query("DELETE FROM photo_queue WHERE uploadStatus = 'COMPLETED'")
    suspend fun clearCompleted()

    @Query("DELETE FROM photo_queue WHERE uploadStatus != 'COMPLETED'")
    suspend fun clearPendingQueue()

    @Query("DELETE FROM photo_queue WHERE uri = :uri")
    suspend fun deleteByUri(uri: String)

    @Query("DELETE FROM photo_queue")
    suspend fun clearAll()
}
