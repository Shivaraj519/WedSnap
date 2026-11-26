package com.wedsnap.photographer

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.*
import androidx.core.content.ContextCompat
import androidx.preference.PreferenceManager
import com.wedsnap.photographer.service.MediaObserverService
import com.wedsnap.photographer.ui.screens.PairingScreen
import com.wedsnap.photographer.ui.screens.StatusScreen
import com.wedsnap.photographer.ui.theme.WedSnapTheme

class MainActivity : ComponentActivity() {

    private val requestPermissionsLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val granted = permissions.entries.all { it.value }
        if (granted) {
            checkAndStartService()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestRequiredPermissions()

        setContent {
            WedSnapTheme {
                val prefs = remember { PreferenceManager.getDefaultSharedPreferences(this) }
                var isPaired by remember { mutableStateOf(prefs.getBoolean("is_paired", false)) }

                if (isPaired) {
                    StatusScreen(
                        onUnpair = {
                            stopService(Intent(this, MediaObserverService::class.java))
                            prefs.edit().putBoolean("is_paired", false).apply()
                            isPaired = false
                        }
                    )
                } else {
                    PairingScreen(
                        onPaired = {
                            isPaired = true
                            checkAndStartService()
                        }
                    )
                }
            }
        }
    }

    private fun requestRequiredPermissions() {
        val permissions = mutableListOf<String>()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.READ_MEDIA_IMAGES)
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE)
        }

        val needed = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (needed.isNotEmpty()) {
            requestPermissionsLauncher.launch(needed.toTypedArray())
        } else {
            checkAndStartService()
        }
    }

    private fun checkAndStartService() {
        val prefs = PreferenceManager.getDefaultSharedPreferences(this)
        if (prefs.getBoolean("is_paired", false)) {
            val serviceIntent = Intent(this, MediaObserverService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }
        }
    }
}
