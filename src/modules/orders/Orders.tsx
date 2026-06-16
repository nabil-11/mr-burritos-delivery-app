import { useState, useEffect, useCallback } from 'react';
import {
  IonPage, IonContent, IonRefresher, IonRefresherContent,
  IonSpinner, IonToast, IonAlert, IonHeader, IonToolbar,
} from '@ionic/react';
import { IonIcon } from '@ionic/react';
import {
  bicycleOutline, locationOutline, callOutline, checkmarkCircleOutline,
  timeOutline, alertCircleOutline, menuOutline, cashOutline,
} from 'ionicons/icons';
import { ordersService, Order } from '../common/api';
import { useAuth } from '../auth/AuthContext';
import { useTokens } from '../../context/ThemeContext';
import { useOrderPoll, NEW_DELIVERY_EVENT, NewDeliveryDetail } from '../../hooks/useOrderPoll';
import { startAlarm, stopAlarm } from '../../hooks/useAlarm';

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  confirmed: { bg: 'rgba(59,130,246,0.12)', text: '#60A5FA', dot: '#3B82F6' },
  preparing:  { bg: 'rgba(139,92,246,0.12)', text: '#A78BFA', dot: '#8B5CF6' },
  ready:      { bg: 'rgba(16,185,129,0.12)', text: '#34D399', dot: '#10B981' },
  delivered:  { bg: 'rgba(107,114,128,0.12)', text: '#9CA3AF', dot: '#6B7280' },
  cancelled:  { bg: 'rgba(239,68,68,0.12)', text: '#F87171', dot: '#EF4444' },
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmée',
  preparing: 'En préparation',
  ready:     'Prête',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

function getProductName(name: { fr: string; ar: string } | string): string {
  if (typeof name === 'string') return name;
  return name?.fr || name?.ar || '';
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "à l'instant";
  if (diff < 60) return `${diff} min`;
  return `${Math.floor(diff / 60)}h${diff % 60 > 0 ? diff % 60 + 'm' : ''}`;
}

/** Returns { remaining ms, isLate } for a confirmed/preparing order */
function getPrepInfo(order: Order, now: number): { remainingMs: number; isLate: boolean } | null {
  if (!order.confirmedAt || !order.preparationDuration) return null;
  const endMs = new Date(order.confirmedAt).getTime() + order.preparationDuration * 60_000;
  const remainingMs = endMs - now;
  return { remainingMs, isLate: remainingMs < 0 };
}

