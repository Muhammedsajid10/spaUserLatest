import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../Service/Context';
import { useNavigate } from 'react-router-dom';

export default function OrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const pageRef = useRef();
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    // TODO: Fetch orders from backend using token
    // For now, show placeholder
    setTimeout(() => {
      setOrders([]);
      setLoading(false);
    }, 500);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [token]);

  const orderFieldStyle = {
    marginBottom: 24,
    padding: '24px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    border: '2px solid rgba(255, 255, 255, 0.1)',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    backdropFilter: 'blur(10px)'
  };

  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-10px) rotate(120deg); }
          66% { transform: translateY(5px) rotate(240deg); }
        }
        @keyframes fadeInUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes glow {
          from { filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.3)); }
          to { filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.6)); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        .field-shimmer::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          transition: left 0.8s;
        }
        .field-shimmer:hover::before {
          left: 100%;
        }
      `}</style>

      <div style={{
        background: 'linear-gradient(135deg, #111 0%, #000 100%)',
        minHeight: '100vh',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif"
      }}>
        {/* Cursor follower */}
        <div style={{
          position: 'fixed',
          left: mousePosition.x - 100,
          top: mousePosition.y - 100,
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
          transition: 'all 0.1s ease-out',
          zIndex: 1
        }} />

        {/* Enhanced floating particles */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: `${Math.random() * 6 + 6}px`, // 6px to 12px
              height: `${Math.random() * 6 + 6}px`,
              background: 'rgba(255, 255, 255, 0.5)',
              borderRadius: '50%',
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
              opacity: 0.5,
              boxShadow: '0 0 8px rgba(255, 255, 255, 0.4)'
            }}
          />
        ))}

        <div
          ref={pageRef}
          style={{
            maxWidth: 600,
            margin: '40px auto',
            padding: '40px',
            background: 'rgba(0, 0, 0, 0.8)',
            borderRadius: '24px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            position: 'relative',
            zIndex: 2,
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transform: isVisible ? 'translateY(0)' : 'translateY(60px)',
            opacity: isVisible ? 1 : 0,
            transition: 'all 1s cubic-bezier(0.4, 0, 0.2, 1)',
            animation: isVisible ? 'fadeInUp 1s ease-out' : 'none'
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              position: 'absolute',
              top: 24,
              left: 24,
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              cursor: 'pointer',
              padding: '12px',
              borderRadius: '50%',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              transform: isVisible ? 'scale(1)' : 'scale(0)',
              opacity: isVisible ? 1 : 0
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 6L8.5 10L12.5 14" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div style={{ textAlign: 'center', marginBottom: '40px', paddingTop: '20px' }}>
            <div style={{
              width: '100px',
              height: '100px',
              background: 'linear-gradient(45deg, #fff, #ccc)',
              borderRadius: '50%',
              margin: '0 auto 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              color: '#000',
              fontWeight: 'bold',
              boxShadow: '0 0 30px rgba(255, 255, 255, 0.3)',
              transform: isVisible ? 'scale(1)' : 'scale(0)',
              transition: 'all 0.8s ease',
              animation: isVisible ? 'glow 2s ease-in-out infinite alternate' : 'none'
            }}>
              📦
            </div>

            <h2 style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              color: '#fff',
              background: 'linear-gradient(45deg, #fff, #ccc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: isVisible ? 'glow 2s ease-in-out infinite alternate' : 'none'
            }}>
              My Orders
            </h2>
          </div>

          {loading ? (
            <div
              className="field-shimmer"
              style={{
                ...orderFieldStyle,
                transform: isVisible ? 'translateX(0)' : 'translateX(-50px)',
                opacity: isVisible ? 1 : 0,
                transitionDelay: '0.6s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>⏳</span>
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.6)',
                  textTransform: 'uppercase'
                }}>
                  Loading
                </span>
              </div>
              <div style={{ 
                fontSize: '1.125rem', 
                color: '#fff', 
                paddingLeft: '32px',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}>
                Fetching your orders...
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div
              className="field-shimmer"
              style={{
                ...orderFieldStyle,
                transform: isVisible ? 'translateX(0)' : 'translateX(-50px)',
                opacity: isVisible ? 1 : 0,
                transitionDelay: '0.6s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>📭</span>
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.6)',
                  textTransform: 'uppercase'
                }}>
                  No Orders
                </span>
              </div>
              <div style={{ fontSize: '1.125rem', color: '#fff', paddingLeft: '32px' }}>
                You haven't placed any orders yet.
              </div>
            </div>
          ) : (
            orders.map((order, index) => (
              <div
                key={order._id}
                className="field-shimmer"
                style={{
                  ...orderFieldStyle,
                  transform: isVisible ? 'translateX(0)' : 'translateX(-50px)',
                  opacity: isVisible ? 1 : 0,
                  transitionDelay: `${0.6 + index * 0.2}s`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>📦</span>
                  <span style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.6)',
                    textTransform: 'uppercase'
                  }}>
                    Order #{order._id?.substring(0, 8)}
                  </span>
                </div>
                <div style={{ fontSize: '1.125rem', color: '#fff', paddingLeft: '32px' }}>
                  {order.details}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}