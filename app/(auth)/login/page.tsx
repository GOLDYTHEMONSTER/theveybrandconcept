'use client';

import React, { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      // success
      router.replace('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '80px auto', padding: 20 }}>
      <h1>Login</h1>
      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required style={{ width: '100%', padding: 8 }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required style={{ width: '100%', padding: 8 }} />
        </div>
        <button type="submit" disabled={isLoading} style={{ width: '100%', padding: 10 }}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
