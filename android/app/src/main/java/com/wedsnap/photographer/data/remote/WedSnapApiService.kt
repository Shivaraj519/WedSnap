package com.wedsnap.photographer.data.remote

import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.*

data class CheckDuplicateRequest(
    val wedding_id: String,
    val checksum: String
)

data class CheckDuplicateResponse(
    val exists: Boolean,
    val photo_id: String?
)

interface WedSnapApiService {
    @POST("api/v1/photos/check-duplicate")
    suspend fun checkDuplicate(
        @Header("X-Device-Token") deviceToken: String,
        @Body request: CheckDuplicateRequest
    ): Response<CheckDuplicateResponse>

    @Multipart
    @POST("api/v1/photos/upload")
    suspend fun uploadPhoto(
        @Header("X-Device-Token") deviceToken: String,
        @Part file: MultipartBody.Part,
        @Part("wedding_id_or_slug") weddingSlug: RequestBody
    ): Response<ResponseBody>
}
