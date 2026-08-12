import { redirect } from 'next/navigation';
import { getSessionContext } from '../../lib/auth/session';

export default async function DashboardPage() {
  try {
    const session = await getSessionContext();
    return (
      <div style={{ padding: 24 }}>
        <h1>Dashboard</h1>
        <p>Welcome, user <strong>{session.userId}</strong> in org <strong>{session.organizationId}</strong></p>
      </div>
    );
  } catch (error) {
    // If session not resolvable, redirect to login
    return redirect('/login');
  }
}
