# 🔐 SESSION MANAGEMENT SYSTEM: Complete Plan

## Overview

This document defines how sessions work across the entire ERP platform to ensure smooth navigation, clean login/logout states, and seamless multi-page experiences.

---

## 1️⃣ SESSION ARCHITECTURE

```
┌──────────────────────────────────────────────────────┐
│                   USER BROWSER                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─ localStorage (non-critical state)              │
│  │  ├─ lastPage (which page to return to)          │
│  │  └─ theme (dark/light)                          │
│  │                                                  │
│  ├─ sessionStorage (temporary state)               │
│  │  ├─ formDraft (unsaved form data)               │
│  │  └─ selectedFilters (current filters)           │
│  │                                                  │
│  ├─ HTTP-only Cookies (SESSION) ⭐               │
│  │  ├─ sb-access-token (JWT, 15 min expiry)       │
│  │  ├─ sb-refresh-token (refresh JWT)             │
│  │  └─ Secure, SameSite=Lax, never exposed to JS  │
│  │                                                  │
│  └─ In-Memory Context (React state)               │
│     ├─ user (current user data)                   │
│     ├─ organization (current org)                 │
│     └─ permissions (user's permissions)           │
│                                                    │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│              NEXT.JS APPLICATION                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Middleware (every request):                        │
│  1. Resolve session from cookies                    │
│  2. Check if expired                               │
│  3. Attach user to request context                 │
│  4. Pass to route handlers                         │
│                                                      │
│  lib/auth/session.ts:                              │
│  - getSessionContext() — resolves user + org       │
│  - SessionContext interface                        │
│  - Error classes (Unauthenticated, NoOrg)         │
│                                                      │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│            SUPABASE AUTH + DATABASE                 │
├──────────────────────────────────────────────────────┤
│                                                      │
│  auth.users (Supabase managed):                    │
│  - email, password_hash, confirmed_at             │
│  - created_at, last_sign_in_at                    │
│  - JWTs valid for 15 min, refresh tokens         │
│                                                      │
│  profiles (linked to auth.users):                 │
│  - id (= auth.users.id), full_name, avatar       │
│  - status (active | deactivated)                 │
│                                                      │
│  organization_members:                            │
│  - Links user to org + department                 │
│  - RLS ensures user can only query own org        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 2️⃣ LOGIN FLOW

### Step-by-Step

```
USER CLICKS LOGIN
    ↓
User enters email + password
    ↓
Form validation (client-side UX feedback)
    ↓
POST /api/auth/login { email, password, organizationId? }
    ↓
Rate limit check (5 attempts/15min per IP)
    ↓
Call Supabase.auth.signInWithPassword()
    ↓
✓ SUCCESS:
    ├─ Supabase returns JWT + refresh token
    ├─ Cookies auto-set by Supabase (HTTP-only)
    ├─ Resolve user's org membership
    ├─ Set lastPage in localStorage (for redirect)
    ├─ Store org context in React state
    └─ Redirect to /dashboard
    
✗ FAILURE:
    ├─ Invalid credentials → 401 + "Incorrect email or password"
    ├─ Too many attempts → 429 + "Too many login attempts"
    ├─ User deactivated → 403 + "Account disabled"
    └─ Show error message, user retries
```

### Code Structure

**File:** `app/api/auth/login/route.ts` (to be created)

```typescript
export async function POST(request: NextRequest) {
  // 1. Parse + validate request body
  const { email, password, organizationId } = await request.json();
  
  // Validation: email format, password length, etc.
  if (!isValidEmail(email)) return error(400, "Invalid email");
  
  // 2. Rate limit check (per IP)
  const ip = getClientIP(request);
  await requireRateLimit(RATE_LIMIT_RULES.authLogin, ip);
  
  // 3. Call Supabase Auth
  const { data: { user }, error: authError } = 
    await supabase.auth.signInWithPassword({ email, password });
  
  if (authError) {
    return error(401, "Incorrect email or password");
  }
  
  // 4. Resolve user's organization membership
  const session = await getSessionContext(organizationId);
  
  // 5. Audit log
  await writeAuditLog(session, {
    action: 'user.login',
    reason: 'Login via email/password'
  });
  
  // 6. Return success (cookies already set)
  return json({
    success: true,
    user: { id: user.id, email: user.email },
    organization: session.organizationId
  });
}
```

---

## 3️⃣ LOGOUT FLOW

### Step-by-Step

```
USER CLICKS LOGOUT
    ↓
