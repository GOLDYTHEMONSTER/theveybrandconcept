# ⚡ PHASE 2: QUICK START GUIDE

This guide helps you immediately start Phase 2 development. Follow these steps in order.

---

## STEP 1: Verify Environment & Prepare Database

### 1.1 Check .env.local
```bash
# Terminal: verify your Supabase credentials are in .env.local
cat .env.local
```

**Expected output:**
```
NEXT_PUBLIC_SUPABASE_URL=https://esierzjlqwiaszjosefz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_j2506lU98cuTYR9H6ujH7Q_l0yLDtVl
SUPABASE_SERVICE_ROLE_KEY=<needs to be filled>
```

**If SUPABASE_SERVICE_ROLE_KEY is missing:**
1. Go to https://app.supabase.com
2. Sign in to your project
3. Settings > API > Project API keys
4. Copy the **service_role** secret
5. Paste into .env.local
6. Save file

### 1.2 Apply Database Migrations
```bash
# Terminal: create all database tables + functions
npx supabase db push

# Expected output:
# Applying migration 0001_foundation.sql...
# Applying migration 0002_inventory_preview.sql...
# Success: 2 migrations applied
```

### 1.3 Create Seed Data
Go to Supabase console > SQL Editor and run:

```sql
-- Create test organization
INSERT INTO organizations (id, name, slug, status)
VALUES ('org-test-001', 'Test Organization', 'test-org', 'active')
ON CONFLICT DO NOTHING;

-- Create test user profile (replace with your email)
INSERT INTO profiles (id, email, full_name, status)
VALUES ('user-test-001', 'test@example.com', 'Test User', 'active')
ON CONFLICT DO NOTHING;

-- Add user to organization
INSERT INTO organization_members (id, organization_id, user_id, status)
VALUES ('member-test-001', 'org-test-001', 'user-test-001', 'active')
ON CONFLICT DO NOTHING;

-- Create admin role
INSERT INTO roles (id, organization_id, code, name, status)
VALUES ('role-admin-001', 'org-test-001', 'admin', 'Administrator', 'active')
ON CONFLICT DO NOTHING;

-- Grant all permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role-admin-001', id FROM permissions
ON CONFLICT DO NOTHING;

-- Assign admin role to user
INSERT INTO member_roles (id, member_id, role_id)
VALUES ('member-role-001', 'member-test-001', 'role-admin-001')
ON CONFLICT DO NOTHING;
```

---

## STEP 2: Build Login Endpoint

**File:** `app/api/auth/login/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { requireRateLimit } from '@/lib/rate-limit/limiter';
import { RATE_LIMIT_RULES } from '@/lib/rate-limit/limiter';
import { getClientIP } from '@/lib/utils/ip';

export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const { email, password, organizationId } = await request.json();
    
    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }
    
    // 2. Rate limit check (per IP)
    const ip = getClientIP(request);
    try {
      await requireRateLimit(RATE_LIMIT_RULES.authLogin, ip);
    } catch (error) {
      return NextResponse.json(
        { error: 'Too many login attempts. Try again in 15 minutes.' },
        { status: 429 }
      );
    }
    
    // 3. Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return request.cookies.get(name)?.value;
          },
          set(name, value, options) {
            // Handled in response
          },
          remove(name, options) {
            // Handled in response
          }
        }
      }
    );
    
    // 4. Authenticate with Supabase
    const { data: { user }, error: authError } = 
      await supabase.auth.signInWithPassword({
        email,
        password
      });
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Incorrect email or password' },
        { status: 401 }
      );
    }
    
    // 5. Verify user has org membership
    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .select('id, organization_id, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .single();
    
    if (memberError || !membership) {
      console.error('No organization membership found');
      return NextResponse.json(
        { error: 'No access to any organization' },
        { status: 403 }
      );
    }
    
    // 6. Audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      organization_id: membership.organization_id,
      action: 'user.login',
      entity_type: 'auth',
      ip_address: ip
    });
    
    // 7. Return response with session
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      organization: membership.organization_id
    });
    
    // Supabase automatically sets cookies during signIn
    // Just return the success response
    return response;
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
```

