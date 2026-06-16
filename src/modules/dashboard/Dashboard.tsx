import { useState, useEffect, useCallback } from 'react';
import {
  IonPage, IonContent, IonRefresher, IonRefresherContent,
  IonSpinner, IonHeader, IonToolbar, IonIcon,
} from '@ionic/react';
import {
  menuOutline, restaurantOutline, bicycleOutline, cashOutline,
  checkmarkDoneOutline, timeOutline, alertCircleOutline,
  calendarOutline, closeCircleOutline, bicycleSharp,
} from 'ionicons/icons';
import { ordersService, Order } from '../common/api';
import { useAuth } from '../auth/AuthContext';
import { useTokens } from '../../context/ThemeContext';

// ─── Types ────────────────────────────────────────────────────────────────────
type Period = 'today' | 'week' | 'month' | 'custom';

// ─── Filter helper ────────────────────────────────────────────────────────────
function filterByPeriod(orders: Order[], period: Period, from: string, to: string): Order[] {
  const now = new Date();
  return orders.filter(o => {
    const d = new Date(o.createdAt);
    switch (period) {
      case 'today':
        return d.toDateString() === now.toDateString();
      case 'week': {
        const diff = (now.getTime() - d.getTime()) / 86_400_000;
        return diff <= 7;
      }
      case 'month':
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      case 'custom': {
        if (!from || !to) return true;
        const start = new Date(from);
        const end   = new Date(to);
        end.setHours(23, 59, 59, 999);
        return d >= start && d <= end;
      }
      default:
        return true;
    }
  });
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "à l'instant";
  if (diff < 60) return `${diff} min`;
  return `${Math.floor(diff / 60)}h`;
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:   { bg: 'rgba(245,158,11,0.15)',  text: '#F59E0B' },
  confirmed: { bg: 'rgba(59,130,246,0.15)',  text: '#3B82F6' },
  preparing: { bg: 'rgba(139,92,246,0.15)',  text: '#8B5CF6' },
  ready:     { bg: 'rgba(16,185,129,0.15)',  text: '#10B981' },
  delivered: { bg: 'rgba(107,114,128,0.15)', text: '#9CA3AF' },
  cancelled: { bg: 'rgba(239,68,68,0.15)',   text: '#EF4444' },
};

