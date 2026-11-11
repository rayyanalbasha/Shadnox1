package com.shadnox.app

import android.Manifest
import android.app.Dialog
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Outline
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.text.Editable
import android.text.InputType
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import android.text.TextWatcher
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.ViewOutlineProvider
import android.view.WindowManager
import android.widget.BaseAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ListView
import android.widget.ScrollView
import android.widget.SeekBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import androidx.core.graphics.drawable.toBitmap
import kotlin.math.min

class MainActivity : AppCompatActivity() {

    // ----- layout pieces -----
    private lateinit var privacyPage: ScrollView
    private lateinit var shortcutPage: ScrollView
    private lateinit var tabPrivacy: TextView
    private lateinit var tabShortcut: TextView

    // ----- Private Screen widgets -----
    private lateinit var statusText: TextView
    private lateinit var statusPill: TextView
    private lateinit var toggleBtn: Button
    private lateinit var strengthValue: TextView
    private lateinit var seek: SeekBar
    private lateinit var permCard: LinearLayout

    // ----- App shortcut widgets + state -----
    private var selected: AppItem? = null
    private var customIcon: Bitmap? = null
    private var settingText = false
    private lateinit var appRowIcon: ImageView
    private lateinit var appRowTitle: TextView
    private lateinit var appRowSub: TextView
    private lateinit var nameEdit: EditText
    private lateinit var iconPreview: ImageView
    private lateinit var iconHint: TextView
    private lateinit var resetIconBtn: TextView
    private lateinit var confirmBtn: Button

