import React, { useRef } from 'react';
import { Redirect, Route, useLocation } from 'react-router-dom';
import {
  IonApp, IonRouterOutlet, IonMenu, IonHeader, IonToolbar,
  IonContent, IonList, IonItem, IonIcon, IonLabel,
  IonMenuToggle, setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import {
  bicycleOutline, barChartOutline, gridOutline, logOutOutline,
  moonOutline, sunnyOutline,
} from 'ionicons/icons';
import Login from './modules/auth/Login';
import Orders from './modules/orders/Orders';
import Statistics from './modules/statistics/Statistics';
import Dashboard from './modules/dashboard/Dashboard';
import { AuthProvider, useAuth } from './modules/auth/AuthContext';
import { ThemeProvider, useTheme, useTokens } from './context/ThemeContext';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import './theme/variables.css';

setupIonicReact();

// ─── Nav items per role ───────────────────────────────────────────────────────
const DELIVERY_NAV = [
  { path: '/orders',     label: 'Commandes',    icon: bicycleOutline,  color: '#10B981' },
  { path: '/statistics', label: 'Statistiques', icon: barChartOutline, color: '#3B82F6' },
];

const ADMIN_NAV = [
  { path: '/dashboard',  label: 'Dashboard',    icon: gridOutline,     color: '#F5A800' },
  { path: '/orders',     label: 'Commandes',    icon: bicycleOutline,  color: '#10B981' },
  { path: '/statistics', label: 'Statistiques', icon: barChartOutline, color: '#3B82F6' },
];

// ─── Side menu ────────────────────────────────────────────────────────────────
function AppMenu({ menuRef }: { menuRef: React.RefObject<HTMLIonMenuElement | null> }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const T = useTokens();
  const location = useLocation();
  const navItems = user?.role === 'admin' ? ADMIN_NAV : DELIVERY_NAV;

  const roleLabel = user?.role === 'admin' ? 'Administrateur' : 'Livreur';
  const roleColor = user?.role === 'admin' ? '#F5A800' : '#10B981';

  return (
    <IonMenu ref={menuRef} contentId="delivery-main" type="overlay">
      <IonHeader>
        <IonToolbar style={{ '--background': T.headerBg, '--border-color': 'transparent' }}>
          <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 13, flexShrink: 0,
              background: `linear-gradient(135deg, ${roleColor}, ${user?.role === 'admin' ? '#FF8C00' : '#059669'})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 16px ${roleColor}40`,
            }}>
              <IonIcon icon={user?.role === 'admin' ? gridOutline : bicycleOutline} style={{ color: '#fff', fontSize: 20 }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, color: T.text1, fontWeight: 900, fontSize: 16 }}>
                {user?.name ?? 'Utilisateur'}
              </p>
              <p style={{ margin: 0, color: roleColor, fontSize: 12, fontWeight: 700 }}>{roleLabel}</p>
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ '--background': T.menuBg }}>
        <IonList style={{ background: 'transparent', padding: '10px 0' }}>

          {/* Nav links */}
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <IonMenuToggle key={item.path} autoHide={false}>
                <IonItem
                  routerLink={item.path}
                  routerDirection="root"
                  lines="none"
                  style={{
                    '--background': isActive ? `${item.color}18` : 'transparent',
                    '--color': isActive ? item.color : T.menuItem,
                    '--border-color': 'transparent',
                    '--padding-start': '0px',
                    '--inner-padding-end': '12px',
                    margin: '2px 10px',
                    borderRadius: 12,
                    borderLeft: isActive ? `3px solid ${item.color}` : '3px solid transparent',
                  }}
                >
                  <div slot="start" style={{ width: 40, display: 'flex', justifyContent: 'center', paddingLeft: 14 }}>
                    <IonIcon icon={item.icon} style={{ fontSize: 21, color: item.color }} />
                  </div>
                  <IonLabel style={{ fontWeight: isActive ? 700 : 600, fontSize: 15 }}>{item.label}</IonLabel>
                </IonItem>
              </IonMenuToggle>
            );
          })}

          <div style={{ height: 1, background: T.divider, margin: '12px 18px' }} />

          {/* Dark / Light toggle */}
          <IonMenuToggle autoHide={false}>
            <IonItem
              button
              lines="none"
              onClick={toggleTheme}
              style={{
                '--background': 'transparent',
                '--color': T.text2,
                '--border-color': 'transparent',
                '--padding-start': '0px',
                '--inner-padding-end': '12px',
                margin: '2px 10px',
                borderRadius: 12,
                borderLeft: '3px solid transparent',
              }}
            >
              <div slot="start" style={{ width: 40, display: 'flex', justifyContent: 'center', paddingLeft: 14 }}>
                <IonIcon
                  icon={isDark ? sunnyOutline : moonOutline}
                  style={{ fontSize: 21, color: isDark ? '#F5A800' : '#6B7280' }}
                />
              </div>
              <IonLabel style={{ fontWeight: 600, fontSize: 15 }}>
                {isDark ? 'Mode clair' : 'Mode sombre'}
              </IonLabel>
              {/* Visual toggle pill */}
              <div slot="end" style={{
                width: 42, height: 24, borderRadius: 12, marginRight: 12,
                background: isDark ? '#F5A800' : '#D1D5DB',
                position: 'relative', transition: 'background 0.2s',
              }}>
                <div style={{
                  position: 'absolute', top: 3,
                  left: isDark ? 20 : 3,
                  width: 18, height: 18, borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }} />
              </div>
            </IonItem>
          </IonMenuToggle>

          <div style={{ height: 1, background: T.divider, margin: '12px 18px' }} />

          {/* Logout */}
          <IonMenuToggle autoHide={false}>
            <IonItem
              button
              lines="none"
              onClick={logout}
              style={{
                '--background': 'transparent',
                '--color': T.text2,
                '--border-color': 'transparent',
                '--padding-start': '0px',
                '--inner-padding-end': '12px',
                margin: '2px 10px',
                borderRadius: 12,
                borderLeft: '3px solid transparent',
              }}
            >
              <div slot="start" style={{ width: 40, display: 'flex', justifyContent: 'center', paddingLeft: 14 }}>
                <IonIcon icon={logOutOutline} style={{ fontSize: 21, color: '#EF4444' }} />
              </div>
              <IonLabel style={{ fontWeight: 600, fontSize: 15 }}>Déconnexion</IonLabel>
            </IonItem>
          </IonMenuToggle>
        </IonList>

        <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center' }}>
          <p style={{ color: T.text3, fontSize: 12 }}>Mr. Burritos © {new Date().getFullYear()}</p>
        </div>
      </IonContent>
    </IonMenu>
  );
}

