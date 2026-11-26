package com.wedsnap.photographer.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(entities = [PhotoEntity::class], version = 1, exportSchema = false)
abstract class WedSnapDatabase : RoomDatabase() {
    abstract fun photoDao(): PhotoDao

    companion object {
        @Volatile
        private var INSTANCE: WedSnapDatabase? = null

        fun getDatabase(context: Context): WedSnapDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    WedSnapDatabase::class.java,
                    "wedsnap_photographer.db"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
