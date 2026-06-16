/**
 * useOrderPoll
 *
 * Polls /orders?status=confirmed&type=delivery every POLL_MS milliseconds.
 * On the first call it records the current set of order IDs as the baseline.
 * On every subsequent call it compares — if a new confirmed delivery order
 * appears it dispatches NEW_DELIVERY_EVENT so Orders.tsx can play the alarm
 * and show an IonAlert, exactly like Glovo / Bolt Food does.
 */

import { useEffect, useRef } from 'react';
import { ordersService, Order } from '../modules/common/api';

export const NEW_DELIVERY_EVENT = 'delivery-app:new-delivery-order';

export interface NewDeliveryDetail {
  count:       number;
  order:       Order;    // first new order — used to populate the alert message
}

const POLL_MS = 15_000; // check every 15 seconds

export function useOrderPoll(enabled: boolean) {
  const knownIds   = useRef<Set<string>>(new Set());
  const ready      = useRef(false);   // false until first successful fetch

  useEffect(() => {
    if (!enabled) return;

    async function check() {
      try {
        const orders     = await ordersService.getConfirmed();
        const currentIds = new Set(orders.map(o => o._id));

        if (!ready.current) {
          // First successful fetch — baseline snapshot, no alert
          knownIds.current = currentIds;
          ready.current    = true;
          return;
        }

        const newOrders = orders.filter(o => !knownIds.current.has(o._id));
        // Update baseline (includes newly appeared + removes accepted ones)
        knownIds.current = currentIds;

        if (newOrders.length > 0) {
          window.dispatchEvent(
            new CustomEvent<NewDeliveryDetail>(NEW_DELIVERY_EVENT, {
              detail: { count: newOrders.length, order: newOrders[0] },
            })
          );
        }
      } catch {
        // Network unavailable — try again next interval
      }
    }

    check(); // immediate first check
    const id = setInterval(check, POLL_MS);

    return () => {
      clearInterval(id);
      ready.current    = false;
      knownIds.current = new Set();
    };
  }, [enabled]);
}