Confirm action (optional: "Are you sure?")
    ↓
POST /api/auth/logout
    ↓
✓ Logout sequence:
    ├─ 1. Call supabase.auth.signOut()
    ├─ 2. Clear all localStorage
    ├─ 3. Clear all sessionStorage
    ├─ 4. Clear React state (user, org, permissions)
    ├─ 5. Write audit log (user.logout)
    ├─ 6. Close all API connections
    └─ 7. Redirect to /login (replace history)
    
Session is now completely cleared:
    ├─ Cookies deleted (HTTP-only)
    ├─ Frontend state reset
    ├─ Cannot access protected routes
    └─ Refresh browser → login page
```

### Code Structure

**File:** `app/api/auth/logout/route.ts` (to be created)

```typescript
export async function POST(request: NextRequest) {
  try {
    // 1. Get current session (may be expired)
    const session = await getSessionContext().catch(() => null);
    
    // 2. Sign out from Supabase
    await supabase.auth.signOut();
    
    // 3. Clear server-side session
    const response = NextResponse.json({ success: true });
    
    // 4. Delete session cookies
    response.cookies.delete('sb-access-token');
    response.cookies.delete('sb-refresh-token');
    
    // 5. Audit log (if we had a session)
    if (session) {
      await writeAuditLog(session, {
        action: 'user.logout',
        reason: 'User clicked logout'
      });
    }
    
    return response;
  } catch (error) {
    // Even if logout fails, still clear client-side state
    return json({ success: false, message: "Logout failed" }, { status: 500 });
  }
}
```

**Client-side (React):**

```typescript
async function handleLogout() {
  // Call logout endpoint
  await fetch('/api/auth/logout', { method: 'POST' });
  
  // Clear all state (even if API fails)
  localStorage.clear();
  sessionStorage.clear();
  
  // Clear React context
  setUser(null);
  setOrganization(null);
  setPermissions([]);
  
  // Redirect to login (replace history, can't go back)
  router.replace('/login');
}
```

---

## 4️⃣ SESSION VALIDATION & PAGE TRANSITIONS

### When Does Validation Happen?

```
┌─────────────────────────────────────────────────────┐
│ ON PAGE LOAD                                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Middleware (next request):                         │
│ 1. Read session cookies                            │
│ 2. If expired → try refresh token                  │
│ 3. If refresh fails → session invalid              │
│ 4. Attach session to request context               │
│                                                     │
│ Protected Routes (e.g., /dashboard):              │
│ 1. Check session.userId exists                    │
│ 2. If missing → 401 Unauthorized                  │
│ 3. Redirect to /login                             │
│                                                     │
│ Client-side (React):                              │
│ 1. useEffect on page load                         │
│ 2. Call /api/auth/me (check session)              │
│ 3. If 401 → redirect to login                     │
│ 4. If 200 → load user context                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Protected Route Pattern

**File:** `app/dashboard/page.tsx` (example)

```typescript
// Server component that checks session
import { getSessionContext } from '@/lib/auth/session';

export default async function DashboardPage() {
  // This runs on the server, every time page loads
  let session;
  try {
    session = await getSessionContext();
  } catch (error) {
    // Session invalid → Next.js redirects to login
    redirect('/login');
  }
  
  // If we get here, session is valid
  return (
    <DashboardLayout session={session}>
      {/* Page content */}
    </DashboardLayout>
  );
}
```

---

## 5️⃣ HANDLING EXPIRED SESSIONS

