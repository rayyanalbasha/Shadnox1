package com.shadnox.app

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

/** Small helpers so the whole app looks like the Shadnox website: black, white and gray. */
object Ui {
    val BG = Color.parseColor("#050505")
    val CARD = Color.parseColor("#0F0F0F")
    val CARD2 = Color.parseColor("#161616")
    val LINE = Color.parseColor("#2A2A2A")
    val TEXT = Color.parseColor("#F4F4F4")
    val MUTED = Color.parseColor("#8B8B8B")
    val DIM = Color.parseColor("#5A5A5A")
    val WHITE = Color.WHITE

    fun dp(ctx: Context, v: Int): Int = (v * ctx.resources.displayMetrics.density + 0.5f).toInt()

    fun rounded(ctx: Context, fill: Int, radiusDp: Int, strokeColor: Int = 0, strokeDp: Int = 0): GradientDrawable {
        val d = GradientDrawable()
        d.shape = GradientDrawable.RECTANGLE
        d.setColor(fill)
        d.cornerRadius = dp(ctx, radiusDp).toFloat()
        if (strokeDp > 0) d.setStroke(dp(ctx, strokeDp), strokeColor)
        return d
    }

    fun text(ctx: Context, s: String, sp: Float, color: Int, bold: Boolean = false): TextView {
        val t = TextView(ctx)
        t.text = s
        t.textSize = sp
        t.setTextColor(color)
        if (bold) t.typeface = Typeface.DEFAULT_BOLD
        return t
    }

    fun button(ctx: Context, label: String, primary: Boolean): Button {
        val b = Button(ctx)
        b.text = label
        b.setAllCaps(false)
        b.textSize = 13f
        b.typeface = Typeface.DEFAULT_BOLD
        b.stateListAnimator = null
        b.minHeight = 0
        b.minimumHeight = 0
        b.setPadding(dp(ctx, 18), dp(ctx, 14), dp(ctx, 18), dp(ctx, 14))
        styleButton(ctx, b, primary)
        return b
    }

    fun styleButton(ctx: Context, b: Button, primary: Boolean) {
        if (primary) {
            b.setTextColor(Color.BLACK)
            b.background = rounded(ctx, WHITE, 12)
        } else {
            b.setTextColor(WHITE)
            b.background = rounded(ctx, Color.TRANSPARENT, 12, LINE, 1)
        }
    }

    fun card(ctx: Context): LinearLayout {
        val c = LinearLayout(ctx)
        c.orientation = LinearLayout.VERTICAL
        c.background = rounded(ctx, CARD, 20, LINE, 1)
        c.setPadding(dp(ctx, 18), dp(ctx, 18), dp(ctx, 18), dp(ctx, 18))
        return c
    }

    fun lp(ctx: Context, w: Int, h: Int, l: Int = 0, t: Int = 0, r: Int = 0, b: Int = 0): LinearLayout.LayoutParams {
        val p = LinearLayout.LayoutParams(w, h)
        p.setMargins(dp(ctx, l), dp(ctx, t), dp(ctx, r), dp(ctx, b))
        return p
    }
}
