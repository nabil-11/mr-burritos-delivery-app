import { useState, useEffect } from 'react';
import {
  IonPage, IonContent, IonRefresher, IonRefresherContent,
  IonSpinner, IonHeader, IonToolbar, IonIcon,
} from '@ionic/react';
import { barChartOutline, menuOutline, bicycleOutline, cashOutline, checkmarkDoneOutline, timeOutline } from 'ionicons/icons';
import { ordersService, Order } from '../common/api';
import { useAuth } from '../auth/AuthContext';
import { useTokens } from '../../context/ThemeContext';

function StatCard({ label, value, sub, color, icon, T }: {
  label: string; value: string | number; sub?: string; color: string; icon: string;
  T: ReturnType<typeof useTokens>;
}) {
  return (
    <div style={{
      background: T.surface, borderRadius: 16, padding: '16px',
      border: `1px solid ${T.border}`, flex: 1, minWidth: 0,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, marginBottom: 10,
        background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <IonIcon icon={icon} style={{ color, fontSize: 18 }} />
      </div>
      <p style={{ margin: 0, color: T.text2, fontSize: 12, fontWeight: 600 }}>{label}</p>
      <p style={{ margin: '4px 0 0', color: T.text1, fontSize: 22, fontWeight: 900 }}>{value}</p>
      {sub && <p style={{ margin: '2px 0 0', color: T.text3, fontSize: 11 }}>{sub}</p>}
    </div>
  );
}

function filterByPeriod(orders: Order[], period: 'today' | 'week' | 'month'): Order[] {
  const now = new Date();
  return orders.filter(o => {
    const d = new Date(o.createdAt);
    if (period === 'today') {
      return d.toDateString() === now.toDateString();
    }
    if (period === 'week') {
      const diff = (now.getTime() - d.getTime()) / 86400000;
      return diff <= 7;
    }
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
}

export default function Statistics({ onMenuOpen }: { onMenuOpen?: () => void }) {
  const { user } = useAuth();
  const T = useTokens();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  const fetchData = async () => {
    if (!user) return;
    try {
      const data = await ordersService.getMyOrders(user.id);
      setAllOrders(data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleRefresh = async (e: CustomEvent) => { await fetchData(); e.detail.complete(); };

  const periodOrders = filterByPeriod(allOrders, period);
  const delivered = periodOrders.filter(o => o.status === 'delivered');
  const inProgress = allOrders.filter(o => o.status === 'preparing' || o.status === 'ready');
  const totalFees = delivered.reduce((sum, o) => sum + (o.deliveryFee ?? 0), 0);
  const totalDelivered = allOrders.filter(o => o.status === 'delivered').length;

  const PERIODS = [
    { key: 'today', label: "Aujourd'hui" },
    { key: 'week', label: '7 jours' },
    { key: 'month', label: 'Ce mois' },
  ] as const;

  return (
    <IonPage>
      <IonHeader style={{ background: T.headerBg, borderBottom: `1px solid ${T.headerBorder}` }}>
        <IonToolbar style={{ '--background': 'transparent', '--border-color': 'transparent', padding: '12px 16px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <button onClick={onMenuOpen} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <IonIcon icon={menuOutline} style={{ color: T.text2, fontSize: 24 }} />
            </button>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, color: T.text1, fontWeight: 800, fontSize: 18 }}>Statistiques</p>
              <p style={{ margin: 0, color: T.text3, fontSize: 12 }}>{totalDelivered} livraison{totalDelivered !== 1 ? 's' : ''} au total</p>
            </div>
          </div>

          {/* Period tabs */}
          <div style={{ display: 'flex', gap: 6, background: T.tabInactive, borderRadius: 12, padding: 4 }}>
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                style={{
                  flex: 1, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12,
                  background: period === p.key ? '#10B981' : 'transparent',
                  color: period === p.key ? '#fff' : T.tabText,
                  transition: 'all 0.2s',
                }}
              >
                {p.label}
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
              <IonSpinner name="crescent" style={{ color: '#10B981', width: 36, height: 36 }} />
            </div>
          ) : (
            <>
              {/* Stats grid */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <StatCard T={T}
                  label="Livrées"
                  value={delivered.length}
                  sub={period === 'today' ? "aujourd'hui" : period === 'week' ? 'cette semaine' : 'ce mois'}
                  color="#10B981"
                  icon={checkmarkDoneOutline}
                />
                <StatCard T={T}
                  label="Gains livraison"
                  value={`${totalFees.toFixed(1)} DT`}
                  sub="frais collectés"
                  color="#F5A800"
                  icon={cashOutline}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <StatCard T={T}
                  label="En cours"
                  value={inProgress.length}
                  sub="active maintenant"
                  color="#3B82F6"
                  icon={bicycleOutline}
                />
                <StatCard T={T}
                  label="Total général"
                  value={totalDelivered}
                  sub="toutes périodes"
                  color="#8B5CF6"
                  icon={barChartOutline}
                />
              </div>

              {/* Recent deliveries */}
              {delivered.length > 0 && (
                <>
                  <p style={{ margin: '0 0 12px', color: T.text3, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
                    LIVRAISONS RÉCENTES
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {delivered.slice(0, 10).map(order => (
                      <div key={order._id} style={{
                        background: T.surface, borderRadius: 14, padding: '12px 14px',
                        border: `1px solid ${T.border}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          <p style={{ margin: 0, color: '#F5A800', fontWeight: 800, fontSize: 13 }}>
                            #{order.orderNumber}
                          </p>
                          <p style={{ margin: '2px 0 0', color: T.text1, fontSize: 13 }}>
                            {order.customer.name}
                          </p>
                          <p style={{ margin: '2px 0 0', color: T.text3, fontSize: 11 }}>
                            <IonIcon icon={timeOutline} style={{ fontSize: 11, marginRight: 3 }} />
                            {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ margin: 0, color: '#10B981', fontWeight: 800, fontSize: 15 }}>
                            {typeof order.deliveryFee === 'number' && order.deliveryFee > 0
                              ? `+${order.deliveryFee} DT`
                              : '0 DT'}
                          </p>
                          <p style={{ margin: '2px 0 0', color: T.text3, fontSize: 11 }}>Frais livraison</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {delivered.length === 0 && !loading && (
                <div style={{ textAlign: 'center', paddingTop: 40 }}>
                  <p style={{ fontSize: 42, margin: '0 0 12px' }}>📊</p>
                  <p style={{ color: T.text2, fontSize: 15, fontWeight: 600 }}>Aucune livraison</p>
                  <p style={{ color: T.text3, fontSize: 13 }}>pour cette période</p>
                </div>
              )}
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
