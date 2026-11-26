package com.wedsnap.photographer.service

import android.content.Context
import android.net.Uri
import android.preference.PreferenceManager
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.wedsnap.photographer.data.local.UploadStatus
import com.wedsnap.photographer.data.local.WedSnapDatabase
import com.wedsnap.photographer.data.remote.CheckDuplicateRequest
import com.wedsnap.photographer.data.remote.WedSnapApiService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.RequestBody.Companion.toRequestBody
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.io.InputStream
import java.util.concurrent.TimeUnit

class PhotoUploadWorker(
    private val appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    private val db = WedSnapDatabase.getDatabase(appContext)

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val prefs = androidx.preference.PreferenceManager.getDefaultSharedPreferences(appContext)
        val serverUrl = prefs.getString("server_url", "http://10.0.2.2:8000/") ?: "http://10.0.2.2:8000/"
        val deviceToken = prefs.getString("device_token", "") ?: ""
        val weddingSlug = prefs.getString("wedding_slug", "") ?: ""

        if (deviceToken.isBlank() || weddingSlug.isBlank()) {
            Log.w("WedSnapWorker", "Missing pairing credentials. Worker deferred.")
            return@withContext Result.failure()
        }

        val okHttpClient = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(90, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .build()

        val normalizedUrl = if (serverUrl.endsWith("/")) serverUrl else "$serverUrl/"

        val apiService = try {
            Retrofit.Builder()
                .baseUrl(normalizedUrl)
                .client(okHttpClient)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
                .create(WedSnapApiService::class.java)
        } catch (e: Exception) {
            Log.e("WedSnapWorker", "Invalid base URL: $serverUrl", e)
            return@withContext Result.retry()
        }

        val pending = db.photoDao().getPendingPhotos()
        var allSucceeded = true

        for (photo in pending) {
            try {
                db.photoDao().updateStatus(photo.uri, UploadStatus.UPLOADING)

                // 1. Check duplicate
                val dupResp = apiService.checkDuplicate(
                    deviceToken = deviceToken,
                    request = CheckDuplicateRequest(wedding_id = weddingSlug, checksum = photo.checksum)
                )

                if (dupResp.isSuccessful && dupResp.body()?.exists == true) {
                    db.photoDao().updateStatus(photo.uri, UploadStatus.COMPLETED)
                    continue
                }

                // 2. Read bytes and upload original file
                val uri = Uri.parse(photo.uri)
                val stream: InputStream? = appContext.contentResolver.openInputStream(uri)
                if (stream == null) {
                    db.photoDao().updateStatus(photo.uri, UploadStatus.FAILED, "File not accessible")
                    continue
                }

                val bytes = stream.use { it.readBytes() }
                val requestBody = bytes.toRequestBody("image/jpeg".toMediaTypeOrNull())
                val part = MultipartBody.Part.createFormData("file", photo.filename, requestBody)
                val slugBody = weddingSlug.toRequestBody("text/plain".toMediaTypeOrNull())

                val uploadResp = apiService.uploadPhoto(
                    deviceToken = deviceToken,
                    file = part,
                    weddingSlug = slugBody
                )

                if (uploadResp.isSuccessful) {
                    db.photoDao().updateStatus(photo.uri, UploadStatus.COMPLETED)
                    Log.i("WedSnapWorker", "Uploaded ${photo.filename} successfully.")
                } else {
                    allSucceeded = false
                    db.photoDao().updateStatus(photo.uri, UploadStatus.FAILED, "Server error: ${uploadResp.code()}")
                }

            } catch (e: Exception) {
                Log.e("WedSnapWorker", "Upload error for ${photo.filename}", e)
                db.photoDao().updateStatus(photo.uri, UploadStatus.FAILED, e.message)
                allSucceeded = false
            }
        }

        if (allSucceeded) Result.success() else Result.retry()
    }
}
