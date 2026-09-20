import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer, PageHeader } from '../layouts';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { listNotifications, markNotificationRead, markAllNotificationsRead, getUnreadNotificationCount, NOTIFICATION_TITLES } from '../api/notifications';
import type { NotificationOut } from '../api/notifications';

const TYPE_TONE: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  payment_received: 'success',
  settlement: 'success',
  order_accepted: 'success',
  verification: 'success',
  quality_confirmation: 'success',
  refund: 'info',
  new_buyer_demand: 'info',
  new_farmer_match: 'info',
  delivery_update: 'info',
  order_request: 'warning',
  batch_ready: 'warning',
  dispute: 'error',
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  registration: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
  ),
  verification: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
  ),
  order_request: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-2.586l1.293-1.293a1 1 0 00-.707-1.707L8 2H3z" clipRule="evenodd" /></svg>
  ),
  payment_received: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4 6a2 2 0 00-2 2v1h16V8a2 2 0 00-2-2H4zM18 10H0v3a2 2 0 002 2h12a2 2 0 002-2v-3zM4 12a1 1 0 011-1h2a1 1 0 110 2H5a1 1 0 01-1-1z" /></svg>
  ),
  dispute: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
  ),
  default: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>
  ),
};

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = React.useState<NotificationOut[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      listNotifications({ limit: 50 }),
      getUnreadNotificationCount(),
    ]).then(([n, c]) => {
      if (cancelled) return;
      if (n.status === 'fulfilled') setItems(n.value.data);
      if (c.status === 'fulfilled') setUnreadCount(c.value.data.unread_count);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const open = async (item: NotificationOut) => {
    if (!item.read_at) {
      await markNotificationRead(item.id);
      setUnreadCount((c) => Math.max(c - 1, 0));
      objectMutating(item);
    }
    const target = targetUrl(item);
    if (target) navigate(target);
  };

  const objectMutating = (item: NotificationOut) => {
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, read_at: it.read_at ?? new Date().toISOString() } : it)));
  };

  const markAll = async () => {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((it) => ({ ...it, read_at: it.read_at ?? new Date().toISOString() })));
      setUnreadCount(0);
      toast({ type: 'success', title: 'All caught up', message: 'Marked all notifications as read.' });
    } catch (err) {
      toast({ type: 'error', title: 'Failed to mark all', message: err instanceof Error ? err.message : 'Please try again.' });
    }
  };

  const targetUrl = (item: NotificationOut): string | null => {
    switch (item.notification_type) {
      case 'order_request':
      case 'order_accepted':
      case 'delivery_update':
      case 'quality_confirmation':
      case 'dispute':
      case 'payment_received':
      case 'settlement':
      case 'batch_ready':
        return '/orders';
      case 'new_buyer_demand':
      case 'new_farmer_match':
        return '/marketplace';
      default:
        return null;
    }
  };

  const visibleItems = unreadOnly ? items.filter((i) => !i.read_at) : items;

  return (
    <PageContainer>
      <PageHeader
        title="Notifications"
        description={
          unreadCount > 0
            ? `${unreadCount} unread · ${items.filter((i) => !i.read_at).length} in this view`
            : 'You are all caught up.'
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setUnreadOnly((v) => !v)}>
              {unreadOnly ? 'Show all' : 'Unread only'}
            </Button>
            <Button variant="outline" size="sm" onClick={markAll} disabled={unreadCount === 0}>
              Mark all read
            </Button>
          </>
        }
      />
      <div className="space-y-2.5" data-testid="notification-list">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center">
            <p className="text-neutral-500">No notifications {unreadOnly ? 'unread' : ''}.</p>
            <Button className="mt-4" variant="outline" onClick={() => navigate('/marketplace')}>
              Browse marketplace
            </Button>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {visibleItems.map((item) => {
              const unread = !item.read_at;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => void open(item)}
                    className={
                      unread
                        ? 'w-full flex items-start gap-4 rounded-2xl bg-white border border-primary-200 p-4 text-left hover:bg-primary-50/50 transition-colors'
                        : 'w-full flex items-start gap-4 rounded-2xl bg-white border border-neutral-200 p-4 text-left hover:bg-neutral-50 transition-colors'
                    }
                  >
                    <div className={unread ? 'h-10 w-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0' : 'h-10 w-10 rounded-xl bg-neutral-100 text-neutral-500 flex items-center justify-center flex-shrink-0'}>
                      {TYPE_ICON[item.notification_type] ?? TYPE_ICON.default}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-neutral-900">{NOTIFICATION_TITLES[item.notification_type] ?? item.title}</span>
                        {unread && <span className="h-2 w-2 rounded-full bg-primary-500" aria-hidden="true" />}
                      </div>
                      <p className="text-sm text-neutral-600 mt-0.5">{item.body}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-neutral-400">
                        <span>{new Date(item.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        <Badge variant={TYPE_TONE[item.notification_type] ?? 'default'} size="sm">
                          {item.notification_type.replaceAll('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
     </PageContainer>
  );
};