    private val pickImage = registerForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri != null) onImagePicked(uri)
    }

    private val notificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { _ ->
            startOverlay()
        }

    private fun dp(v: Int) = Ui.dp(this, v)

    // =====================================================================
    // Lifecycle
    // =====================================================================
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val root = LinearLayout(this)
        root.orientation = LinearLayout.VERTICAL
        root.setBackgroundColor(Ui.BG)

        root.addView(buildHeader())

        val pages = FrameLayout(this)
        privacyPage = buildPrivacyPage()
        shortcutPage = buildShortcutPage()
        pages.addView(privacyPage, FrameLayout.LayoutParams(-1, -1))
        pages.addView(shortcutPage, FrameLayout.LayoutParams(-1, -1))
        root.addView(pages, LinearLayout.LayoutParams(-1, 0, 1f))

        root.addView(buildTabBar())
        setContentView(root)

        showTab(0, animate = false)
        refreshOverlayUi()
        refreshShortcutUi()
    }

    override fun onStart() {
        super.onStart()
        OverlayService.onChange = { runOnUiThread { refreshOverlayUi() } }
    }

    override fun onResume() {
        super.onResume()
        refreshOverlayUi()
    }

    override fun onStop() {
        OverlayService.onChange = null
        super.onStop()
    }

    // =====================================================================
    // Header + tabs
    // =====================================================================
    private fun buildHeader(): View {
        val row = LinearLayout(this)
        row.orientation = LinearLayout.HORIZONTAL
        row.gravity = Gravity.CENTER_VERTICAL
        row.setPadding(dp(20), dp(16), dp(20), dp(14))

        val logo = ImageView(this)
        logo.setImageResource(R.mipmap.ic_launcher)
        logo.outlineProvider = object : ViewOutlineProvider() {
            override fun getOutline(view: View, outline: Outline) {
                outline.setRoundRect(0, 0, view.width, view.height, dp(11).toFloat())
            }
        }
        logo.clipToOutline = true
        row.addView(logo, LinearLayout.LayoutParams(dp(40), dp(40)))

        val col = LinearLayout(this)
        col.orientation = LinearLayout.VERTICAL
        val name = Ui.text(this, "SHADNOX", 13f, Ui.WHITE, true)
        name.letterSpacing = 0.2f
        col.addView(name)
        col.addView(Ui.text(this, "Customize your world", 11f, Ui.MUTED))
        row.addView(col, Ui.lp(this, -2, -2, l = 12))
        return row
    }

    private fun buildTabBar(): View {
        val bar = LinearLayout(this)
        bar.orientation = LinearLayout.HORIZONTAL
        bar.setBackgroundColor(Ui.CARD)

        tabPrivacy = tabItem("Private Screen") { showTab(0) }
        tabShortcut = tabItem("App Shortcuts") { showTab(1) }
        bar.addView(tabPrivacy, LinearLayout.LayoutParams(0, -2, 1f))
        bar.addView(tabShortcut, LinearLayout.LayoutParams(0, -2, 1f))
        return bar
    }

    private fun tabItem(label: String, onClick: () -> Unit): TextView {
        val t = Ui.text(this, label, 13f, Ui.MUTED, true)
        t.gravity = Gravity.CENTER
        t.setPadding(0, dp(16), 0, dp(16))
        t.setOnClickListener { onClick() }
        return t
    }

    private fun showTab(index: Int, animate: Boolean = true) {
        val showPrivacy = index == 0
        val page = if (showPrivacy) privacyPage else shortcutPage
        val other = if (showPrivacy) shortcutPage else privacyPage
        other.visibility = View.GONE
        page.visibility = View.VISIBLE
        if (animate) {
            page.alpha = 0f
            page.translationY = dp(14).toFloat()
            page.animate().alpha(1f).translationY(0f).setDuration(280).start()
        }
        tabPrivacy.setTextColor(if (showPrivacy) Ui.WHITE else Ui.MUTED)
        tabShortcut.setTextColor(if (showPrivacy) Ui.MUTED else Ui.WHITE)
        tabPrivacy.background = if (showPrivacy) Ui.rounded(this, Ui.CARD2, 0) else null
        tabShortcut.background = if (showPrivacy) null else Ui.rounded(this, Ui.CARD2, 0)
    }

    private fun pageScroll(content: LinearLayout): ScrollView {
        val sv = ScrollView(this)
        sv.isFillViewport = false
        content.setPadding(dp(20), dp(8), dp(20), dp(28))
        sv.addView(content, ViewGroup.LayoutParams(-1, -2))
        return sv
    }

    private fun heading(eyebrow: String, title: String, grayPart: String, intro: String): View {
        val col = LinearLayout(this)
        col.orientation = LinearLayout.VERTICAL
        val e = Ui.text(this, eyebrow, 10f, Ui.MUTED, true)
        e.letterSpacing = 0.2f
        col.addView(e)
        val sb = SpannableStringBuilder("$title $grayPart")
        sb.setSpan(ForegroundColorSpan(Ui.MUTED), title.length + 1, sb.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        val h = Ui.text(this, "", 30f, Ui.WHITE, true)
        h.text = sb
        h.setLineSpacing(0f, 0.95f)
        col.addView(h, Ui.lp(this, -1, -2, t = 10))
        col.addView(Ui.text(this, intro, 13f, Ui.MUTED), Ui.lp(this, -1, -2, t = 10, b = 20))
        return col
    }

    // =====================================================================
    // Tab 1: Private Screen
    // =====================================================================
    private fun buildPrivacyPage(): ScrollView {
        val col = LinearLayout(this)
        col.orientation = LinearLayout.VERTICAL

        col.addView(
            heading(
                "SCREEN PRIVACY", "Take control of", "your screen.",
                "Add a dark layer over your screen so people nearby can't read it as easily."
            )
        )

        // permission card
        permCard = Ui.card(this)
        permCard.addView(Ui.text(this, "One quick permission", 14f, Ui.WHITE, true))
        permCard.addView(
            Ui.text(
                this,
                "Shadnox needs \"Display over other apps\" to draw the dark layer. Android will open a settings page where you switch it on.",
                12f, Ui.MUTED
            ), Ui.lp(this, -1, -2, t = 6, b = 14)
        )
        val grant = Ui.button(this, "Open settings", false)
        grant.setOnClickListener { openOverlaySettings() }
        permCard.addView(grant, LinearLayout.LayoutParams(-1, -2))
        col.addView(permCard, Ui.lp(this, -1, -2, b = 14))

        // control card
        val card = Ui.card(this)
        val top = LinearLayout(this)
        top.orientation = LinearLayout.HORIZONTAL
        top.gravity = Gravity.CENTER_VERTICAL
        val left = LinearLayout(this)
        left.orientation = LinearLayout.VERTICAL
        val lbl = Ui.text(this, "SCREEN OVERLAY", 10f, Ui.MUTED, true)
        lbl.letterSpacing = 0.15f
        left.addView(lbl)
        statusText = Ui.text(this, "Currently off", 19f, Ui.WHITE, true)
        left.addView(statusText, Ui.lp(this, -2, -2, t = 4))
        top.addView(left, LinearLayout.LayoutParams(0, -2, 1f))
        statusPill = Ui.text(this, "OFF", 10f, Ui.MUTED, true)
        statusPill.setPadding(dp(12), dp(6), dp(12), dp(6))
        top.addView(statusPill)
        card.addView(top)

        toggleBtn = Ui.button(this, "Turn on overlay", true)
        toggleBtn.setOnClickListener { onToggle() }
        card.addView(toggleBtn, Ui.lp(this, -1, -2, t = 20, b = 22))

        val sRow = LinearLayout(this)
        sRow.orientation = LinearLayout.HORIZONTAL
        sRow.addView(Ui.text(this, "Privacy strength", 12f, Color.parseColor("#C7C7C7")), LinearLayout.LayoutParams(0, -2, 1f))
        strengthValue = Ui.text(this, "45%", 14f, Ui.WHITE, true)
        sRow.addView(strengthValue)
        card.addView(sRow)

        seek = SeekBar(this)
        seek.max = 90
        seek.progress = OverlayService.strength(this)
        seek.progressTintList = android.content.res.ColorStateList.valueOf(Ui.WHITE)
        seek.thumbTintList = android.content.res.ColorStateList.valueOf(Ui.WHITE)
        seek.progressBackgroundTintList = android.content.res.ColorStateList.valueOf(Ui.LINE)
        seek.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(sb: SeekBar?, value: Int, fromUser: Boolean) {
                strengthValue.text = "$value%"
                if (fromUser) {
                    OverlayService.saveStrength(this@MainActivity, value)
                    if (OverlayService.running) {
                        startService(Intent(this@MainActivity, OverlayService::class.java).setAction(OverlayService.ACTION_UPDATE))
                    }
                }
            }

            override fun onStartTrackingTouch(sb: SeekBar?) {}
            override fun onStopTrackingTouch(sb: SeekBar?) {}
        })
        strengthValue.text = "${seek.progress}%"
        card.addView(seek, Ui.lp(this, -1, -2, t = 10))

        val labels = LinearLayout(this)
        labels.orientation = LinearLayout.HORIZONTAL
        labels.addView(Ui.text(this, "Subtle", 10f, Ui.DIM), LinearLayout.LayoutParams(0, -2, 1f))
        labels.addView(Ui.text(this, "Strong", 10f, Ui.DIM))
        card.addView(labels)
        col.addView(card, Ui.lp(this, -1, -2, b = 14))

        val note = Ui.card(this)
        note.addView(Ui.text(this, "Good to know", 13f, Ui.WHITE, true))
        note.addView(
            Ui.text(
                this,
                "While the overlay is on, a small notification stays in your bar. Use its \"Turn off\" button or come back here to switch it off. Touches pass straight through the dark layer, so you can use your phone normally.",
                12f, Ui.MUTED
            ), Ui.lp(this, -1, -2, t = 6)
        )
        col.addView(note)
        return pageScroll(col)
    }

    private fun refreshOverlayUi() {
        if (!::toggleBtn.isInitialized) return
        val on = OverlayService.running
        statusText.text = if (on) "Overlay is active" else "Currently off"
        statusPill.text = if (on) "ON" else "OFF"
        statusPill.setTextColor(if (on) Color.BLACK else Ui.MUTED)
        statusPill.background = Ui.rounded(this, if (on) Ui.WHITE else Ui.CARD2, 30, Ui.LINE, if (on) 0 else 1)
        toggleBtn.text = if (on) "Turn off overlay" else "Turn on overlay"
        Ui.styleButton(this, toggleBtn, !on)
        permCard.visibility = if (Settings.canDrawOverlays(this)) View.GONE else View.VISIBLE
    }

    private fun openOverlaySettings() {
        startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
    }

    private fun onToggle() {
        if (OverlayService.running) {
            startService(Intent(this, OverlayService::class.java).setAction(OverlayService.ACTION_STOP))
            return
        }
        if (!Settings.canDrawOverlays(this)) {
            Toast.makeText(this, "Switch on \"Display over other apps\" for Shadnox, then come back.", Toast.LENGTH_LONG).show()
            openOverlaySettings()
            return
        }
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            startOverlay()
        }
    }

    private fun startOverlay() {
        ContextCompat.startForegroundService(
            this, Intent(this, OverlayService::class.java).setAction(OverlayService.ACTION_START)
        )
    }

    // =====================================================================
    // Tab 2: App shortcuts (custom name and icon)
    // =====================================================================
    private fun buildShortcutPage(): ScrollView {
        val col = LinearLayout(this)
        col.orientation = LinearLayout.VERTICAL

        col.addView(
            heading(
                "CUSTOMIZATION", "Change how an app", "looks.",
                "Pick an app, give it a new name or icon, and add it to your home screen. It opens the original app."
            )
        )

        // 1. choose app
        val c1 = Ui.card(this)
        c1.addView(stepLabel("01  CHOOSE AN APP"))
        val row = LinearLayout(this)
        row.orientation = LinearLayout.HORIZONTAL
        row.gravity = Gravity.CENTER_VERTICAL
        row.background = Ui.rounded(this, Ui.CARD2, 14, Ui.LINE, 1)
        row.setPadding(dp(12), dp(12), dp(12), dp(12))
        appRowIcon = ImageView(this)
        row.addView(appRowIcon, LinearLayout.LayoutParams(dp(44), dp(44)))
        val rc = LinearLayout(this)
        rc.orientation = LinearLayout.VERTICAL
        appRowTitle = Ui.text(this, "Choose an app…", 15f, Ui.WHITE, true)
        appRowSub = Ui.text(this, "Tap to see every app on your phone", 11f, Ui.MUTED)
        rc.addView(appRowTitle)
        rc.addView(appRowSub)
        row.addView(rc, Ui.lp(this, 0, -2, l = 12).also { it.weight = 1f })
        row.addView(Ui.text(this, "›", 22f, Ui.MUTED))
        row.setOnClickListener { openAppPicker() }
        c1.addView(row, Ui.lp(this, -1, -2, t = 12))
        col.addView(c1, Ui.lp(this, -1, -2, b = 14))

        // 2. name
        val c2 = Ui.card(this)
        c2.addView(stepLabel("02  NAME"))
        nameEdit = EditText(this)
        nameEdit.hint = "App name"
        nameEdit.setHintTextColor(Ui.DIM)
        nameEdit.setTextColor(Ui.WHITE)
        nameEdit.textSize = 15f
        nameEdit.inputType = InputType.TYPE_CLASS_TEXT
        nameEdit.isSingleLine = true
        nameEdit.background = Ui.rounded(this, Ui.CARD2, 12, Ui.LINE, 1)
        nameEdit.setPadding(dp(14), dp(13), dp(14), dp(13))
        nameEdit.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {}
            override fun onTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {}
            override fun afterTextChanged(s: Editable?) {
                if (!settingText) updateConfirm()
            }
        })
        c2.addView(nameEdit, Ui.lp(this, -1, -2, t = 12))
        col.addView(c2, Ui.lp(this, -1, -2, b = 14))

        // 3. icon
        val c3 = Ui.card(this)
        c3.addView(stepLabel("03  ICON"))
        val iconRow = LinearLayout(this)
        iconRow.orientation = LinearLayout.HORIZONTAL
        iconRow.gravity = Gravity.CENTER_VERTICAL

        val box = FrameLayout(this)
        box.background = Ui.rounded(this, Ui.CARD2, 20, Ui.LINE, 1)
        iconPreview = ImageView(this)
        iconPreview.scaleType = ImageView.ScaleType.CENTER_CROP
        iconPreview.outlineProvider = object : ViewOutlineProvider() {
            override fun getOutline(view: View, outline: Outline) {
                outline.setRoundRect(0, 0, view.width, view.height, dp(20).toFloat())
            }
        }
        iconPreview.clipToOutline = true
        box.addView(iconPreview, FrameLayout.LayoutParams(-1, -1))
        iconHint = Ui.text(this, "+", 30f, Ui.MUTED)
        iconHint.gravity = Gravity.CENTER
        box.addView(iconHint, FrameLayout.LayoutParams(-1, -1))
        box.setOnClickListener { chooseImage() }
        iconRow.addView(box, LinearLayout.LayoutParams(dp(92), dp(92)))

        val ic = LinearLayout(this)
        ic.orientation = LinearLayout.VERTICAL
        val upload = Ui.button(this, "Upload image…", false)
        upload.setOnClickListener { chooseImage() }
        ic.addView(upload, LinearLayout.LayoutParams(-1, -2))
        resetIconBtn = Ui.text(this, "Use the original icon", 12f, Ui.MUTED)
        resetIconBtn.setPadding(0, dp(12), 0, dp(4))
        resetIconBtn.setOnClickListener {
            customIcon = null
            refreshShortcutUi()
        }
        ic.addView(resetIconBtn)
        iconRow.addView(ic, Ui.lp(this, 0, -2, l = 16).also { it.weight = 1f })
        c3.addView(iconRow, Ui.lp(this, -1, -2, t = 12))
        col.addView(c3, Ui.lp(this, -1, -2, b = 14))

        // confirm (only appears when something was changed)
        confirmBtn = Ui.button(this, "Confirm", true)
        confirmBtn.visibility = View.GONE
        confirmBtn.setOnClickListener { createShortcut() }
        col.addView(confirmBtn, LinearLayout.LayoutParams(-1, -2))

        col.addView(
            Ui.text(this, "After you confirm, Android asks if you want to add the shortcut to your home screen.", 11f, Ui.DIM),
            Ui.lp(this, -1, -2, t = 12)
        )
        return pageScroll(col)
    }

    private fun stepLabel(s: String): TextView {
        val t = Ui.text(this, s, 10f, Ui.MUTED, true)
        t.letterSpacing = 0.15f
        return t
    }

    private fun refreshShortcutUi() {
        val app = selected
        if (app == null) {
            appRowIcon.setImageDrawable(null)
            appRowTitle.text = "Choose an app…"
            appRowSub.text = "Tap to see every app on your phone"
            iconPreview.setImageDrawable(null)
            iconHint.visibility = View.VISIBLE
            resetIconBtn.visibility = View.GONE
            nameEdit.isEnabled = false
        } else {
            appRowIcon.setImageDrawable(app.icon)
            appRowTitle.text = app.label
            appRowSub.text = app.packageName
            nameEdit.isEnabled = true
            val custom = customIcon
            if (custom != null) iconPreview.setImageBitmap(custom) else iconPreview.setImageDrawable(app.icon)
            iconHint.visibility = View.GONE
            resetIconBtn.visibility = if (custom != null) View.VISIBLE else View.GONE
        }
        updateConfirm()
    }

    /** The Confirm button only shows when the name, the icon, or both were changed. */
    private fun updateConfirm() {
        val app = selected
        val name = nameEdit.text.toString().trim()
        val changed = app != null && name.isNotEmpty() && (name != app.label || customIcon != null)
        confirmBtn.visibility = if (changed) View.VISIBLE else View.GONE
    }

    private fun chooseImage() {
        if (selected == null) {
            Toast.makeText(this, "Choose an app first.", Toast.LENGTH_SHORT).show()
            return
        }
        pickImage.launch("image/*")
    }

    private fun onImagePicked(uri: Uri) {
        val bmp = decodeSquare(uri, 256)
        if (bmp == null) {
            Toast.makeText(this, "That image couldn't be read.", Toast.LENGTH_SHORT).show()
            return
        }
        customIcon = bmp
        refreshShortcutUi()
    }

    /** Reads an image and crops it to a centered square so it fits an icon. */
    private fun decodeSquare(uri: Uri, size: Int): Bitmap? {
        return try {
            val bounds = BitmapFactory.Options()
            bounds.inJustDecodeBounds = true
            contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
            var sample = 1
            while (min(bounds.outWidth, bounds.outHeight) / (sample * 2) >= size) sample *= 2
            val opts = BitmapFactory.Options()
            opts.inSampleSize = sample
            val raw = contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, opts) }
                ?: return null
            val side = min(raw.width, raw.height)
            val x = (raw.width - side) / 2
            val y = (raw.height - side) / 2
            val square = Bitmap.createBitmap(raw, x, y, side, side)
            Bitmap.createScaledBitmap(square, size, size, true)
        } catch (e: Exception) {
            null
        }
    }

    private fun createShortcut() {
        val app = selected ?: return
        val name = nameEdit.text.toString().trim()
        if (name.isEmpty()) return

        val launch = packageManager.getLaunchIntentForPackage(app.packageName)
        if (launch == null) {
            Toast.makeText(this, "That app can't be opened.", Toast.LENGTH_SHORT).show()
            return
        }
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)

        if (!ShortcutManagerCompat.isRequestPinShortcutSupported(this)) {
            Toast.makeText(this, "Your home screen app doesn't support adding shortcuts.", Toast.LENGTH_LONG).show()
            return
        }

        val bitmap = customIcon ?: app.icon.toBitmap(192, 192)
        val info = ShortcutInfoCompat.Builder(this, "shadnox_${app.packageName}_${System.currentTimeMillis()}")
            .setShortLabel(name)
            .setLongLabel(name)
            .setIcon(IconCompat.createWithBitmap(bitmap))
            .setIntent(launch)
            .build()

        // Android shows its own "Add to home screen?" box after this call.
        ShortcutManagerCompat.requestPinShortcut(this, info, null)
    }

    // =====================================================================
    // Full screen list of every app on the phone
    // =====================================================================
    private fun openAppPicker() {
        val dialog = Dialog(this, R.style.FullDialog)
        dialog.window?.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)

        val box = LinearLayout(this)
        box.orientation = LinearLayout.VERTICAL
        box.setBackgroundColor(Ui.BG)
        box.setPadding(dp(16), dp(14), dp(16), 0)

        val bar = LinearLayout(this)
        bar.orientation = LinearLayout.HORIZONTAL
        bar.gravity = Gravity.CENTER_VERTICAL
        val close = Ui.text(this, "✕", 20f, Ui.WHITE, true)
        close.setPadding(dp(4), dp(6), dp(14), dp(6))
        close.setOnClickListener { dialog.dismiss() }
        bar.addView(close)
        bar.addView(Ui.text(this, "Choose an app", 18f, Ui.WHITE, true))
        box.addView(bar)

        val search = EditText(this)
        search.hint = "Search apps"
        search.setHintTextColor(Ui.DIM)
        search.setTextColor(Ui.WHITE)
        search.textSize = 14f
        search.isSingleLine = true
        search.background = Ui.rounded(this, Ui.CARD2, 12, Ui.LINE, 1)
        search.setPadding(dp(14), dp(12), dp(14), dp(12))
        box.addView(search, Ui.lp(this, -1, -2, t = 12, b = 8))

        val loading = Ui.text(this, "Loading apps…", 13f, Ui.MUTED)
        loading.setPadding(dp(4), dp(16), 0, 0)
        box.addView(loading)

        val list = ListView(this)
        list.divider = null
        list.cacheColorHint = Color.TRANSPARENT
        list.visibility = View.GONE
        box.addView(list, LinearLayout.LayoutParams(-1, 0, 1f))

        dialog.setContentView(box)
        dialog.show()

        Thread {
            val apps = loadApps()
            runOnUiThread {
                if (!dialog.isShowing) return@runOnUiThread
                val adapter = AppAdapter(apps)
                list.adapter = adapter
                loading.visibility = View.GONE
                list.visibility = View.VISIBLE
                list.setOnItemClickListener { _, _, position, _ ->
                    chooseApp(adapter.getItem(position))
                    dialog.dismiss()
                }
                search.addTextChangedListener(object : TextWatcher {
                    override fun beforeTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {}
                    override fun onTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {}
                    override fun afterTextChanged(s: Editable?) {
                        adapter.filter(s?.toString() ?: "")
                    }
                })
            }
        }.start()
    }

    private fun loadApps(): List<AppItem> {
        val pm = packageManager
        val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        val result = ArrayList<AppItem>()
        val seen = HashSet<String>()
        for (ri in pm.queryIntentActivities(intent, 0)) {
            val pkg = ri.activityInfo.packageName
            if (!seen.add(pkg)) continue
            result.add(AppItem(ri.loadLabel(pm).toString(), pkg, ri.loadIcon(pm)))
        }
        result.sortBy { it.label.lowercase() }
        return result
    }

    private fun chooseApp(app: AppItem) {
        selected = app
        customIcon = null
        settingText = true
        nameEdit.setText(app.label)
        settingText = false
        refreshShortcutUi()
    }

    private inner class AppAdapter(private val all: List<AppItem>) : BaseAdapter() {
        private var shown: List<AppItem> = all

        fun filter(q: String) {
            val query = q.trim().lowercase()
            shown = if (query.isEmpty()) all else all.filter {
                it.label.lowercase().contains(query) || it.packageName.lowercase().contains(query)
            }
            notifyDataSetChanged()
        }

        override fun getCount() = shown.size
        override fun getItem(position: Int) = shown[position]
        override fun getItemId(position: Int) = position.toLong()

        override fun getView(position: Int, convertView: View?, parent: ViewGroup?): View {
            val app = shown[position]
            val row: LinearLayout
            val icon: ImageView
            val title: TextView
            val sub: TextView
            if (convertView is LinearLayout && convertView.tag is Array<*>) {
                row = convertView
                @Suppress("UNCHECKED_CAST")
                val views = row.tag as Array<View>
                icon = views[0] as ImageView
                title = views[1] as TextView
                sub = views[2] as TextView
            } else {
                row = LinearLayout(this@MainActivity)
                row.orientation = LinearLayout.HORIZONTAL
                row.gravity = Gravity.CENTER_VERTICAL
                row.setPadding(dp(4), dp(10), dp(4), dp(10))
                icon = ImageView(this@MainActivity)
                row.addView(icon, LinearLayout.LayoutParams(dp(42), dp(42)))
                val col = LinearLayout(this@MainActivity)
                col.orientation = LinearLayout.VERTICAL
                title = Ui.text(this@MainActivity, "", 15f, Ui.WHITE, true)
                sub = Ui.text(this@MainActivity, "", 11f, Ui.MUTED)
                title.isSingleLine = true
                sub.isSingleLine = true
                col.addView(title)
                col.addView(sub)
                row.addView(col, Ui.lp(this@MainActivity, 0, -2, l = 14).also { it.weight = 1f })
                row.tag = arrayOf<View>(icon, title, sub)
            }
            icon.setImageDrawable(app.icon)
            title.text = app.label
            sub.text = app.packageName
            return row
        }
    }
}
