import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function VerifyEmailPage() {
  const { token } = useParams();
  const [status, setStatus] = useState('Verifying your email...');

  useEffect(() => {
    fetch(`/api/v1/auth/verify-email/${token}`, {
      method: 'PATCH',
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setStatus('✅ Email verified! You can now log in.');
        else setStatus(data.message || '❌ Verification failed.');
      })
      .catch(() => setStatus('❌ Verification failed.'));
  }, [token]);

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
      {status}
    </div>
  );
} 