### Scenario: User is on /dashboard when JWT expires

```
Time: 14:45 (JWT expires at 14:45)
  ↓
User: Still viewing /dashboard (no activity)
  ↓
Time: 14:46
  ↓
User: Clicks button → POST /api/some-action
  ↓
Request arrives at server:
  ├─ Middleware reads cookies
  ├─ JWT is expired
  ├─ Tries to use refresh token
  ├─ Refresh token valid (48h expiry)
  ├─ Supabase issues new JWT
  ├─ Request proceeds with new JWT
  └─ User sees no interruption ✓
  
If refresh token also expired:
  ├─ Middleware detects: no valid tokens
  ├─ Returns 401 Unauthorized
  ├─ Client catches error
  ├─ Redirect to /login
  ├─ Show "Session expired" message
  ├─ Store current URL for redirect after login
  └─ User logs in again → returns to /dashboard
```

### Client-Side Error Handler

**File:** `app/lib/api-client.ts` (to be created)

```typescript
export async function apiCall<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, options);
  
  if (response.status === 401) {
    // Session expired
    localStorage.setItem('redirectAfterLogin', window.location.pathname);
    window.location.href = '/login?expired=true';
    return Promise.reject(new Error('Session expired'));
  }
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
}
```

---

## 6️⃣ CROSS-TAB SESSION SYNCHRONIZATION

### Problem: User logs out in Tab A, Tab B doesn't know

```
TAB A                          TAB B
Login ✓                        Dashboard (logged in)
  ↓
Logout click
  ↓
POST /api/auth/logout
  ↓
Cookies deleted
  ↓
Redirect to /login
  ↓
                               Still shows dashboard 😱
                               (thinks session is valid)
                               ↓
                               User tries to click button
                               ↓
                                → 401 Unauthorized
                               ↓
                               Error message
                               ↓
                               Redirect to login
```

### Solution: BroadcastChannel API

```typescript
// File: app/lib/session-sync.ts

export class SessionManager {
  private channel = new BroadcastChannel('session');
  
  constructor() {
    this.channel.onmessage = (event) => {
      if (event.data.type === 'logout') {
        // Another tab logged out
        this.handleRemoteLogout();
      } else if (event.data.type === 'session-update') {
        // Another tab updated session
        this.handleRemoteSessionUpdate(event.data.session);
      }
    };
  }
  
  logout() {
    // Broadcast logout to all tabs
    this.channel.postMessage({ type: 'logout' });
    
    // Clear this tab
    this.handleRemoteLogout();
  }
  
  private handleRemoteLogout() {
    localStorage.clear();
    sessionStorage.clear();
    router.replace('/login');
  }
}
```

**Usage in component:**

```typescript
const sessionManager = useContext(SessionContext);

function LogoutButton() {
  return (
    <button onClick={() => sessionManager.logout()}>
      Logout
    </button>
  );
}
```

---

## 7️⃣ SESSION STATE MANAGEMENT

### React Context for Session

**File:** `app/lib/session-context.ts` (to be created)

```typescript
import { createContext, useContext, ReactNode } from 'react';

export interface SessionContextType {
  user: User | null;
  organization: Organization | null;
  permissions: string[];
  isLoading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

export const SessionContext = createContext<SessionContextType | null>(null);

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used inside SessionProvider');
  }
  return context;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // On mount, check if session is valid
    validateSession();
  }, []);
  
  async function validateSession() {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setOrganization(data.organization);
        setPermissions(data.permissions);
      } else {
        // Session invalid, redirect to login
        window.location.href = '/login';
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }
  
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setOrganization(null);
    setPermissions([]);
    window.location.href = '/login';
  }
  
  function hasPermission(permission: string) {
    return permissions.includes(permission);
  }
  
  return (
    <SessionContext.Provider value={{
      user,
      organization,
      permissions,
      isLoading,
      error,
      logout,
      hasPermission
    }}>
      {children}
    </SessionContext.Provider>
  );
}
```

---