// ─── Protected route helpers ──────────────────────────────────────────────────
function PrivateRoute({ path, exact, roles, children }: {
  path: string; exact?: boolean; roles?: string[]; children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Route path={path} exact={exact}><Redirect to="/login" /></Route>;
  if (roles && user && !roles.includes(user.role)) {
    const fallback = user.role === 'admin' ? '/dashboard' : '/orders';
    return <Route path={path} exact={exact}><Redirect to={fallback} /></Route>;
  }
  return <Route path={path} exact={exact}>{children}</Route>;
}

// ─── App content ──────────────────────────────────────────────────────────────
function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const menuRef = useRef<HTMLIonMenuElement>(null);
  const openMenu = () => menuRef.current?.open();

  if (isLoading) return null;

  const defaultRoute = user?.role === 'admin' ? '/dashboard' : '/orders';

  return (
    <>
      {isAuthenticated && <AppMenu menuRef={menuRef} />}
      <IonRouterOutlet id="delivery-main">
        <Route path="/login" exact render={() =>
          isAuthenticated ? <Redirect to={defaultRoute} /> : <Login />
        } />

        <PrivateRoute path="/orders" exact>
          <Orders onMenuOpen={openMenu} />
        </PrivateRoute>

        <PrivateRoute path="/statistics" exact>
          <Statistics onMenuOpen={openMenu} />
        </PrivateRoute>

        <PrivateRoute path="/dashboard" exact roles={['admin']}>
          <Dashboard onMenuOpen={openMenu} />
        </PrivateRoute>

        <Route exact path="/" render={() =>
          isAuthenticated ? <Redirect to={defaultRoute} /> : <Redirect to="/login" />
        } />
      </IonRouterOutlet>
    </>
  );
}

export default function App() {
  return (
    <IonApp>
      <ThemeProvider>
        <AuthProvider>
          <IonReactRouter>
            <AppContent />
          </IonReactRouter>
        </AuthProvider>
      </ThemeProvider>
    </IonApp>
  );
}
