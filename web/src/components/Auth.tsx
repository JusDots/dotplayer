import React, { useState, useEffect } from 'react';
import { getYTInstance } from '../services/ytmusic';
import DotButton from './DotButton';

interface AuthTokens {
    access_token: string;
    refresh_token: string;
    expiry_date: string;
}

interface AuthProps {
  onLogin: (credentials: AuthTokens) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [authInfo, setAuthInfo] = useState<{ url: string; code: string } | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const startLogin = async () => {
    setStatus('pending');
    setErrorMsg('');
    try {
      console.log("[Auth] Getting YT Instance...");
      const yt = await getYTInstance();
      
      yt.session.on('auth-pending', (data) => {
        console.log("[Auth] Auth pending:", data);
        setAuthInfo({
          url: data.verification_url,
          code: data.user_code
        });
      });

      yt.session.on('auth', (data) => {
        console.log("[Auth] Auth success:", data);
        setStatus('success');
        localStorage.setItem('yt_credentials', JSON.stringify(data.credentials));
        onLogin(data.credentials as AuthTokens);
      });

      yt.session.on('auth-error', (err) => {
        console.error('[Auth] Auth error:', err);
        setStatus('error');
        setErrorMsg(err.message || 'Authentication failed');
      });

      console.log("[Auth] Signing in...");
      await yt.session.signIn();
    } catch (err: any) {
      console.error('[Auth] Failed to start login:', err);
      setStatus('error');
      setErrorMsg(err.message || 'Failed to connect to Google');
    }
  };

  const handleBypass = () => {
    console.log("[Auth] Bypassing login for debug...");
    const guestCreds = { access_token: 'GUEST', refresh_token: 'GUEST', expiry_date: '' };
    localStorage.setItem('yt_credentials', JSON.stringify(guestCreds));
    onLogin(guestCreds as AuthTokens);
  };

  useEffect(() => {
    const saved = localStorage.getItem('yt_credentials');
    if (saved) {
      (async () => {
        try {
          const creds = JSON.parse(saved);
          await getYTInstance(creds);
          onLogin(creds);
        } catch {
          localStorage.removeItem('yt_credentials');
        }
      })();
    }
  }, [onLogin]);

  return (
    <div className="auth-container">
       <div className="auth-card">
          <h1 className="logo mb-4">DOT.PLAYER</h1>
          <p className="auth-desc">Login with Google to access your music library, history, and playlists. No account? Use the bypass for testing.</p>
          
          {status === 'idle' && (
            <div className="auth-actions" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <DotButton onClick={startLogin}>LOGIN_WITH_GOOGLE</DotButton>
                <div style={{ fontSize: '0.6rem', opacity: 0.5, letterSpacing: '2px', cursor: 'pointer' }} onClick={handleBypass}>_BYPASS_FOR_DEBUG</div>
            </div>
          )}

          {status === 'pending' && !authInfo && (
            <div className="loading">REACHING_GOOGLE...</div>
          )}

          {status === 'pending' && authInfo && (
            <div className="auth-content">
               <div className="auth-step">1. Visit: <a href={authInfo.url} target="_blank" rel="noreferrer" className="accent-link">{authInfo.url}</a></div>
               <div className="auth-step">2. Enter code:</div>
               <div className="auth-code">{authInfo.code}</div>
               <div className="loading-small">WAITING_FOR_AUTH...</div>
            </div>
          )}

          {status === 'error' && (
            <div className="error-text">
               <p style={{ color: 'red', fontSize: '0.8rem', marginBottom: '10px' }}>ERROR: {errorMsg}</p>
               <DotButton onClick={startLogin}>RETRY_LOGIN</DotButton>
               <div style={{ fontSize: '0.6rem', opacity: 0.5, letterSpacing: '2px', cursor: 'pointer', marginTop: '10px' }} onClick={handleBypass}>_BYPASS_AND_USE_GUEST</div>
            </div>
          )}
       </div>
    </div>
  );
};

export default Auth;
