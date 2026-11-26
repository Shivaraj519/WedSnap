package com.wedsnap.photographer.ui.screens

import android.content.Context
import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.CloudSync
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Settings
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
import com.wedsnap.photographer.data.local.WedSnapDatabase
import com.wedsnap.photographer.service.MediaObserverService
import com.wedsnap.photographer.ui.theme.ChampagneGold
import com.wedsnap.photographer.ui.theme.DarkCharcoal
import com.wedsnap.photographer.ui.theme.WarmIvory

@Composable
fun StatusScreen(onUnpair: () -> Unit) {
    val context = LocalContext.current
    val prefs = remember { PreferenceManager.getDefaultSharedPreferences(context) }
    val db = remember { WedSnapDatabase.getDatabase(context) }

    val weddingSlug = remember { prefs.getString("wedding_slug", "Active Wedding") ?: "" }
    var isSyncActive by remember { mutableStateOf(true) }
    var continuousMode by remember { mutableStateOf(true) }

    val completedCount by db.photoDao().getCompletedCountFlow().collectAsState(initial = 0)
    val pendingCount by db.photoDao().getPendingCountFlow().collectAsState(initial = 0)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(WarmIvory)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Top Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp, bottom = 24.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "WEDSNAP LIVE",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = DarkCharcoal,
                    letterSpacing = 2.sp
                )
                Text(
                    text = "Gallery: $weddingSlug",
                    fontSize = 13.sp,
                    color = ChampagneGold,
                    fontWeight = FontWeight.Medium
                )
            }

            IconButton(onClick = onUnpair) {
                Icon(
                    imageVector = Icons.Default.Settings,
                    contentDescription = "Settings",
                    tint = DarkCharcoal
                )
            }
        }

        // Live Status Badge
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Box(
                        modifier = Modifier
                            .size(12.dp)
                            .background(
                                color = if (isSyncActive) Color(0xFF4CAF50) else Color(0xFFFF9800),
                                shape = CircleShape
                            )
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (isSyncActive) "SESSION ACTIVE & SYNCING" else "SYNCHRONIZATION PAUSED",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = DarkCharcoal,
                        letterSpacing = 1.sp
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Metric Counters
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "$completedCount",
                            fontSize = 38.sp,
                            fontWeight = FontWeight.Bold,
                            color = ChampagneGold
                        )
                        Text(
                            text = "PHOTOS SYNCED",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = DarkCharcoal.copy(alpha = 0.6f)
                        )
                    }

                    Box(
                        modifier = Modifier
                            .width(1.dp)
                            .height(50.dp)
                            .background(Color(0xFFE0E0E0))
                    )

                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "$pendingCount",
                            fontSize = 38.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (pendingCount > 0) Color(0xFFE91E63) else DarkCharcoal
                        )
                        Text(
                            text = "IN QUEUE",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = DarkCharcoal.copy(alpha = 0.6f)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Options Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Continuous Upload Mode",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = DarkCharcoal
                        )
                        Text(
                            text = "Keep foreground service running during shoot",
                            fontSize = 12.sp,
                            color = DarkCharcoal.copy(alpha = 0.6f)
                        )
                    }
                    Switch(
                        checked = continuousMode,
                        onCheckedChange = { continuousMode = it },
                        colors = SwitchDefaults.colors(checkedThumbColor = ChampagneGold)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        // Pause / Resume Button
        Button(
            onClick = {
                isSyncActive = !isSyncActive
                if (isSyncActive) {
                    context.startService(Intent(context, MediaObserverService::class.java))
                } else {
                    context.stopService(Intent(context, MediaObserverService::class.java))
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(54.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = if (isSyncActive) DarkCharcoal else ChampagneGold
            ),
            shape = RoundedCornerShape(8.dp)
        ) {
            Icon(
                imageVector = if (isSyncActive) Icons.Default.Pause else Icons.Default.PlayArrow,
                contentDescription = null,
                tint = Color.White
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = if (isSyncActive) "PAUSE SYNCHRONIZATION" else "RESUME SYNCHRONIZATION",
                color = Color.White,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp
            )
        }

        Spacer(modifier = Modifier.height(16.dp))
    }
}
