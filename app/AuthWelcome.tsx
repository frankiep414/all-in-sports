'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type AuthWelcomeProps = {
  onEmailSignup: () => void;
  onLogin: () => void;
};

export default function AuthWelcome({
  onEmailSignup,
  onLogin,
}: AuthWelcomeProps) {
    const [authMode, setAuthMode] = useState<'welcome' | 'signup' | 'login'>('welcome');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');

  async function sendEmailCode() {
    if (!email.trim()) {
      setAuthMessage('Enter your email address.');
      return;
    }

    setAuthLoading(true);
    setAuthMessage('');

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: authMode === 'signup',
      },
    });

    if (error) {
      setAuthMessage(
        authMode === 'login'
          ? 'We could not find an All In account with that email.'
          : error.message
      );
      setAuthLoading(false);
      return;
    }

    setOtpSent(true);
    setAuthMessage('Check your email for your verification code.');
    setAuthLoading(false);
  }

  async function verifyEmailCode() {
    if (!otp.trim()) {
      setAuthMessage('Enter the verification code from your email.');
      return;
    }

    setAuthLoading(true);
    setAuthMessage('');

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: 'email',
    });

    if (error) {
      setAuthMessage('That code is invalid or expired. Please try again.');
      setAuthLoading(false);
      return;
    }

    setAuthLoading(false);

    if (authMode === 'signup') {
      onEmailSignup();
    } else {
      onLogin();
    }
  }

  if (authMode !== 'welcome') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#050505',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px',
          fontFamily: 'Arial, Helvetica, sans-serif',
        }}
      >
        <main style={{ width: '100%', maxWidth: '460px' }}>
          <button
            type="button"
            onClick={() => {
              setAuthMode('welcome');
              setOtpSent(false);
              setOtp('');
              setAuthMessage('');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8b93a7',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '0 0 30px',
            }}
          >
            ← Back
          </button>

          <div
            style={{
              fontSize: '14px',
              fontWeight: 800,
              letterSpacing: '4px',
              color: '#72e6ff',
              marginBottom: '18px',
            }}
          >
            ALL IN SPORTS
          </div>

          <h1
            style={{
              fontSize: '40px',
              lineHeight: 1,
              margin: '0 0 14px',
            }}
          >
            {authMode === 'signup' ? 'JOIN ALL IN.' : 'WELCOME BACK.'}
          </h1>

          <p
            style={{
              color: '#8b93a7',
              fontSize: '17px',
              lineHeight: 1.5,
              marginBottom: '32px',
            }}
          >
            {otpSent
              ? `We sent a verification code to ${email}.`
              : authMode === 'signup'
                ? 'Enter your email to create your secure All In account.'
                : 'Enter the email connected to your All In account.'}
          </p>

          {!otpSent ? (
            <>
              <label
                style={{
                  display: 'block',
                  marginBottom: '9px',
                  fontWeight: 700,
                }}
              >
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@email.com"
                autoComplete="email"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '17px',
                  borderRadius: '12px',
                  border: '1px solid #343b48',
                  background: '#11151b',
                  color: '#ffffff',
                  fontSize: '17px',
                  marginBottom: '16px',
                }}
              />

              <button
                type="button"
                onClick={sendEmailCode}
                disabled={authLoading}
                style={{
                  width: '100%',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '18px',
                  background: '#1557ff',
                  color: '#ffffff',
                  fontSize: '18px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {authLoading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </>
          ) : (
            <>
              <label
                style={{
                  display: 'block',
                  marginBottom: '9px',
                  fontWeight: 700,
                }}
              >
                Verification Code
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                placeholder="Enter code"
                autoComplete="one-time-code"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '17px',
                  borderRadius: '12px',
                  border: '1px solid #343b48',
                  background: '#11151b',
                  color: '#ffffff',
                  fontSize: '22px',
                  letterSpacing: '5px',
                  textAlign: 'center',
                  marginBottom: '16px',
                }}
              />

              <button
                type="button"
                onClick={verifyEmailCode}
                disabled={authLoading}
                style={{
                  width: '100%',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '18px',
                  background: '#1557ff',
                  color: '#ffffff',
                  fontSize: '18px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {authLoading ? 'Verifying...' : 'Verify & Continue'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtp('');
                  setAuthMessage('');
                }}
                style={{
                  width: '100%',
                  marginTop: '16px',
                  background: 'transparent',
                  border: 'none',
                  color: '#5d9cff',
                  fontSize: '15px',
                  cursor: 'pointer',
                }}
              >
                Use a different email
              </button>
            </>
          )}

          {authMessage && (
            <p
              style={{
                marginTop: '18px',
                color: '#aab1bf',
                lineHeight: 1.5,
              }}
            >
              {authMessage}
            </p>
          )}
        </main>
      </div>
    );
  }
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#050505',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'center',
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}
    >
      <main
        style={{
          width: '100%',
          maxWidth: '480px',
          minHeight: '100vh',
          padding: '70px 24px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {/* BRAND */}
        <div style={{ textAlign: 'center', marginBottom: '55px' }}>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 800,
              letterSpacing: '5px',
              color: '#8b93a7',
              marginBottom: '14px',
            }}
          >
            ALL IN SPORTS
          </div>

          <div
            style={{
              fontSize: '52px',
              fontWeight: 950,
              letterSpacing: '-3px',
              lineHeight: 0.95,
            }}
          >
            ALL IN.
          </div>
        </div>

        {/* MESSAGE */}
        <div style={{ textAlign: 'center', marginBottom: '42px' }}>
          <h1
            style={{
              fontSize: '34px',
              margin: '0 0 14px',
              fontWeight: 900,
              letterSpacing: '-1px',
            }}
          >
            GET IN THE GAME.
          </h1>

          <p
            style={{
              color: '#8b93a7',
              fontSize: '18px',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Your sports. Your stats. Your story.
          </p>
        </div>

        {/* GOOGLE */}
        <button
          type="button"
          style={socialButton}
          onClick={() => alert('Google sign-in coming next')}
        >
          <span style={{ fontWeight: 900, fontSize: '21px' }}>G</span>
          Continue with Google
        </button>

        {/* APPLE */}
        <button
          type="button"
          style={socialButton}
          onClick={() => alert('Apple sign-in coming next')}
        >
          <span style={{ fontSize: '24px' }}>●</span>
          Continue with Apple
        </button>

        {/* DIVIDER */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            margin: '27px 0',
            color: '#737b8c',
          }}
        >
          <div style={divider} />
          <span>OR</span>
          <div style={divider} />
        </div>

        {/* EMAIL */}
        <button
          type="button"
        onClick={() => setAuthMode('signup')}
          style={{
            width: '100%',
            border: 'none',
            borderRadius: '12px',
            padding: '18px',
            background: '#1557ff',
            color: '#ffffff',
            fontSize: '18px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Sign Up with Email
        </button>

        {/* LOGIN */}
        <div
          style={{
            textAlign: 'center',
            marginTop: '32px',
            fontSize: '17px',
          }}
        >
          <span style={{ color: '#c8cbd2' }}>
            Already All In?{' '}
          </span>

          <button
            type="button"
            onClick={() => setAuthMode('login')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#5d9cff',
              fontSize: '17px',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Log In
          </button>
        </div>

        {/* FUTURE VISION */}
        <div
          style={{
            marginTop: '65px',
            textAlign: 'center',
            color: '#555d6d',
            fontSize: '12px',
            letterSpacing: '2px',
            fontWeight: 700,
          }}
        >
          ONE PLAYER ID. EVERY GAME.
        </div>
      </main>
    </div>
  );
}

const socialButton = {
  width: '100%',
  border: '1px solid #d7d7d7',
  borderRadius: '12px',
  padding: '17px',
  marginBottom: '14px',
  background: '#ffffff',
  color: '#111111',
  fontSize: '18px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
};

const divider = {
  height: '1px',
  background: '#444b59',
  flex: 1,
};
