import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  subscribeToNotifications,
  getNotificationsByUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../../lib/firestore";
import { Badge } from "../ui";
import { FiBell } from "react-icons/fi";
import { formatRelativeDate } from "../../lib/constants";

function toDate(value) {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  return new Date(value);
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!user?.uid) return undefined;

    let cancelled = false;
    let unsub = () => {};
    let pollId;

    const loadFallback = () => {
      getNotificationsByUser(user.uid, true)
        .then((rows) => {
          if (!cancelled) setItems(rows);
        })
        .catch(console.error);
    };

    unsub = subscribeToNotifications(
      user.uid,
      (rows) => {
        if (!cancelled) setItems(rows);
      },
      () => {
        // Listener failed: poll instead of crashing (do not also poll while snapshot works)
        loadFallback();
        if (!pollId) pollId = window.setInterval(loadFallback, 15000);
      }
    );

    return () => {
      cancelled = true;
      unsub();
      if (pollId) window.clearInterval(pollId);
    };
  }, [user?.uid]);

  const unread = items.length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        aria-label="Notifications"
      >
        <FiBell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <p className="font-semibold text-gray-900">Notifications</p>
              {unread > 0 && (
                <button
                  type="button"
                  className="text-xs font-medium text-primary"
                  onClick={async () => {
                    await markAllNotificationsAsRead(user.uid);
                    setItems([]);
                  }}
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-500">You&apos;re all caught up</p>
              ) : (
                items.map((n) => (
                  <Link
                    key={n.id}
                    to={n.link || "#"}
                    onClick={async () => {
                      await markNotificationAsRead(n.id);
                      setOpen(false);
                    }}
                    className="block border-b border-gray-50 px-4 py-3 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      <Badge variant="info">new</Badge>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{n.message}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {formatRelativeDate(toDate(n.sentAt))}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