const STATUS_LABELS: Record<string, string> = {
  pending:   'En attente',
  confirmed: 'Confirmée',
  preparing: 'En préparation',
  ready:     'Prête',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon, T }: {
  label: string; value: string | number; sub?: string; color: string; icon: string;
  T: ReturnType<typeof useTokens>;
}) {
  return (
    <div style={{
      background: T.surface, borderRadius: 18, padding: '16px',
      border: `1px solid ${T.border}`, flex: 1, minWidth: 0,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 11, marginBottom: 10,
        background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <IonIcon icon={icon} style={{ color, fontSize: 19 }} />
      </div>
      <p style={{ margin: 0, color: T.text2, fontSize: 11, fontWeight: 600 }}>{label}</p>
      <p style={{ margin: '4px 0 0', color: T.text1, fontSize: 22, fontWeight: 900 }}>{value}</p>
      {sub && <p style={{ margin: '2px 0 0', color: T.text3, fontSize: 11 }}>{sub}</p>}
    </div>
  );
}

// ─── Mini bar chart ───────────────────────────────────────────────────────────
function MiniBar({ label, count, max, color, T }: {
  label: string; count: number; max: number; color: string;
  T: ReturnType<typeof useTokens>;
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span style={{ color: T.text2, fontSize: 12, fontWeight: 600, width: 90, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: T.surface2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 4, background: color,
          width: `${pct}%`, transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{ color: T.text1, fontSize: 13, fontWeight: 800, width: 24, textAlign: 'right' }}>{count}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Dashboard({ onMenuOpen }: { onMenuOpen?: () => void }) {
  const { user } = useAuth();
  const T = useTokens();

  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading]     = useState(true);
  const [period, setPeriod]       = useState<Period>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // ── today string for input max ──
  const todayStr = new Date().toISOString().slice(0, 10);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await ordersService.getAll();
      setAllOrders(data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchOrders();
  }, [fetchOrders]);

  const handleRefresh = async (e: CustomEvent) => { await fetchOrders(); e.detail.complete(); };

  // ── Filtered orders for current period ──
  const periodOrders = filterByPeriod(allOrders, period, customFrom, customTo);

  // Apply status filter on top
  const displayOrders = statusFilter
    ? periodOrders.filter(o => o.status === statusFilter)
    : periodOrders;

  // ── Stats computed from period orders ──
  const totalOrders      = periodOrders.length;
  const deliveryOrders   = periodOrders.filter(o => o.type === 'delivery');
  const deliveredOrders  = periodOrders.filter(o => o.status === 'delivered');
  const cancelledOrders  = periodOrders.filter(o => o.status === 'cancelled');
  const pendingOrders    = periodOrders.filter(o => o.status === 'pending');
  const totalDeliveryFee = deliveryOrders.reduce((s, o) => s + (o.deliveryFee ?? 0), 0);

  // Status distribution for mini chart
  const statusDist = [
    { label: 'En attente',   count: periodOrders.filter(o => o.status === 'pending').length,   color: '#F59E0B' },
    { label: 'Confirmée',    count: periodOrders.filter(o => o.status === 'confirmed').length,  color: '#3B82F6' },
    { label: 'En prépa.',    count: periodOrders.filter(o => o.status === 'preparing').length,  color: '#8B5CF6' },
    { label: 'Prête',        count: periodOrders.filter(o => o.status === 'ready').length,      color: '#10B981' },
    { label: 'Livrée',       count: deliveredOrders.length,                                     color: '#6B7280' },
    { label: 'Annulée',      count: cancelledOrders.length,                                     color: '#EF4444' },
  ];
  const maxDist = Math.max(...statusDist.map(s => s.count), 1);

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'today',  label: "Auj." },
    { key: 'week',   label: '7j'   },
    { key: 'month',  label: 'Mois' },
    { key: 'custom', label: '📅'   },
  ];

  const STATUS_FILTERS = [
    { value: '',          label: 'Tout' },
    { value: 'pending',   label: 'Attente' },
    { value: 'confirmed', label: 'Confirmé' },
    { value: 'preparing', label: 'Prépa' },
    { value: 'ready',     label: 'Prête' },
    { value: 'delivered', label: 'Livrée' },
    { value: 'cancelled', label: 'Annulée' },
  ];

  const periodLabel =
    period === 'today' ? "aujourd'hui" :
    period === 'week'  ? 'cette semaine' :
    period === 'month' ? 'ce mois' :
    (customFrom && customTo)
      ? `${new Date(customFrom).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} → ${new Date(customTo).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`
      : 'personnalisé';

  return (
    <IonPage>
      {/* ── Header ── */}
      <IonHeader style={{ background: T.headerBg, borderBottom: `1px solid ${T.headerBorder}` }}>
        <IonToolbar style={{ '--background': 'transparent', '--border-color': 'transparent', padding: '12px 16px 8px' }}>

          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <button onClick={onMenuOpen} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <IonIcon icon={menuOutline} style={{ color: T.text2, fontSize: 24 }} />
            </button>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, color: T.text1, fontWeight: 800, fontSize: 18 }}>Dashboard</p>
              <p style={{ margin: 0, color: T.text3, fontSize: 12 }}>
                {user?.name} • {periodLabel} • {totalOrders} commande{totalOrders !== 1 ? 's' : ''}
              </p>
            </div>
            {pendingOrders.length > 0 && (
              <div style={{
                background: '#EF4444', color: '#fff',
                borderRadius: 12, padding: '4px 10px', fontSize: 12, fontWeight: 800,
              }}>
                {pendingOrders.length} en attente
              </div>
            )}
          </div>

          {/* Period tabs */}
          <div style={{ display: 'flex', gap: 6, background: T.tabInactive, borderRadius: 12, padding: 4, marginBottom: 8 }}>
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                style={{
                  flex: 1, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: 13,
                  background: period === p.key ? '#F5A800' : 'transparent',
                  color: period === p.key ? '#000' : T.tabText,
                  transition: 'all 0.2s',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom date range picker */}
          {period === 'custom' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 4px', color: T.text3, fontSize: 10, fontWeight: 600 }}>DU</p>
                <input
                  type="date"
                  value={customFrom}
                  max={customTo || todayStr}
                  onChange={e => setCustomFrom(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    background: T.inputBg, color: T.text1,
                    border: `1px solid ${customFrom ? '#F5A800' : T.inputBorder}`,
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 4px', color: T.text3, fontSize: 10, fontWeight: 600 }}>AU</p>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  max={todayStr}
                  onChange={e => setCustomTo(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    background: T.inputBg, color: T.text1,
                    border: `1px solid ${customTo ? '#F5A800' : T.inputBorder}`,
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              {(customFrom || customTo) && (
                <button
                  onClick={() => { setCustomFrom(''); setCustomTo(''); }}
                  style={{
                    alignSelf: 'flex-end', background: 'none', border: 'none',
                    cursor: 'pointer', padding: '8px 4px',
                  }}
                >
                  <IonIcon icon={closeCircleOutline} style={{ color: '#EF4444', fontSize: 22 }} />
                </button>
              )}
            </div>
          )}

          {/* Status filter chips */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                style={{
                  flexShrink: 0, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
                  padding: '0 10px', fontWeight: 700, fontSize: 11,
                  background: statusFilter === f.value
                    ? (f.value ? STATUS_COLORS[f.value]?.bg ?? '#F5A80030' : `${T.text1}15`)
                    : T.surface2,
                  color: statusFilter === f.value
                    ? (f.value ? STATUS_COLORS[f.value]?.text ?? T.text1 : T.text1)
                    : T.tabText,
                  transition: 'all 0.2s',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ '--background': T.appBg }}>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div style={{ padding: '16px 14px 80px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
              <IonSpinner name="crescent" style={{ color: '#F5A800', width: 36, height: 36 }} />
            </div>
          ) : (
            <>
              {/* ── KPI cards row 1 ── */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <StatCard T={T} label="Commandes" value={totalOrders}
                  sub={periodLabel} color="#F5A800" icon={restaurantOutline} />
                <StatCard T={T} label="Livraisons" value={deliveryOrders.length}
                  sub={`${deliveredOrders.length} livrées`} color="#10B981" icon={bicycleOutline} />
              </div>

              {/* ── KPI cards row 2 ── */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <StatCard T={T} label="Frais livraison" value={`${totalDeliveryFee.toFixed(2)} DT`}
                  sub="total collecté" color="#3B82F6" icon={cashOutline} />
                <StatCard T={T} label="Livrées" value={deliveredOrders.length}
                  sub={`${cancelledOrders.length} annulée${cancelledOrders.length !== 1 ? 's' : ''}`}
                  color="#8B5CF6" icon={checkmarkDoneOutline} />
              </div>

              {/* ── Status distribution chart ── */}
              {totalOrders > 0 && (
                <div style={{
                  background: T.surface, borderRadius: 18, padding: '16px',
                  border: `1px solid ${T.border}`, marginBottom: 20,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <IonIcon icon={calendarOutline} style={{ color: '#F5A800', fontSize: 16 }} />
                    <p style={{ margin: 0, color: T.text1, fontWeight: 700, fontSize: 14 }}>
                      Répartition par statut
                    </p>
                  </div>
                  {statusDist.filter(s => s.count > 0).map(s => (
                    <MiniBar key={s.label} T={T} label={s.label} count={s.count} max={maxDist} color={s.color} />
                  ))}
                  {statusDist.every(s => s.count === 0) && (
                    <p style={{ margin: 0, color: T.text3, fontSize: 13, textAlign: 'center' }}>Aucune donnée</p>
                  )}
                </div>
              )}

              {/* ── Delivery fees summary ── */}
              {deliveryOrders.length > 0 && (
                <div style={{
                  background: T.surface, borderRadius: 18, padding: '16px',
                  border: `1px solid ${T.border}`, marginBottom: 20,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <IonIcon icon={cashOutline} style={{ color: '#10B981', fontSize: 16 }} />
                    <p style={{ margin: 0, color: T.text1, fontWeight: 700, fontSize: 14 }}>
                      Récap. frais de livraison
                    </p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    {[
                      { label: 'Total', value: `${totalDeliveryFee.toFixed(2)} DT`, color: '#10B981' },
                      { label: 'Livraisons', value: deliveryOrders.length, color: '#3B82F6' },
                      { label: 'Moy. / liv.', value: deliveryOrders.length > 0
                          ? `${(totalDeliveryFee / deliveryOrders.length).toFixed(1)} DT`
                          : '—',
                        color: '#F5A800' },
                    ].map(item => (
                      <div key={item.label} style={{
                        background: T.surface2, borderRadius: 12, padding: '10px',
                        textAlign: 'center',
                      }}>
                        <p style={{ margin: 0, color: T.text3, fontSize: 10, fontWeight: 600 }}>{item.label}</p>
                        <p style={{ margin: '4px 0 0', color: item.color, fontWeight: 900, fontSize: 15 }}>
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Orders list ── */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={{ margin: 0, color: T.text3, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
                  COMMANDES ({displayOrders.length})
                </p>
                {statusFilter && (
                  <button
                    onClick={() => setStatusFilter('')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <IonIcon icon={closeCircleOutline} style={{ color: '#EF4444', fontSize: 16 }} />
                    <span style={{ color: '#EF4444', fontSize: 12, fontWeight: 600 }}>Effacer filtre</span>
                  </button>
                )}
              </div>

              {displayOrders.length === 0 ? (
                <div style={{ textAlign: 'center', paddingTop: 32 }}>
                  <p style={{ fontSize: 40, margin: '0 0 10px' }}>📋</p>
                  <p style={{ color: T.text2, fontSize: 15, fontWeight: 600 }}>Aucune commande</p>
                  <p style={{ color: T.text3, fontSize: 13 }}>pour cette période</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {displayOrders.map(order => {
                    const ss = STATUS_COLORS[order.status] ?? STATUS_COLORS.pending;
                    return (
                      <div key={order._id} style={{
                        background: T.surface, borderRadius: 16, padding: '14px 16px',
                        border: `1px solid ${T.border}`,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                              <span style={{ color: '#F5A800', fontWeight: 800, fontSize: 13 }}>#{order.orderNumber}</span>
                              <span style={{
                                background: order.type === 'delivery' ? 'rgba(16,185,129,0.12)' : 'rgba(245,168,0,0.12)',
                                color: order.type === 'delivery' ? '#10B981' : '#F5A800',
                                fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '2px 6px',
                              }}>
                                {order.type === 'delivery' ? '🛵 Livraison' : '🏠 À emporter'}
                              </span>
                            </div>
                            <p style={{ margin: 0, color: T.text1, fontWeight: 700, fontSize: 14 }}>{order.customer.name}</p>
                            <p style={{ margin: '2px 0 0', color: T.text3, fontSize: 12 }}>
                              <IonIcon icon={timeOutline} style={{ fontSize: 11, marginRight: 3 }} />
                              {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                              })}
                              {' — '}{timeAgo(order.createdAt)}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              background: ss.bg, borderRadius: 8, padding: '4px 10px', marginBottom: 4,
                            }}>
                              <span style={{ color: ss.text, fontSize: 11, fontWeight: 700 }}>
                                {STATUS_LABELS[order.status] ?? order.status}
                              </span>
                            </div>
                            <p style={{ margin: 0, color: T.text1, fontWeight: 800, fontSize: 14 }}>{order.total} DT</p>
                            {order.type === 'delivery' && typeof order.deliveryFee === 'number' && (
                              <p style={{ margin: '2px 0 0', color: '#10B981', fontSize: 11, fontWeight: 600 }}>
                                +{order.deliveryFee} DT frais
                              </p>
                            )}
                          </div>
                        </div>

                        {order.assignedDelivery && (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: 'rgba(16,185,129,0.08)', borderRadius: 10, padding: '6px 10px',
                          }}>
                            <IonIcon icon={bicycleSharp} style={{ color: '#10B981', fontSize: 14 }} />
                            <span style={{ color: '#34D399', fontSize: 12, fontWeight: 600 }}>Livreur assigné</span>
                          </div>
                        )}

                        {order.status === 'pending' && (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 6, marginTop: 6,
                            background: 'rgba(239,68,68,0.08)', borderRadius: 10, padding: '6px 10px',
                          }}>
                            <IonIcon icon={alertCircleOutline} style={{ color: '#EF4444', fontSize: 14 }} />
                            <span style={{ color: '#F87171', fontSize: 12, fontWeight: 600 }}>En attente de confirmation</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