## 8️⃣ PAGE TRANSITIONS & DASHBOARD

### Navigation Flow

```
User: Clicks "Dashboard"
  ↓
Browser: GET /dashboard
  ↓
Middleware:
  ├─ Read session cookies
  ├─ Validate JWT (or refresh)
  ├─ Attach session to request
  └─ Continue
  ↓
Route Handler:
  ├─ getSessionContext() (verify session)
  ├─ Fetch user's org data
  ├─ Fetch user's permissions
  ├─ Render page with data
  └─ Send HTML to browser
  ↓
Browser: Display dashboard
  ↓
React (client):
  ├─ Hydrate from server data
  ├─ Initialize SessionContext
  ├─ useEffect: validate session on client
  ├─ Register logout handler
  └─ Dashboard interactive

User: Clicks "Orders"
  ↓
Browser: GET /orders
  ↓
(Same flow as dashboard)
  ↓
Orders page loads
```

### Protected Navigation Component

**File:** `app/components/Navigation.tsx`

```typescript
'use client';

import { useSession } from '@/app/lib/session-context';
import Link from 'next/link';

export function Navigation() {
  const { user, logout, hasPermission } = useSession();
  
  return (
    <nav>
      <div>
        <h2>Logged in as: {user?.full_name}</h2>
      </div>
      
      <ul>
        <li><Link href="/dashboard">Dashboard</Link></li>
        
        {hasPermission('inventory.view') && (
          <li><Link href="/inventory">Inventory</Link></li>
        )}
        
        {hasPermission('orders.view') && (
          <li><Link href="/orders">Orders</Link></li>
        )}
        
        {hasPermission('finance.view') && (
          <li><Link href="/finance">Finance</Link></li>
        )}
      </ul>
      
      <button onClick={logout}>Logout</button>
    </nav>
  );
}
```

---

## 9️⃣ ERROR HANDLING & EDGE CASES

### Case 1: Session expires mid-page

```
User: Viewing /orders (session valid)
  ↓
Time passes (JWT expires)
  ↓
User: Clicks "Export Orders"
  ↓
POST /api/orders/export
  ↓
Server:
  ├─ Refresh token valid
  ├─ Issue new JWT
  ├─ Process request
  └─ Return data ✓
  
User: Sees nothing different (seamless)
```

### Case 2: Session completely expired

```
User: Viewing /orders (session valid)
  ↓
Time passes (>48h, both tokens expired)
  ↓
User: Clicks "Export Orders"
  ↓
POST /api/orders/export
  ↓
Server:
  ├─ JWT expired
  ├─ Refresh token expired
  ├─ No valid session
  └─ Return 401 Unauthorized
  
Client:
  ├─ Catch 401 error
  ├─ Store current URL: /orders
  ├─ Redirect to: /login?redirect=/orders&reason=session_expired
  └─ Clear all state
  
User:
  ├─ Sees login page
  ├─ Message: "Session expired, please log in again"
  ├─ Logs in
  ├─ Redirected back to /orders
  └─ Original request succeeds ✓
```

### Case 3: User deactivated

```
User: Viewing /dashboard (session valid)
  ↓
Admin: Deactivates user's account
  ↓
User: Refreshes page or makes request
  ↓
Server:
  ├─ Session check: userId is deactivated
  ├─ Check: organization_members.status = 'active'
  ├─ Status = 'deactivated'
  └─ Return 403 Forbidden
  
Client:
  ├─ Catch 403 error
  ├─ Show: "Your account has been disabled"
  ├─ Clear session
  └─ Redirect to login
```

### Case 4: Multi-org user switches org

```
User: In /dashboard (Org A context)
  ↓
User: Clicks "Switch Organization" → selects Org B
  ↓
Client:
  ├─ Save Org B ID to localStorage: 'selectedOrgId'
  ├─ POST /api/auth/switch-org { organizationId: 'OrgB' }
  └─ Refresh page
  
Server:
  ├─ Verify user is member of Org B
  ├─ Update session context
  ├─ Return Org B permissions
  └─ Client reloads context
  
User: Sees /dashboard for Org B
    (can't see Org A's data due to RLS)
```

