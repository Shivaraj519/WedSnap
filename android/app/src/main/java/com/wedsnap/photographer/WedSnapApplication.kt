package com.wedsnap.photographer

import android.app.Application
import android.util.Log

class WedSnapApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        Log.i("WedSnapApp", "WedSnap Photographer Application initialized.")
    }
}
