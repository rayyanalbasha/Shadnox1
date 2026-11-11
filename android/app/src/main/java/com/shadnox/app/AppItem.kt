package com.shadnox.app

import android.graphics.drawable.Drawable

/** One app that has a launcher icon on this phone. */
data class AppItem(val label: String, val packageName: String, val icon: Drawable)