---

## 🔟 IMPLEMENTATION CHECKLIST

### Phase 1: Foundation (THIS WEEK)
- [ ] Create `/api/auth/login` endpoint
- [ ] Create `/api/auth/logout` endpoint
- [ ] Create `/api/auth/me` endpoint (current session check)
- [ ] Create SessionContext (React)
- [ ] Create SessionProvider (wraps app)
- [ ] Protected route guard (redirect to login if no session)

### Phase 2: Dashboard & Navigation (NEXT WEEK)
- [ ] Build Navigation component (permission-based visibility)
- [ ] Build Dashboard page (requires session)
- [ ] Implement logout button
- [ ] Test page transitions (session persists)
- [ ] Test logout → login flow

### Phase 3: Error Handling (WEEK 3)
- [ ] Handle 401 responses (expired session)
- [ ] Show "session expired" message
- [ ] Redirect to login with next URL
- [ ] Handle 403 responses (account deactivated)
- [ ] Implement error boundary (catch unhandled errors)

### Phase 4: Advanced (WEEK 4)
- [ ] Cross-tab logout (BroadcastChannel API)
- [ ] Org switcher
- [ ] Session timeout warning (before logout)
- [ ] Remember "last org" (localStorage)
- [ ] Biometric login (optional)

---

## 🔟 TEST SCENARIOS

Before each page deployment, verify:

### Login Flow
- [ ] Valid credentials → success, redirect to dashboard
- [ ] Invalid credentials → error message, stay on login
- [ ] Too many attempts → rate limit error, wait 15 min
- [ ] Email not found → "Incorrect email or password"
- [ ] Org not found → "No access to this organization"

### Page Navigation
- [ ] Navigate from `/dashboard` → `/orders` → `/inventory` (all load)
- [ ] Session persists across pages
- [ ] Refresh page → session still valid
- [ ] Open new tab → same session (logged in)

### Logout
- [ ] Click logout → cleared to login page
- [ ] Click back button after logout → doesn't show cached dashboard
- [ ] Cookies deleted after logout
- [ ] localStorage cleared
- [ ] localStorage/sessionStorage survives logout (for next login)

### Expired Session
- [ ] JWT expires → client makes request → token refreshed → request succeeds
- [ ] Both tokens expire → 401 → redirected to login
- [ ] Page navigated to when session expires → shows "session expired" message
- [ ] Redirected from login to original page after re-login

### Error States
- [ ] Network error during login → show retry button
- [ ] Network error during navigation → show error + back button
- [ ] 500 server error → generic message + error reporting
- [ ] Rate limit → show "too many attempts" + countdown

---

## SECURITY REQUIREMENTS

Sessions must:
- ✅ Use HTTP-only cookies (not localStorage)
- ✅ Validate on every protected route
- ✅ Expire after inactivity (15 min JWT, 48h refresh)
- ✅ Clear completely on logout
- ✅ Prevent CSRF (SameSite cookies)
- ✅ Prevent session fixation (regenerate after login)
- ✅ Log login/logout to audit logs
- ✅ Detect concurrent deactivation (check status on each request)

---

## FILES TO CREATE

1. `app/api/auth/login/route.ts` — Login endpoint
2. `app/api/auth/logout/route.ts` — Logout endpoint
3. `app/api/auth/me/route.ts` — Current session info
4. `app/lib/session-context.ts` — React Context
5. `app/components/SessionProvider.tsx` — Context provider
6. `app/components/ProtectedRoute.tsx` — Guard component
7. `app/components/Navigation.tsx` — Nav with permission checks
8. `app/login/page.tsx` — Login page UI
9. `app/dashboard/page.tsx` — Dashboard (requires session)

---

**Status:** Ready for Phase 2 development  
**Next Session:** Build login UI + endpoints  
**Estimated Time:** 3-4 hours for complete session system
