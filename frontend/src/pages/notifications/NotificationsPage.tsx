import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiErrorMessage } from '../../api/auth'
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATION_TITLES,
  type NotificationOut,
} from '../../api/notifications'
import { PageContainer, PageHeader } from '../../layouts'
import { Bell, CheckCheck, Inbox, Clock, ArrowLeft } from 'lucide-react'

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationOut[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const reload = useCallback(() => {
    listNotifications({ limit: 100 })
      .then(({ data }) => setItems(data))
      .catch((err) => setError(apiErrorMessage(err)))
  }, [])

  useEffect(() => {
    let cancelled = false
    listNotifications({ unread_only: filter === 'unread', limit: 100 })
      .then(({ data }) => {
        if (!cancelled) setItems(data)
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [filter])

  const handleRead = async (notification: NotificationOut) => {
    try {
      await markNotificationRead(notification.id)
      reload()
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  const handleReadAll = async () => {
    try {
      await markAllNotificationsRead()
      reload()
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  return (
    <PageContainer narrow>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <PageHeader
          title="Notification Center"
          description="Live updates on orders, escrow milestones, and counter-offer negotiations."
          actions={
            <button
              type="button"
              onClick={handleReadAll}
              disabled={!items || items.length === 0}
              className="rounded-full bg-[var(--primary-emerald)] hover:brightness-110 text-white px-5 py-2 text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All as Read</span>
            </button>
          }
        />
      </div>

      <div className="flex gap-2 mb-6">
        {(['all', 'unread'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={`rounded-full px-5 py-2 text-xs font-bold transition-all ${
              filter === option
                ? 'bg-[var(--primary-emerald)] text-white border border-[var(--primary-emerald)]'
                : 'border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] hover:border-[var(--primary-emerald)]/50'
            }`}
          >
            {option === 'all' ? 'All Alerts' : 'Unread Only'}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-600 mb-4">
          {error}
        </div>
      )}

      {!items ? (
        <div className="space-y-3" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
      <ul className="space-y-3">
        {items?.map((notification) => {
          const isUnread = !notification.read_at
          return (
            <li
              key={notification.id}
              className={`rounded-2xl p-5 border transition-all ${
                isUnread
                  ? 'border-[var(--primary-emerald)]/40 bg-[var(--bg-surface-elevated)] shadow-sm'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Bell className={`w-4 h-4 ${isUnread ? 'text-amber-600' : 'text-[var(--text-muted)]'}`} />
                    <h3 className="font-bold text-sm text-[var(--text-bright)] font-display">
                      {notification.title}
                    </h3>
                    {isUnread && (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--primary-emerald)]/10 border border-[var(--primary-emerald)]/20 text-[10px] font-extrabold uppercase text-[var(--primary-emerald)]">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">{notification.body}</p>
                  <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] font-medium pt-1">
                    <Clock className="w-3 h-3 text-[var(--primary-emerald)]" />
                    <span>{NOTIFICATION_TITLES[notification.notification_type] ?? notification.notification_type}</span>
                    <span>·</span>
                    <span>{new Date(notification.created_at).toLocaleString()}</span>
                  </div>
                </div>

                {isUnread && (
                  <button
                    type="button"
                    onClick={() => handleRead(notification)}
                    className="shrink-0 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-main)] hover:border-[var(--primary-emerald)]/50 transition-colors"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            </li>
          )
        })}

        {items && items.length === 0 && (
          <li className="rounded-2xl p-10 border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-center space-y-2">
            <Inbox className="w-8 h-8 text-[var(--primary-emerald)] mx-auto opacity-60" />
            <p className="text-sm font-bold text-[var(--text-bright)]">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              You will be notified here whenever there are updates to your orders or listings.
            </p>
          </li>
        )}
      </ul>
      )}

      <div className="mt-8">
        <Link
          to="/account"
          className="inline-flex items-center gap-2 text-xs font-bold text-[var(--primary-emerald)] hover:opacity-70"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Account Overview</span>
        </Link>
      </div>
    </PageContainer>
  )
}
