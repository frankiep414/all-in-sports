'use client';

type AuthWelcomeProps = {
  onEmailSignup: () => void;
  onLogin: () => void;
};

export default function AuthWelcome({
  onEmailSignup,
  onLogin,
}: AuthWelcomeProps) {
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
          onClick={onEmailSignup}
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
            onClick={onLogin}
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
