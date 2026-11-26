package com.wedsnap.photographer.ui.theme

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val ChampagneGold = Color(0xFFC5A880)
val DarkCharcoal = Color(0xFF232120)
val WarmIvory = Color(0xFFFAF8F5)
val SurfaceCream = Color(0xFFF3ECE4)

private val LightColorScheme = lightColorScheme(
    primary = ChampagneGold,
    onPrimary = Color.White,
    secondary = DarkCharcoal,
    onSecondary = Color.White,
    background = WarmIvory,
    surface = SurfaceCream,
    onSurface = DarkCharcoal
)

@Composable
fun WedSnapTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        content = content
    )
}
