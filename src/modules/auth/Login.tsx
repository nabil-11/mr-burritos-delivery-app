import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useHistory } from 'react-router-dom';
import {
  IonContent, IonPage, IonInput, IonButton, IonIcon, IonText, IonSpinner,
} from '@ionic/react';
import { eyeOutline, eyeOffOutline, lockClosedOutline, mailOutline, bicycleOutline } from 'ionicons/icons';

export default function Login() {
  const { login } = useAuth();
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role !== 'delivery' && user.role !== 'admin') {
        setError('Accès non autorisé pour ce compte.');
        await import('../common/api').then(m => m.authService.logout());
        return;
      }
      history.replace(user.role === 'admin' ? '/dashboard' : '/orders');
    } catch (err: any) {
      setError(err.message?.includes('{')
        ? JSON.parse(err.message)?.error || 'Identifiants incorrects'
        : 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent style={{ '--background': '#0A0A0A' }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100vh', padding: '0 24px',
          position: 'relative',
        }}>
          {/* Background orbs */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
            <div style={{
              position: 'absolute', width: 320, height: 320, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
              top: -80, left: -80,
            }} />
            <div style={{
              position: 'absolute', width: 240, height: 240, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(245,168,0,0.06) 0%, transparent 70%)',
              bottom: 60, right: -60,
            }} />
          </div>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 36, position: 'relative', zIndex: 1 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20, margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(16,185,129,0.3)',
            }}>
              <IonIcon icon={bicycleOutline} style={{ color: '#fff', fontSize: 34 }} />
            </div>
            <p style={{ color: '#F5A800', fontWeight: 900, fontSize: 22, margin: 0, letterSpacing: 1 }}>
              MR. BURRITOS
            </p>
            <p style={{ color: '#10B981', fontWeight: 700, fontSize: 14, margin: '4px 0 0', letterSpacing: 2 }}>
              LIVRAISON
            </p>
          </div>

          {/* Card */}
          <div style={{ width: '100%', maxWidth: 360, position: 'relative', zIndex: 1 }}>
            <div style={{
              background: 'rgba(20, 20, 20, 0.85)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderRadius: 24,
              border: '1px solid rgba(255,255,255,0.07)',
              padding: '28px 22px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Email */}
                <div style={{ position: 'relative' }}>
                  <IonInput
                    fill="outline"
                    label="Email"
                    labelPlacement="floating"
                    type="email"
                    value={email}
                    onIonInput={(e) => setEmail(e.detail.value || '')}
                    required
                    autocomplete="email"
                    style={{
                      '--background': '#1A1A1A',
                      '--color': '#FFFFFF',
                      '--placeholder-color': '#4B5563',
                      '--border-color': '#2D2D2D',
                      '--border-color-focused': '#10B981',
                      '--highlight-color-focused': '#10B981',
                      '--label-color': '#6B7280',
                      '--border-radius': '14px',
                      '--padding-start': '48px',
                    }}
                  />
                  <IonIcon icon={mailOutline} style={{
                    position: 'absolute', left: 14, top: '50%',
                    transform: 'translateY(-50%)', color: '#6B7280', fontSize: 18, zIndex: 10, pointerEvents: 'none',
                  }} />
                </div>

                {/* Password */}
                <div style={{ position: 'relative' }}>
                  <IonInput
                    fill="outline"
                    label="Mot de passe"
                    labelPlacement="floating"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onIonInput={(e) => setPassword(e.detail.value || '')}
                    required
                    autocomplete="current-password"
                    style={{
                      '--background': '#1A1A1A',
                      '--color': '#FFFFFF',
                      '--placeholder-color': '#4B5563',
                      '--border-color': '#2D2D2D',
                      '--border-color-focused': '#10B981',
                      '--highlight-color-focused': '#10B981',
                      '--label-color': '#6B7280',
                      '--border-radius': '14px',
                      '--padding-start': '48px',
                      '--padding-end': '48px',
                    }}
                  />
                  <IonIcon icon={lockClosedOutline} style={{
                    position: 'absolute', left: 14, top: '50%',
                    transform: 'translateY(-50%)', color: '#6B7280', fontSize: 18, zIndex: 10, pointerEvents: 'none',
                  }} />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', zIndex: 10, padding: 4,
                  }}>
                    <IonIcon icon={showPw ? eyeOffOutline : eyeOutline} style={{ color: '#6B7280', fontSize: 18 }} />
                  </button>
                </div>

                {/* Error */}
                {error && (
                  <div style={{
                    background: 'rgba(45,21,21,0.9)', border: '1px solid rgba(239,68,68,0.35)',
                    borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontSize: 14 }}>⚠️</span>
                    <IonText style={{ color: '#F87171', fontSize: 13 }}>{error}</IonText>
                  </div>
                )}

                {/* Submit */}
                <IonButton
                  type="submit"
                  expand="block"
                  disabled={loading}
                  style={{
                    '--background': 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    '--background-activated': '#047857',
                    '--color': '#FFFFFF',
                    '--border-radius': '14px',
                    '--box-shadow': '0 6px 28px rgba(16,185,129,0.38)',
                    height: 54,
                    fontWeight: 700,
                    fontSize: 16,
                    marginTop: 4,
                  }}
                >
                  {loading
                    ? <IonSpinner name="crescent" style={{ color: '#fff', width: 20, height: 20 }} />
                    : 'Se connecter'
                  }
                </IonButton>
              </form>
            </div>
          </div>

          <p style={{ color: '#374151', fontSize: 12, marginTop: 36, position: 'relative', zIndex: 1 }}>
            Mr. Burritos © {new Date().getFullYear()}
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
}
