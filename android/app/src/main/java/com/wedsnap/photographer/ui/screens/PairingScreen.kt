package com.wedsnap.photographer.ui.screens

import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.preference.PreferenceManager
import com.wedsnap.photographer.ui.theme.ChampagneGold
import com.wedsnap.photographer.ui.theme.DarkCharcoal
import com.wedsnap.photographer.ui.theme.WarmIvory

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PairingScreen(onPaired: () -> Unit) {
    val context = LocalContext.current
    val prefs = remember { PreferenceManager.getDefaultSharedPreferences(context) }

    var serverUrl by remember { mutableStateOf(prefs.getString("server_url", "https://wedsnap-backend.onrender.com") ?: "") }
    var weddingSlug by remember { mutableStateOf(prefs.getString("wedding_slug", "sophia-alexander") ?: "") }
    var deviceToken by remember { mutableStateOf(prefs.getString("device_token", "") ?: "") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(WarmIvory)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "WEDSNAP",
            fontSize = 32.sp,
            fontWeight = FontWeight.Bold,
            color = ChampagneGold,
            letterSpacing = 4.sp
        )
        Text(
            text = "Photographer Mobile Connector",
            fontSize = 14.sp,
            color = DarkCharcoal.copy(alpha = 0.7f),
            modifier = Modifier.padding(bottom = 32.dp)
        )

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text(
                    text = "Pair with Wedding Gallery",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = DarkCharcoal,
                    modifier = Modifier.padding(bottom = 16.dp)
                )

                OutlinedTextField(
                    value = serverUrl,
                    onValueChange = { serverUrl = it },
                    label = { Text("WedSnap Server URL") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = weddingSlug,
                    onValueChange = { weddingSlug = it },
                    label = { Text("Wedding Identifier (Slug)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = deviceToken,
                    onValueChange = { deviceToken = it },
                    label = { Text("Photographer Device Token") },
                    placeholder = { Text("wds_...") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = {
                        prefs.edit()
                            .putString("server_url", serverUrl.trim())
                            .putString("wedding_slug", weddingSlug.trim())
                            .putString("device_token", deviceToken.trim())
                            .putBoolean("is_paired", true)
                            .apply()
                        onPaired()
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = ChampagneGold),
                    shape = RoundedCornerShape(8.dp),
                    enabled = serverUrl.isNotBlank() && weddingSlug.isNotBlank() && deviceToken.isNotBlank()
                ) {
                    Text(
                        text = "ACTIVATE LIVE TETHERING",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                }
            }
        }
    }
}