function formatPrepTime(ms: number): string {
  const totalSec = Math.abs(Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function Orders({ onMenuOpen }: { onMenuOpen?: () => void }) {
  const { user, isAuthenticated } = useAuth();
  const T = useTokens();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [deliveredId, setDeliveredId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmAccept, setConfirmAccept] = useState<{ open: boolean; order: Order | null }>({ open: false, order: null });
  const [toast, setToast] = useState<{ open: boolean; message: string; color: string }>({ open: false, message: '', color: 'success' });
  const [activeTab, setActiveTab] = useState<'available' | 'mine'>('available');
  const [newOrderAlert, setNewOrderAlert] = useState<{ open: boolean; count: number; orderNumber: string; address: string }>
    ({ open: false, count: 0, orderNumber: '', address: '' });

  // ── Poll for new confirmed delivery orders → alarm + alert ──
  useOrderPoll(!!isAuthenticated);

  // ── Listen for new delivery order events from useOrderPoll ──
  useEffect(() => {
    const handle = (e: Event) => {
      const { count, order } = (e as CustomEvent<NewDeliveryDetail>).detail;
      startAlarm();
      setNewOrderAlert({
        open: true,
        count,
        orderNumber: order.orderNumber,
        address: order.customer.address ?? '',
      });
    };
    window.addEventListener(NEW_DELIVERY_EVENT, handle);
    return () => window.removeEventListener(NEW_DELIVERY_EVENT, handle);
  }, []);

  // 1-second ticker for prep timers
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      if (activeTab === 'available') {
        const data = await ordersService.getConfirmed();
        setOrders(data);
      } else if (user) {
        const data = await ordersService.getMyOrders(user.id);
        setOrders(data);
      }
    } catch {
      setToast({ open: true, message: 'Erreur de chargement', color: 'danger' });
    } finally {
      setLoading(false);
    }
  }, [activeTab, user]);

  useEffect(() => {
    setLoading(true);
    fetchOrders();
  }, [fetchOrders]);

  const handleAccept = async (order: Order) => {
    setAcceptingId(order._id);
    try {
      await ordersService.acceptOrder(order._id);
      setToast({ open: true, message: '✓ Commande acceptée !', color: 'success' });
      await fetchOrders();
    } catch {
      setToast({ open: true, message: "Erreur lors de l'acceptation", color: 'danger' });
    } finally {
      setAcceptingId(null);
    }
  };

  const handleMarkDelivered = async (orderId: string) => {
    setDeliveredId(orderId);
    try {
      await ordersService.markDelivered(orderId);
      setToast({ open: true, message: '✓ Livraison confirmée !', color: 'success' });
      await fetchOrders();
    } catch {
      setToast({ open: true, message: 'Erreur', color: 'danger' });
    } finally {
      setDeliveredId(null);
    }
  };

  const handleRefresh = async (e: CustomEvent) => {
    await fetchOrders();
    e.detail.complete();
  };

  const isMyOrder = (order: Order) => order.assignedDelivery === user?.id;

  return (
    <IonPage>
      {/* ── New delivery order notification (Glovo-style) ── */}
      <IonAlert
        isOpen={newOrderAlert.open}
        header="🚴 Nouvelle commande !"
        message={
          newOrderAlert.count > 1
            ? `${newOrderAlert.count} nouvelles commandes de livraison disponibles !`
            : `Commande #${newOrderAlert.orderNumber}${newOrderAlert.address ? ` • ${newOrderAlert.address}` : ''}`
        }
        buttons={[
          {
            text: 'Ignorer',
            role: 'cancel',
            handler: () => {
              stopAlarm();
              setNewOrderAlert(a => ({ ...a, open: false }));
            },
          },
          {
            text: 'Voir les commandes',
            handler: () => {
              stopAlarm();
              setActiveTab('available');
              fetchOrders();
              setNewOrderAlert(a => ({ ...a, open: false }));
            },
          },
        ]}
        onDidDismiss={() => {
          stopAlarm();
          setNewOrderAlert(a => ({ ...a, open: false }));
        }}
      />

      <IonToast
        isOpen={toast.open}
        message={toast.message}
        duration={2500}
        color={toast.color}
        onDidDismiss={() => setToast(t => ({ ...t, open: false }))}
      />

      <IonAlert
        isOpen={confirmAccept.open}
        header="Accepter la commande"
        message={confirmAccept.order
          ? `Accepter la commande #${confirmAccept.order.orderNumber} — ${confirmAccept.order.customer.name} ?`
          : ''}
        buttons={[
          { text: 'Annuler', role: 'cancel' },
          {
            text: 'Accepter',
            handler: () => {
              if (confirmAccept.order) handleAccept(confirmAccept.order);
              setConfirmAccept({ open: false, order: null });
            },
          },
        ]}
        onDidDismiss={() => setConfirmAccept({ open: false, order: null })}
      />

      {/* Header */}
      <IonHeader style={{ background: T.headerBg, borderBottom: `1px solid ${T.headerBorder}` }}>
        <IonToolbar style={{ '--background': 'transparent', '--border-color': 'transparent', padding: '12px 16px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onMenuOpen} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <IonIcon icon={menuOutline} style={{ color: T.text2, fontSize: 24 }} />
            </button>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, color: T.text1, fontWeight: 800, fontSize: 18 }}>Commandes</p>
              <p style={{ margin: 0, color: T.text3, fontSize: 12 }}>
                {orders.length} commande{orders.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div style={{
              background: 'rgba(16,185,129,0.15)', borderRadius: 8, padding: '4px 10px',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <IonIcon icon={bicycleOutline} style={{ color: '#10B981', fontSize: 16 }} />
              <span style={{ color: '#10B981', fontWeight: 700, fontSize: 12 }}>{user?.name?.split(' ')[0]}</span>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, background: T.tabInactive, borderRadius: 12, padding: 4 }}>
            {(['available', 'mine'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                  background: activeTab === tab ? (tab === 'available' ? '#10B981' : '#3B82F6') : 'transparent',
                  color: activeTab === tab ? '#fff' : T.tabText,
                  transition: 'all 0.2s',
                }}
              >
                {tab === 'available' ? '🟢 Disponibles' : '🚴 Mes livraisons'}
              </button>
            ))}
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ '--background': T.appBg }}>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div style={{ padding: '12px 14px 80px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
              <IonSpinner name="crescent" style={{ color: '#10B981', width: 36, height: 36 }} />
            </div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 80 }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>🛵</div>
              <p style={{ color: T.text2, fontSize: 15, fontWeight: 600 }}>
                {activeTab === 'available' ? 'Aucune commande disponible' : 'Aucune livraison en cours'}
              </p>
              <p style={{ color: T.text3, fontSize: 13 }}>Revenez dans quelques instants</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {orders.map(order => {
                const ss         = STATUS_COLORS[order.status] ?? STATUS_COLORS.confirmed;
                const isExpanded = expandedId === order._id;
                const isAccepting = acceptingId === order._id;
                const isDelivering = deliveredId === order._id;
                const mine       = isMyOrder(order);
                const prepInfo   = getPrepInfo(order, now);
                const isLate     = prepInfo?.isLate ?? false;

                return (
                  <div
                    key={order._id}
                    style={{
                      background: isLate ? 'rgba(239,68,68,0.07)' : T.surface,
                      borderRadius: 18,
                      border: `1px solid ${
                        isLate
                          ? 'rgba(239,68,68,0.3)'
                          : mine
                          ? 'rgba(16,185,129,0.25)'
                          : T.border
                      }`,
                      overflow: 'hidden',
                    }}
                  >
                    {/* ── Prep timer bar ── */}
                    {prepInfo && (
                      <div style={{
                        padding: '8px 16px',
                        background: isLate
                          ? 'rgba(239,68,68,0.12)'
                          : 'rgba(245,168,0,0.08)',
                        borderBottom: `1px solid ${isLate ? 'rgba(239,68,68,0.2)' : 'rgba(245,168,0,0.15)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <IonIcon
                            icon={timeOutline}
                            style={{ color: isLate ? '#EF4444' : '#F5A800', fontSize: 15 }}
                          />
                          <span style={{ color: isLate ? '#F87171' : '#FCD34D', fontSize: 12, fontWeight: 600 }}>
                            {isLate ? 'En retard !' : 'Temps de préparation'}
                          </span>
                        </div>
                        <span style={{
                          color: isLate ? '#EF4444' : '#F5A800',
                          fontWeight: 900, fontSize: 15, fontVariantNumeric: 'tabular-nums',
                          letterSpacing: 1,
                        }}>
                          {isLate ? `-${formatPrepTime(prepInfo.remainingMs)}` : formatPrepTime(prepInfo.remainingMs)}
                        </span>
                      </div>
                    )}

                    {/* Card body */}
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : order._id)}
                      style={{ padding: '14px 16px', cursor: 'pointer' }}
                    >
                      {/* Top row: order # + status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ color: '#F5A800', fontWeight: 800, fontSize: 14 }}>#{order.orderNumber}</span>
                            {mine && (
                              <span style={{
                                background: 'rgba(16,185,129,0.15)', color: '#10B981',
                                fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '2px 6px',
                              }}>MA LIVRAISON</span>
                            )}
                          </div>
                          <p style={{ margin: 0, color: T.text1, fontWeight: 700, fontSize: 15 }}>
                            {order.customer.name}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            background: ss.bg, borderRadius: 8, padding: '4px 10px', marginBottom: 4,
                          }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: ss.dot }} />
                            <span style={{ color: ss.text, fontSize: 11, fontWeight: 700 }}>
                              {STATUS_LABELS[order.status] ?? order.status}
                            </span>
                          </div>
                          <p style={{ margin: 0, color: T.text3, fontSize: 11 }}>
                            {timeAgo(order.createdAt)}
                          </p>
                        </div>
                      </div>

                      {/* Address */}
                      {order.customer.address && (
                        <div style={{
                          display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 10,
                          background: 'rgba(59,130,246,0.08)', borderRadius: 10, padding: '8px 12px',
                        }}>
                          <IonIcon icon={locationOutline} style={{ color: '#60A5FA', fontSize: 14, marginTop: 1, flexShrink: 0 }} />
                          <span style={{ color: '#93C5FD', fontSize: 13 }}>{order.customer.address}</span>
                        </div>
                      )}

                      {/* Fee & total row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                        <div style={{ display: 'flex', gap: 16 }}>
                          {/* Order total */}
                          <div>
                            <p style={{ margin: 0, color: T.text3, fontSize: 11 }}>Commande</p>
                            <p style={{ margin: 0, color: T.text1, fontWeight: 700, fontSize: 14 }}>{order.total} DT</p>
                          </div>
                          {/* Delivery fee — always shown */}
                          <div>
                            <p style={{ margin: 0, color: T.text3, fontSize: 11 }}>Frais livraison</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <IonIcon icon={cashOutline} style={{ color: '#10B981', fontSize: 13 }} />
                              <p style={{ margin: 0, color: '#10B981', fontWeight: 700, fontSize: 14 }}>
                                {typeof order.deliveryFee === 'number' && order.deliveryFee > 0
                                  ? `${order.deliveryFee} DT`
                                  : '0 DT'}
                              </p>
                            </div>
                          </div>
                          {/* Prep duration label */}
                          {order.preparationDuration && (
                            <div>
                              <p style={{ margin: 0, color: T.text3, fontSize: 11 }}>Préparation</p>
                              <p style={{ margin: 0, color: '#A78BFA', fontWeight: 700, fontSize: 14 }}>
                                {order.preparationDuration} min
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Call + map buttons */}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <a
                            href={`tel:${order.customer.phone}`}
                            onClick={e => e.stopPropagation()}
                            style={{
                              width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center',
                              justifyContent: 'center', background: 'rgba(16,185,129,0.12)', textDecoration: 'none',
                            }}
                          >
                            <IonIcon icon={callOutline} style={{ color: '#10B981', fontSize: 17 }} />
                          </a>
                          {order.customer.latitude && order.customer.longitude && (
                            <a
                              href={`https://maps.google.com/?q=${order.customer.latitude},${order.customer.longitude}`}
                              target="_blank" rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{
                                width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', background: 'rgba(59,130,246,0.12)', textDecoration: 'none',
                              }}
                            >
                              <IonIcon icon={locationOutline} style={{ color: '#60A5FA', fontSize: 17 }} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded items */}
                    {isExpanded && order.items && order.items.length > 0 && (
                      <div style={{ borderTop: `1px solid ${T.border}`, padding: '12px 16px' }}>
                        <p style={{ margin: '0 0 8px', color: T.text3, fontSize: 12, fontWeight: 600 }}>ARTICLES</p>
                        {order.items.map((item, i) => (
                          <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '6px 0',
                            borderBottom: i < order.items!.length - 1 ? `1px solid ${T.border}` : 'none',
                          }}>
                            <span style={{ color: T.text1, fontSize: 13 }}>
                              {item.quantity}× {getProductName(item.productName)}
                            </span>
                            <span style={{ color: T.text2, fontSize: 13 }}>
                              {(item.unitPrice * item.quantity).toFixed(2)} DT
                            </span>
                          </div>
                        ))}
                        {order.notes && (
                          <div style={{
                            marginTop: 10, background: 'rgba(245,158,11,0.08)',
                            borderRadius: 10, padding: '8px 12px',
                          }}>
                            <p style={{ margin: 0, color: '#FCD34D', fontSize: 12 }}>📝 {order.notes}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ padding: '10px 16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {/* Accept — available tab, unassigned confirmed orders */}
                      {activeTab === 'available' && order.status === 'confirmed' && !order.assignedDelivery && (
                        <button
                          onClick={() => setConfirmAccept({ open: true, order })}
                          disabled={!!isAccepting}
                          style={{
                            width: '100%', height: 46, borderRadius: 12, border: 'none', cursor: 'pointer',
                            background: 'linear-gradient(135deg, #10B981, #059669)',
                            color: '#fff', fontWeight: 800, fontSize: 15,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            boxShadow: '0 4px 16px rgba(16,185,129,0.35)',
                            opacity: isAccepting ? 0.7 : 1,
                          }}
                        >
                          {isAccepting
                            ? <IonSpinner name="crescent" style={{ color: '#fff', width: 18, height: 18 }} />
                            : <><IonIcon icon={checkmarkCircleOutline} style={{ fontSize: 19 }} /> Accepter la livraison</>
                          }
                        </button>
                      )}

                      {/* Mark delivered — my preparing/ready orders */}
                      {mine && (order.status === 'preparing' || order.status === 'ready') && (
                        <button
                          onClick={() => handleMarkDelivered(order._id)}
                          disabled={!!isDelivering}
                          style={{
                            width: '100%', height: 46, borderRadius: 12, border: 'none', cursor: 'pointer',
                            background: 'linear-gradient(135deg, #374151, #1F2937)',
                            color: '#fff', fontWeight: 800, fontSize: 15,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                            opacity: isDelivering ? 0.7 : 1,
                          }}
                        >
                          {isDelivering
                            ? <IonSpinner name="crescent" style={{ color: '#fff', width: 18, height: 18 }} />
                            : <><IonIcon icon={checkmarkCircleOutline} style={{ fontSize: 19 }} /> Confirmer la livraison</>
                          }
                        </button>
                      )}

                      {/* Waiting for kitchen */}
                      {mine && order.status === 'confirmed' && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                          background: 'rgba(245,168,0,0.08)', borderRadius: 12,
                        }}>
                          <IonIcon icon={timeOutline} style={{ color: '#F5A800', fontSize: 16 }} />
                          <span style={{ color: '#F5A800', fontSize: 13, fontWeight: 600 }}>En attente de préparation</span>
                        </div>
                      )}

                      {order.status === 'delivered' && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                          background: 'rgba(107,114,128,0.08)', borderRadius: 12,
                        }}>
                          <IonIcon icon={alertCircleOutline} style={{ color: '#6B7280', fontSize: 16 }} />
                          <span style={{ color: '#6B7280', fontSize: 13, fontWeight: 600 }}>Livraison terminée</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
