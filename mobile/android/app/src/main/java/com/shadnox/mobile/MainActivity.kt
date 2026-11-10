package com.shadnox.mobile

import android.app.Activity
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.content.pm.ShortcutInfo
import android.content.pm.ShortcutManager
import android.graphics.drawable.Icon
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import java.io.InputStream
import java.util.UUID

data class LaunchableApp(val label: String, val packageName: String, val icon: Drawable)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { ShadnoxApp() }
    }
}

@Composable
private fun ShadnoxApp() {
    val context = LocalContext.current
    val activity = context as Activity
    val pm = context.packageManager
    var selectedTab by remember { mutableStateOf(0) }
    var apps by remember { mutableStateOf(emptyList<LaunchableApp>()) }
    var selected by remember { mutableStateOf<LaunchableApp?>(null) }
    var shortcutName by remember { mutableStateOf("") }
    var customIcon by remember { mutableStateOf<Bitmap?>(null) }
    var created by remember { mutableStateOf(listOf<String>()) }
    var message by remember { mutableStateOf("") }

    fun loadApps() {
        val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        @Suppress("DEPRECATION")
        val resolved = if (Build.VERSION.SDK_INT >= 33) pm.queryIntentActivities(intent, PackageManager.ResolveInfoFlags.of(0)) else pm.queryIntentActivities(intent, 0)
        apps = resolved.mapNotNull { info ->
            val packageName = info.activityInfo?.packageName ?: return@mapNotNull null
            if (packageName == context.packageName) return@mapNotNull null
            LaunchableApp(info.loadLabel(pm).toString(), packageName, info.loadIcon(pm))
        }.distinctBy { it.packageName }.sortedBy { it.label.lowercase() }
    }
    LaunchedEffect(Unit) { loadApps() }

    val imagePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri != null) {
            try { context.contentResolver.openInputStream(uri)?.use { stream -> customIcon = BitmapFactory.decodeStream(stream) } }
            catch (_: Exception) { message = "Couldn't read that image. Try a PNG or JPG." }
        }
    }

    MaterialTheme(colorScheme = darkColorScheme(background = androidx.compose.ui.graphics.Color(0xFF080808), surface = androidx.compose.ui.graphics.Color(0xFF151515), primary = androidx.compose.ui.graphics.Color(0xFF9B8CFF))) {
        Scaffold(containerColor = MaterialTheme.colorScheme.background, bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                NavigationBarItem(selected = selectedTab == 0, onClick = { selectedTab = 0 }, icon = {}, label = { Text("Private Screen") })
                NavigationBarItem(selected = selectedTab == 1, onClick = { selectedTab = 1 }, icon = {}, label = { Text("My shortcuts") })
            }
        }) { padding ->
            Column(Modifier.fillMaxSize().padding(padding).padding(20.dp)) {
                Text("SHADNOX", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(8.dp))
                Text(if (selectedTab == 0) "Create a private shortcut" else "Your shortcuts", style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.onBackground)
                Spacer(Modifier.height(8.dp))
                Text("Create a home-screen shortcut for an app. This does not hide or lock the original app.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(16.dp))
                if (message.isNotBlank()) { Text(message, color = MaterialTheme.colorScheme.primary); Spacer(Modifier.height(8.dp)) }
                if (selectedTab == 0) {
                    if (selected == null) {
                        Text("Choose an installed app", color = MaterialTheme.colorScheme.onBackground, fontWeight = FontWeight.SemiBold)
                        Spacer(Modifier.height(8.dp))
                        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(apps) { app ->
                                Row(Modifier.fillMaxWidth().clickable { selected = app; shortcutName = app.label; customIcon = null; message = "" }.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                                    AppIcon(app.icon, Modifier.size(42.dp)); Spacer(Modifier.width(12.dp)); Text(app.label, color = MaterialTheme.colorScheme.onBackground)
                                }
                            }
                        }
                    } else {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            if (customIcon != null) Image(customIcon!!.asImageBitmap(), null, Modifier.size(56.dp)) else AppIcon(selected!!.icon, Modifier.size(56.dp))
                            Spacer(Modifier.width(12.dp))
                            Column { Text(selected!!.label, color = MaterialTheme.colorScheme.onBackground, fontWeight = FontWeight.SemiBold); Text(selected!!.packageName, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall) }
                        }
                        Spacer(Modifier.height(18.dp))
                        OutlinedTextField(value = shortcutName, onValueChange = { shortcutName = it.take(50) }, label = { Text("Shortcut name") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                        Spacer(Modifier.height(12.dp))
                        OutlinedButton(onClick = { imagePicker.launch("image/*") }, modifier = Modifier.fillMaxWidth()) { Text(if (customIcon == null) "Choose icon image" else "Change icon image") }
                        if (customIcon != null) Text("Custom image selected", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(12.dp))
                        val changed = shortcutName.trim() != selected!!.label || customIcon != null
                        Button(onClick = {
                            val target = selected ?: return@Button
                            val manager = context.getSystemService(ShortcutManager::class.java)
                            if (Build.VERSION.SDK_INT >= 26 && manager?.isRequestPinShortcutAllowed == true) {
                                val launchIntent = pm.getLaunchIntentForPackage(target.packageName)
                                if (launchIntent == null) { message = "This app does not expose a launchable activity."; return@Button }
                                val icon = customIcon?.let { Icon.createWithBitmap(Bitmap.createScaledBitmap(it, 192, 192, true)) } ?: Icon.createWithDrawable(target.icon)
                                val info = ShortcutInfo.Builder(context, UUID.randomUUID().toString()).setShortLabel(shortcutName.trim().ifBlank { target.label }.take(25)).setIcon(icon).setIntent(launchIntent).build()
                                val accepted = manager.requestPinShortcut(info, null)
                                message = if (accepted) "Shortcut request sent. Approve it in your launcher if prompted." else "Your launcher couldn't accept this shortcut request."
                                if (accepted) created = created + shortcutName.trim().ifBlank { target.label }
                            } else message = "This Android launcher doesn't support pinned shortcuts."
                            selected = null; customIcon = null
                        }, enabled = changed && shortcutName.isNotBlank(), modifier = Modifier.fillMaxWidth()) { Text("Confirm and add shortcut") }
                        Text("Android may ask you to approve the shortcut. Launcher behavior varies by device.", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
                        TextButton(onClick = { selected = null; customIcon = null; message = "" }) { Text("Back to apps") }
                    }
                } else {
                    if (created.isEmpty()) Text("Shortcuts you request during this session will appear here. Android launchers manage the actual home-screen shortcuts.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    else LazyColumn { items(created) { name -> Text("•  $name", color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.padding(vertical = 8.dp)) } }
                }
            }
        }
    }
}

@Composable
private fun AppIcon(drawable: Drawable, modifier: Modifier = Modifier) {
    val bitmap = remember(drawable) {
        val width = 96; val height = 96
        val bmp = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp); drawable.setBounds(0, 0, width, height); drawable.draw(canvas); bmp
    }
    Image(bitmap.asImageBitmap(), contentDescription = null, modifier = modifier)
}
