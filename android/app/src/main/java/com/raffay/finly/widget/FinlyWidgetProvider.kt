/**
 * FinlyWidgetProvider
 * Purpose: App Widget Provider for Android home screen widgets
 * Handles widget updates and interactions
 */

package com.raffay.finly.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import com.raffay.finly.MainActivity

class FinlyWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        updateAppWidgets(context, appWidgetManager, appWidgetIds)
    }

    companion object {
        fun updateAppWidgets(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetIds: IntArray
        ) {
            val dataManager = WidgetDataManager(context)
            val widgetData = dataManager.loadWidgetData()

            for (appWidgetId in appWidgetIds) {
                val views = createWidgetViews(context, appWidgetId, widgetData, dataManager)
                appWidgetManager.updateAppWidget(appWidgetId, views)
            }
        }

        private fun createWidgetViews(
            context: Context,
            appWidgetId: Int,
            widgetData: WidgetData,
            dataManager: WidgetDataManager
        ): RemoteViews {
            // Determine widget size
            val options = AppWidgetManager.getInstance(context).getAppWidgetOptions(appWidgetId)
            val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH)
            val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT)

            // Use large layout if widget is wide enough (approximately 4x1 or larger)
            val isLarge = minWidth >= 250 // Approximate threshold for large widget

            val layoutId = if (isLarge) {
                val id = context.resources.getIdentifier("widget_large", "layout", context.packageName)
                if (id == 0) {
                    context.resources.getIdentifier("widget_small", "layout", context.packageName)
                } else {
                    id
                }
            } else {
                context.resources.getIdentifier("widget_small", "layout", context.packageName)
            }
            
            if (layoutId == 0) {
                // Resources not found - return empty RemoteViews
                return RemoteViews(context.packageName, android.R.layout.simple_list_item_1)
            }

            val views = RemoteViews(context.packageName, layoutId)

            // Get resource IDs dynamically
            val balanceId = context.resources.getIdentifier("widget_balance", "id", context.packageName)
            val incomeId = context.resources.getIdentifier("widget_income", "id", context.packageName)
            val expensesId = context.resources.getIdentifier("widget_expenses", "id", context.packageName)
            val addButtonId = context.resources.getIdentifier("widget_add_button", "id", context.packageName)
            val containerId = context.resources.getIdentifier("widget_container", "id", context.packageName)

            // Set balance
            if (balanceId != 0) {
                views.setTextViewText(
                    balanceId,
                    dataManager.formatCurrency(widgetData.balance, widgetData.currencySymbol)
                )
            }

            // Set income and expenses for large widget
            if (isLarge) {
                if (incomeId != 0) {
                    views.setTextViewText(
                        incomeId,
                        dataManager.formatCurrency(widgetData.monthlyIncome, widgetData.currencySymbol)
                    )
                }
                if (expensesId != 0) {
                    views.setTextViewText(
                        expensesId,
                        dataManager.formatCurrency(widgetData.monthlyExpenses, widgetData.currencySymbol)
                    )
                }
            }

            // Set up click intent for add button
            val addIntent = Intent(context, MainActivity::class.java).apply {
                action = Intent.ACTION_VIEW
                data = Uri.parse("finly://add-transaction")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val addPendingIntent = PendingIntent.getActivity(
                context,
                0,
                addIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            if (addButtonId != 0) {
                views.setOnClickPendingIntent(addButtonId, addPendingIntent)
            }

            // Set up click intent for widget (opens app)
            val appIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val appPendingIntent = PendingIntent.getActivity(
                context,
                1,
                appIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            if (containerId != 0) {
                views.setOnClickPendingIntent(containerId, appPendingIntent)
            }

            return views
        }
    }
}