---

## STEP 3: Build Logout Endpoint

**File:** `app/api/auth/logout/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSessionContext } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    // 1. Get current session (if exists)
    let session;
    try {
      session = await getSessionContext();
    } catch (error) {
      // Session may already be invalid
      session = null;
    }
    
    // 2. Create Supabase client for sign out
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return request.cookies.get(name)?.value;
          },
          set(name, value, options) {
            // Handled in response
          },
          remove(name, options) {
            // Handled in response
          }
        }
      }
    );
    
    // 3. Sign out
    await supabase.auth.signOut();
    
    // 4. Audit log
    if (session) {
      await supabase.from('audit_logs').insert({
        user_id: session.userId,
        organization_id: session.organizationId,
        action: 'user.logout',
        entity_type: 'auth'
      });
    }
    
    // 5. Clear cookies
    const response = NextResponse.json({ success: true });
    response.cookies.delete('sb-access-token');
    response.cookies.delete('sb-refresh-token');
    
    return response;
    
  } catch (error) {
    console.error('Logout error:', error);
    // Even if logout fails, return success so client clears state
    const response = NextResponse.json({ success: true });
    response.cookies.delete('sb-access-token');
    response.cookies.delete('sb-refresh-token');
    return response;
  }
}
```

---

## STEP 4: Create Session Context

**File:** `app/lib/session-context.tsx`

```typescript
'use client';

import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface SessionContextType {
  userId: string | null;
  organizationId: string | null;
  permissions: string[];
  isLoading: boolean;
  isLoggedIn: boolean;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    validateSession();
  }, []);
  
  async function validateSession() {
    try {
      const response = await fetch('/api/auth/me');
      
      if (response.ok) {
        const data = await response.json();
        setUserId(data.userId);
        setOrganizationId(data.organizationId);
        setPermissions(data.permissions || []);
      } else {
        // Redirect to login if not authenticated
        router.replace('/login');
      }
    } catch (error) {
      console.error('Session validation failed:', error);
      router.replace('/login');
    } finally {
      setIsLoading(false);
    }
  }
  
  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      // Clear state even if logout fails
      setUserId(null);
      setOrganizationId(null);
      setPermissions([]);
      localStorage.clear();
      sessionStorage.clear();
      router.replace('/login');
    }
  }
  
  function hasPermission(permission: string) {
    return permissions.includes(permission);
  }
  
  return (
    <SessionContext.Provider
      value={{
        userId,
        organizationId,
        permissions,
        isLoading,
        isLoggedIn: !!userId,
        logout,
        hasPermission
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used inside SessionProvider');
  }
  return context;
}
```

---

## STEP 5: Build Login Page

**File:** `app/(auth)/login/page.tsx`

```typescript
'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationId, setOrganizationId] = useState('org-test-001');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, organizationId })
      });
      
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Login failed');
        return;
      }
      
      // Redirect to dashboard
      router.push('/dashboard');
      router.refresh();
      
    } catch (err) {
      setError('Network error. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }
  
  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
      <h1>Login</h1>
      
      {error && (
        <div style={{ padding: '10px', marginBottom: '20px', backgroundColor: '#fee', color: '#c00', borderRadius: '4px' }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="test@example.com"
            required
            disabled={isLoading}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label>Organization</label>
          <input
            type="text"
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            disabled={isLoading}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      
      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>
        <p>Don't have an account? <Link href="/signup">Sign up</Link></p>
      </div>
    </div>
  );
}
```

---

## STEP 6: Build Dashboard Skeleton

**File:** `app/(app)/layout.tsx`

