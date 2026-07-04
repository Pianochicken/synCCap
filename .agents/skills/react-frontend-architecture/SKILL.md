---
name: react-frontend-architecture
description: >
  Enforces professional-grade React frontend architecture decisions. Triggers on:
  React SPA setup, page routing, multi-page apps, component structure,
  data fetching patterns, theming/dark mode, CSS architecture, and any
  new frontend feature involving navigation or state management.
---

# React Frontend Architecture Standards

This skill encodes **hard-won lessons** from the synCCap project. These are non-negotiable
architectural requirements — follow them from day one, not as a refactor later.

---

## 1. Routing: Always URL-Based from Day One

**NEVER use `useState` to manage page/view routing in a multi-page SPA.**

### Rule
If the app has more than one distinct "page" or "view" that a user would expect to
navigate between, install `react-router-dom` immediately and define proper URL routes.

### Why
- **URL is the Web's fundamental contract.** Users expect distinct pages = distinct URLs.
- Browser refresh, back/forward, bookmarks, and link-sharing all depend on the URL.
- In-memory state routing creates a "works on my machine" illusion that breaks the moment
  a user refreshes the page.

### Implementation Pattern
```tsx
// main.tsx — Wrap app with BrowserRouter at the root
import { BrowserRouter } from 'react-router-dom';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);

// App.tsx — Declarative route definitions
import { Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Inside any component — use useNavigate() for programmatic navigation
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
// onClick={() => navigate('/dashboard')}
```

### Anti-Patterns to Avoid
```tsx
// ❌ NEVER DO THIS for page-level navigation
const [page, setPage] = useState<'landing' | 'login'>('landing');
if (page === 'landing') return <LandingPage onLogin={() => setPage('login')} />;

// ❌ NEVER pass navigation callbacks as props
interface Props { onNavigateBack: () => void; }

// ✅ Components own their navigation via useNavigate()
const navigate = useNavigate();
<button onClick={() => navigate('/')}>Back</button>
```

---

## 2. Data Fetching: Colocate with Consumer Components

**NEVER fetch data in a parent component that conditionally renders the consumer.**

### Rule
Data fetching (`useEffect` + API calls) must live inside the component that actually
renders the data. If `Dashboard` needs assets/transfers/penalties, the fetch logic
belongs in `Dashboard.tsx` — NOT in `App.tsx`.

### Why
- Prevents wasted API calls when the component isn't mounted.
- Prevents auth errors (e.g., 401 from stale tokens) on pages where the user hasn't
  even chosen to log in yet.
- Keeps the root `App.tsx` lean — it should only handle routing and cross-cutting state.

### Implementation Pattern
```tsx
// App.tsx — ONLY manages auth state and routing
function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={
        session ? <Dashboard session={session} /> : <Navigate to="/login" />
      } />
    </Routes>
  );
}

// Dashboard.tsx — Owns its own data lifecycle
const Dashboard: React.FC<Props> = ({ session }) => {
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    if (session) fetchData();
    else setAssets([]);
  }, [session.partyId]);
  // ...
};
```

---

## 3. Theming: CSS Custom Properties from Day One

**NEVER use hardcoded Tailwind dark-mode classes as the sole color source.**

### Rule
All color values in components must reference CSS custom properties
(`var(--text-primary)`, `var(--bg-surface)`, etc.) — never hardcoded classes like
`text-white`, `bg-gray-900`, `border-gray-800` that only work in one theme.

### Why
- Hardcoded dark classes become invisible text on light backgrounds.
- Refactoring from hardcoded classes to CSS variables requires touching every component —
  this is a waste of time that should never happen.

### Implementation Pattern
```css
/* index.css — Define tokens for both themes */
:root {
  --bg-page: #f7f8fc;
  --bg-surface: #ffffff;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --border-color: #e2e8f0;
}

.dark {
  --bg-page: #030712;
  --bg-surface: #111827;
  --text-primary: #f1f5f9;
  --text-secondary: #cbd5e1;
  --text-muted: #64748b;
  --border-color: #1e293b;
}
```

```tsx
// ✅ CORRECT — works in both themes automatically
<h1 style={{ color: 'var(--text-primary)' }}>Title</h1>
<div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>

// ❌ WRONG — invisible in light mode
<h1 className="text-white">Title</h1>
<div className="bg-gray-900 border-gray-800">
```

### Tailwind-Specific Gotcha
Tailwind v3's `@apply` directive does NOT work inside nested CSS selectors.
Always write flat selectors:
```css
/* ❌ BROKEN */
.btn { @apply px-4 py-2; &:hover { @apply bg-blue-600; } }

/* ✅ CORRECT */
.btn { @apply px-4 py-2; }
.btn:hover { @apply bg-blue-600; }
```

---

## 4. Component Architecture: Separation of Concerns

### File Roles
| File | Responsibility | Should NOT contain |
|------|---------------|-------------------|
| `main.tsx` | Provider wrappers (Router, Theme, Auth) | Business logic |
| `App.tsx` | Route definitions, top-level auth state | Data fetching, UI rendering |
| `components/Dashboard.tsx` | Dashboard layout + data lifecycle | Auth token management |
| `components/views/*.tsx` | Role-specific UI + user actions | Cross-cutting state |
| `api/client.ts` | HTTP client, interceptors | UI state, React hooks |

### Props vs Hooks Decision
- **Pass via props:** Auth state that multiple routes need (e.g., `session` or `authSession`)
- **Use hooks inside component:** Navigation (`useNavigate`), data fetching, local UI state

---

## 5. API Client: Default Port Consistency

### Rule
The frontend API client's default `baseURL` must match the backend's actual default port.

```tsx
// ✅ Backend defaults to PORT=3000, so frontend must match
const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3000';
```

Mismatching default ports (e.g., frontend defaulting to `:4000` while backend runs on
`:3000`) causes silent CORS/connection failures that are confusing to debug.

---

## 6. Backend Logging: Use Appropriate Log Levels

### Rule
HTTP access logs should use severity levels that reflect the HTTP status code,
not just always `info`.

```typescript
// ✅ CORRECT — 4xx/5xx responses should log as warn/error
const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
logger.log(level, `${method} ${path} - ${status} - ${duration}ms`);

// ❌ MISLEADING — 401 errors appear as green "info" in console
logger.info(`${method} ${path} - ${status} - ${duration}ms`);
```

---

## Quick Reference: New Feature Checklist

When building any new frontend feature, verify:

- [ ] Does it need a new URL? → Add a `<Route>` in `App.tsx`
- [ ] Does it fetch data? → Put the fetch in the component, not a parent
- [ ] Does it use colors? → Use `var(--token)`, never hardcoded classes
- [ ] Does it navigate? → Use `useNavigate()`, never callback props
- [ ] Does it have a loading state? → Show a spinner, not a blank screen
- [ ] Does it handle errors? → Catch and display, don't let 401s show as "info"