```typescript
import { getSessionContext } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export default async function AppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  // Verify session exists (redirect if not)
  let session;
  try {
    session = await getSessionContext();
  } catch (error) {
    redirect('/login');
  }
  
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: '250px',
        backgroundColor: '#1e293b',
        color: 'white',
        padding: '20px',
        boxShadow: '0 0 10px rgba(0,0,0,0.1)'
      }}>
        <h2>Thevey Brand</h2>
        <nav style={{ marginTop: '30px' }}>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '15px' }}>
              <a href="/dashboard" style={{ color: 'white', textDecoration: 'none' }}>📊 Dashboard</a>
            </li>
            <li style={{ marginBottom: '15px' }}>
              <a href="/inventory" style={{ color: 'white', textDecoration: 'none' }}>📦 Inventory</a>
            </li>
            <li style={{ marginBottom: '15px' }}>
              <a href="/orders" style={{ color: 'white', textDecoration: 'none' }}>📋 Orders</a>
            </li>
            <li style={{ marginBottom: '15px' }}>
              <a href="/settings" style={{ color: 'white', textDecoration: 'none' }}>⚙️ Settings</a>
            </li>
          </ul>
        </nav>
      </aside>
      
      {/* Main content */}
      <main style={{ flex: 1 }}>
        {/* Top bar */}
        <header style={{
          backgroundColor: 'white',
          borderBottom: '1px solid #e2e8f0',
          padding: '15px 30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{ margin: 0 }}>ERP Dashboard</h1>
          <div>
            <span style={{ marginRight: '20px' }}>Org: {session.organizationId}</span>
            <a href="/api/auth/logout" style={{ color: '#0066cc', textDecoration: 'none' }}>Logout</a>
          </div>
        </header>
        
        {/* Page content */}
        <div style={{ padding: '30px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
```

**File:** `app/(app)/dashboard/page.tsx`

```typescript
import { getSessionContext } from '@/lib/auth/session';

export default async function DashboardPage() {
  const session = await getSessionContext();
  
  return (
    <div>
      <h2>Welcome to your Dashboard</h2>
      <p>Organization ID: {session.organizationId}</p>
      <p>User ID: {session.userId}</p>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px',
        marginTop: '30px'
      }}>
        <div style={{ padding: '20px', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
          <h3>Orders</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold' }}>42</p>
          <p>This month</p>
        </div>
        
        <div style={{ padding: '20px', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
          <h3>Revenue</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold' }}>$12,450</p>
          <p>Total</p>
        </div>
        
        <div style={{ padding: '20px', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
          <h3>Stock</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold' }}>95%</p>
          <p>Available</p>
        </div>
      </div>
    </div>
  );
}
```

---

## STEP 7: Update Root Layout

**File:** `app/layout.tsx`

```typescript
import { SessionProvider } from './lib/session-context';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Thevey Brand ERP',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
```

---

## STEP 8: Test Login Flow

### 8.1 Start dev server
```bash
npm run dev
```

### 8.2 Visit login page
```
http://localhost:3000/login
```

### 8.3 Enter credentials from seed data
```
Email: test@example.com
Password: [use password you set in Supabase]
Organization: org-test-001
```

### 8.4 Verify
- ✅ Login succeeds → redirects to /dashboard
- ✅ Dashboard shows org ID and user ID
- ✅ Logout button works → redirects to /login
- ✅ Refresh page → still logged in
- ✅ Invalid credentials → shows error

---

## STEP 9: Create API Response Endpoint

**File:** `app/api/auth/me/route.ts`

```typescript
import { getSessionContext } from '@/lib/auth/session';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await getSessionContext();
    
    return NextResponse.json({
      userId: session.userId,
      organizationId: session.organizationId,
      permissions: [] // TODO: fetch user's permissions
    });
    
  } catch (error) {
    console.error('GET /api/auth/me failed:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}
```

---

## NEXT: Week 1 Checklist

- [ ] Step 1-9 completed
- [ ] Login/logout flow working
- [ ] Dashboard accessible (redirects to login if no session)
- [ ] Logout button works (clears session)
- [ ] Commit to git: `git add -A && git commit -m "Phase 2: Login flow + dashboard"`
- [ ] Test on multiple browsers
- [ ] Test with Supabase credentials

**After Week 1:**
- Proceed to PHASE_2_MIGRATION_PLAN.md Week 2 section
- Build products endpoints + UI
- Build inventory management
- Build orders endpoints + UI

---

**Status:** Ready to build  
**Estimated Time:** 4-6 hours  
**Difficulty:** Beginner-Intermediate  

Good luck! 🚀
