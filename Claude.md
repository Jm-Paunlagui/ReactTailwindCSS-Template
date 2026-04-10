# CLAUDE.md — Aumovio React Frontend Template

This document is the canonical guide for working with this codebase.
Read it in full before making any changes.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Directory Structure](#3-directory-structure)
4. [The Three-Layer Feature Pattern](#4-the-three-layer-feature-pattern)
5. [Styling System](#5-styling-system)
6. [Security Architecture](#6-security-architecture)
7. [Authentication Architecture](#7-authentication-architecture)
8. [Routing Architecture](#8-routing-architecture)
9. [Provider Chain & App Startup](#9-provider-chain--app-startup)
10. [Component Library](#10-component-library)
11. [Hooks](#11-hooks)
12. [Utilities](#12-utilities)
13. [Adding a New Feature](#13-adding-a-new-feature)
14. [Absolute Rules (Never Break These)](#14-absolute-rules-never-break-these)
15. [Known Token Bug & Fix](#15-known-token-bug--fix)

---

## 1. Project Overview

This is a production-grade React SPA template for the Aumovio platform. It enforces a strict three-layer architecture (API → Hook → View) to eliminate the anti-pattern of placing HTTP calls directly inside components — the core problem this template was built to solve.

Every decision mirrors the philosophy of the paired `express-template` backend:
- Ship mechanisms, not hardcoded domain logic
- One file, one responsibility
- Permission logic defined at the call site, not buried in shared constants

---

## 2. Tech Stack

| Package | Version | Role |
|---------|---------|------|
| React | 19 | UI library |
| Vite | 8 | Build tool + dev server |
| Tailwind CSS | 4 | Utility-first CSS via `@tailwindcss/vite` plugin |
| react-router-dom | 7 | Client-side routing |
| Axios | 1 | HTTP client (used only inside `HttpClient.js`) |
| react-toastify | 11 | Toast notifications |
| @headlessui/react | 2 | Accessible UI primitives (Navbar dropdowns) |
| @heroicons/react | 2 | SVG icons |
| @fortawesome/* | 7 | Additional icons |
| js-cookie | 3 | Cookie access in `AuthMiddleware` |
| jose | 6 | JWT utilities |
| exceljs | 4 | Excel file generation |
| pdfjs-dist | 5 | PDF rendering |
| react-dropzone | 15 | File upload |
| React Compiler | 1 | Auto-memoisation via babel-plugin-react-compiler |

**React Compiler is enabled.** This means manual `useMemo`/`useCallback` are only needed when the compiler cannot infer them (rare). Avoid wrapping everything manually.

---

## 3. Directory Structure

```
src/
├── main.jsx                          # Entry point — provider chain only
├── App.jsx                           # Router only — ROLES defined here
│
├── assets/
│   ├── fonts/                        # AUMOVIOScreen-*.ttf
│   └── styles/
│       ├── index.css                 # Tailwind @theme tokens (ALL colour aliases)
│       └── pre-set-styles.jsx        # Named Tailwind class string constants
│
├── middleware/                       # Non-React infrastructure
│   ├── HttpClient.js                 # Axios singleton — JWT + CSRF injection
│   ├── authentication/
│   │   └── AuthMiddleware.js         # Cookie, localStorage, isAuth() with cache
│   └── security/
│       └── CsrfMiddleware.js         # CSRF token lifecycle manager
│
├── contexts/
│   └── security/
│       └── CsrfContext.jsx           # CsrfProvider + useCsrf()
│
├── components/
│   ├── routing/
│   │   └── ProtectedRoute.jsx        # Role + predicate access control
│   ├── layout/
│   │   ├── navbar/Navbar.jsx         # Sticky nav, auth-aware, dropdownGroups
│   │   ├── footer/Footer.jsx         # Simple footer
│   │   └── loading/
│   │       ├── LoadingScreen.jsx     # CSRF gate splash screen
│   │       └── SuspenseScreen.jsx    # React.Suspense fallback
│   ├── ui/
│   │   ├── Button.jsx                # 5 variants
│   │   ├── Badge.jsx                 # 9 colour variants
│   │   ├── Modal.jsx                 # Accessible dialog
│   │   └── SearchBar.jsx             # Debounce-aware search input
│   └── feedback/
│       ├── LoadingSpinner.jsx        # 3 sizes, fullPage mode
│       └── ErrorBoundary.jsx         # Class component, dev stack trace
│
├── features/                         # Domain features (colocated 3-layer)
│   ├── auth/
│   │   ├── auth.api.js               # HTTP layer
│   │   ├── auth.hook.js              # State + handlers layer
│   │   ├── Login.view.jsx            # Presentation layer
│   │   └── Logout.view.jsx
│   ├── dashboard/
│   │   └── Dashboard.view.jsx
│   └── users/                        # ← canonical 3-layer example
│       ├── users.api.js
│       ├── users.hook.js
│       └── UserList.view.jsx
│
├── hooks/                            # Generic reusable hooks
│   ├── useDocumentTitle.js
│   ├── useDebounce.js
│   └── usePagination.js
│
├── utils/                            # Pure functions, no React
│   ├── formatters.js
│   ├── validators.js
│   └── storage.js
│
└── views/
    └── errors/
        └── ClientErrorResponses.jsx  # 400/401/404/440/498/523 pages
```

---

## 4. The Three-Layer Feature Pattern

This is the **most important architectural rule** in the entire codebase.

Every domain feature lives under `src/features/<domain>/` and is split into exactly three files:

```
features/users/
├── users.api.js        LAYER 1 — Transport
├── users.hook.js       LAYER 2 — Business logic
└── UserList.view.jsx   LAYER 3 — Presentation
```

### Layer 1 — `.api.js` (Transport only)

- Imports `HttpClient` and makes HTTP calls
- Returns the raw Axios response — nothing else
- Zero state, zero side effects, zero React

```js
// ✅ Correct
export const usersApi = {
    getAll: (params) => httpClient.get('users', { params }),
    create: (data)   => httpClient.post('users', data),
};

// ❌ Wrong — no toast, no setState, no navigate
export const usersApi = {
    create: async (data) => {
        const res = await httpClient.post('users', data);
        toast.success('Created!'); // ← NEVER in .api.js
        return res;
    }
};
```

### Layer 2 — `.hook.js` (Business logic)

- Imports `.api.js` for HTTP calls
- Manages `loading`, `error`, and data state via `useState`
- Fires toast notifications
- Returns state + handler functions

```js
const createUser = useCallback(async (data) => {
    setLoading(true);
    try {
        const res = await usersApi.create(data);      // ← calls .api.js
        toast.success(res.data?.message || 'Created');
        await fetchUsers();
        return true;
    } catch (err) {
        toast.error(err.response?.data?.message || 'Failed');
        return false;
    } finally {
        setLoading(false);
    }
}, [fetchUsers]);
```

### Layer 3 — `.view.jsx` (Presentation only)

- Imports the hook — **never the api directly**
- Contains only JSX, event wiring, and local UI state (e.g. modal open/close)
- Zero HTTP calls, zero business logic

```jsx
// ✅ Correct
import { useUsers } from './users.hook';

export default function UserListView() {
    const { users, loading, createUser, removeUser } = useUsers();
    // ...render
}

// ❌ Wrong — never import .api.js in a view
import { usersApi } from './users.api';
```

### Import Dependency Rule

```
.view.jsx  →  .hook.js  →  .api.js  →  HttpClient
```

Arrows go one direction only. A `.view.jsx` that imports `.api.js` directly is a bug.

---

## 5. Styling System

### Tailwind v4 + `@theme` tokens

All colour and font tokens are declared in `src/assets/styles/index.css` using the Tailwind v4 `@theme` block. There are **two naming conventions** — both must be defined:

| Convention | Used by | Example |
|-----------|---------|---------|
| `orange-*` / `purple-*` | `pre-set-styles.jsx` | `text-orange-400`, `bg-purple-400` |
| `primary-*` / `secondary-*` | Component code, `ProtectedRoute` | `border-primary-400` |
| `danger-400` / `danger-100` | `pre-set-styles.jsx` | `text-danger-400`, `bg-danger-100` |
| `danger-default` / `danger-light` | Component code | `border-danger-default` |

**Critical:** `index.css` must define ALL of these aliases. See [Section 15](#15-known-token-bug--fix) for the complete corrected `@theme` block.

### `pre-set-styles.jsx` — The class constant library

All recurring Tailwind class strings are centralised here. Never scatter long class strings across component files. If you're writing a 4+ class string that will appear more than once, add it here.

```jsx
// pre-set-styles.jsx exports:
MAIN_BUTTON        // Orange primary button style
ACCENT_BUTTON      // Purple secondary button style
DANGER_BUTTON      // Red destructive button style
TEXT_FIELD         // Standard form input
ERROR_MESSAGE      // Red validation message box
TITLE_COLOR_TEXT   // Black bold heading
BASE_COLOR_TEXT    // Standard body text
STATUS_GREEN / STATUS_RED / STATUS_WARNING / STATUS_BLUE / STATUS_PURPLE / STATUS_CYAN / STATUS_AMBER
STATUS_INDICATOR_ACTIVE / INACTIVE / WARNING / ERROR
STATUS_TEXT_COLORS / STATUS_BG_COLORS / STATUS_BORDER_COLORS  // keyed maps
ALERT_ERROR / ALERT_SUCCESS / ALERT_WARNING / ALERT_INFO
CARD_ERROR / CARD_SUCCESS / CARD_WARNING / CARD_INFO / CARD_PURPLE
```

### Font classes

The Aumovio font is loaded via `@font-face` in `index.css` and assigned as the default `--font-sans`. Use these CSS utility classes defined in `index.css`:

```
.font-aumovio            → 400 weight
.font-aumovio-bold       → 700 weight  (most common)
.font-aumovio-italic     → italic
.font-aumovio-bold-italic
```

### Colour hierarchy (Aumovio brand guide)

```
Primary   → orange-400  (#FF4208)   60% of colour usage
Secondary → purple-400  (#4827AF)   30% of colour usage
Accents   → blue / turquoise / yellow / grey  10%
Validation → danger / warn / success
```

---

## 6. Security Architecture

### CSRF Token Lifecycle

```
App startup
    │
    ▼
CsrfProvider (CsrfContext.jsx)
    │  calls csrfMiddleware.initialize() once, idempotent
    ▼
CsrfMiddleware.js (singleton)
    │  GET /csrf/token → stores token in memory only (never localStorage/cookies)
    │  schedules auto-refresh based on server's refreshIn value
    ▼
CsrfGate (main.jsx)
    │  waits for isInitialized=true AND MIN_LOADING_MS (3500ms) elapsed
    │  on error → window.location.replace('/service-is-currently-unavailable')
    ▼
App renders
```

### HttpClient CSRF injection

`HttpClient.js` injects `x-csrf-token` on every mutating request (`POST/PUT/DELETE/PATCH`) automatically via the request interceptor. On a `403` CSRF error response, it retries once after `forceRefresh()`.

These endpoints are CSRF-exempt (they provision the token):
```
csrf/token | csrf/refresh | csrf/verify | csrf/status
```

These endpoints are also auth-exempt (no JWT):
```
csrf/token | csrf/refresh
```

### CSRF-exempt vs auth-exempt

```js
const CSRF_EXEMPT = ['csrf/token', 'csrf/refresh', 'csrf/verify', 'csrf/status'];
const AUTH_EXEMPT = ['csrf/token', 'csrf/refresh'];
```

### Token storage rules

| What | Where |
|------|-------|
| CSRF token | Memory only (JS variable in `CsrfMiddleware`) |
| JWT (`token`) | Cookie (`js-cookie`, `sameSite: 'Strict'`) |
| User data | `localStorage` (JSON, with `_lastVerified` timestamp) |

---

## 7. Authentication Architecture

### `AuthMiddleware.js`

Static utility class. Provides:

```js
AuthMiddleware.isAuth()            // → user object | false (5-min cached)
AuthMiddleware.authenticate(token, next)  // sets cookie, calls next()
AuthMiddleware.signout()           // clears cookie + localStorage + cache
AuthMiddleware.getCookie(key)
AuthMiddleware.setCookie(key, value, options)
AuthMiddleware.removeCookie(key)
AuthMiddleware.getLocalStorage(key)
AuthMiddleware.setLocalStorage(key, value)
AuthMiddleware.removeLocalStorage(key)
AuthMiddleware.clearAuthCache()
```

### `isAuth()` decision tree

```
1. No 'token' cookie?           → return false immediately
2. No 'user' in localStorage?   → return false immediately
3. In-memory cache valid?       → return cached user
4. Concurrent call in flight?   → await same promise (deduplication)
5. localStorage user._lastVerified < 5min?  → return localStorage user
6. Otherwise                    → POST /user-auth/verify, cache result
```

**Never call `isAuth()` in a tight loop.** The 5-minute cache prevents redundant verify calls across all components simultaneously.

### User object shape (from backend)

```js
{
    user_data: {
        userId:    string,
        username:  string,
        name:      string,
        userLevel: number,   // 1=USER, 2=ADMIN, 3=SADMIN
        area:      string,   // e.g. "INV_CON,FINANCE"
        email:     string,
    },
    _lastVerified: number    // Date.now() timestamp, internal use
}
```

---

## 8. Routing Architecture

### Route structure in `App.jsx`

```
/             → redirect to /auth
/auth         → LoginView (public)
/user/logout  → LogoutView (public)
/dashboard    → DashboardView (protected — all roles)
/unauthorized → Unauthorized error page
/bad-request  → BadRequest error page
/login-timeout → LoginTimeOut error page (clears auth)
/invalid-token → InvalidToken error page (clears auth)
/page-not-found → PageNotFound error page
/service-is-currently-unavailable → ServiceUnavailable (CSRF failure)
*             → redirect to /page-not-found
```

### `BARE_ROUTES` — routes without Navbar/Footer

```js
const BARE_ROUTES = [
    '/auth', '/sign-up', '/', '/user/logout',
    '/unauthorized', '/login-timeout', '/invalid-token',
    '/bad-request', '/page-not-found', '/service-is-currently-unavailable',
];
```

### ROLES constant

```js
const ROLES = { SADMIN: 3, ADMIN: 2, USER: 1 };
```

ROLES lives in `App.jsx`. There is **no global AREAS/permissions constant** — permission strings are defined inline at each `<ProtectedRoute>`.

### `ProtectedRoute` usage

```jsx
// Role-only (any of these roles can access)
<Route element={<ProtectedRoute role={[ROLES.ADMIN, ROLES.SADMIN]} />}>
    <Route path="settings" element={<SettingsView />} />
</Route>

// Permission string (area-based)
<Route element={<ProtectedRoute
    check={(user) => user.area?.includes('INV_CON')}
/>}>
    <Route path="inventory" element={<InventoryView />} />
</Route>

// Combined role + permission
<Route element={<ProtectedRoute
    role={[ROLES.ADMIN, ROLES.SADMIN]}
    check={(user) => user.area?.includes('HR_MANAGER')}
/>}>
    <Route path="hr" element={<HRView />} />
</Route>

// Custom redirect
<Route element={<ProtectedRoute
    role={[ROLES.USER]}
    redirectTo="/login-timeout"
/>}>
```

`ProtectedRoute` shows a spinner while verifying, then either renders `<Outlet />` or redirects.

---

## 9. Provider Chain & App Startup

```
index.html
    └── main.jsx
            └── <StrictMode>
                    └── <BrowserRouter>
                            └── <CsrfProvider>         ← CSRF init happens here
                                    └── <CsrfGate>     ← blocks render until ready
                                            └── <App>  ← Routes only
```

### `CsrfGate` logic

```js
if (pathname.startsWith('/service-is-currently-unavailable')) → render children
if (error && !isInitialized)  → window.location.replace('/service-is-currently-unavailable')
if (!isInitialized || !minElapsed) → <LoadingScreen />
otherwise → render children
```

`MIN_LOADING_MS = 3500` — ensures the loading screen is shown long enough to feel intentional, even on fast backends.

### Provider rules

- All providers live in `main.jsx` — **never in App.jsx**
- `App.jsx` contains only `<Routes>` and the `<ToastContainer>`
- New providers must be added to the chain in `main.jsx`

---

## 10. Component Library

### `Button.jsx`

```jsx
<Button variant="primary" size="md" loading={false} disabled={false} onClick={fn} type="button">
    Save Changes
</Button>
```

| Prop | Values | Default |
|------|--------|---------|
| `variant` | `primary` / `accent` / `danger` / `warning` / `ghost` | `primary` |
| `size` | `sm` / `md` / `lg` | `md` |
| `loading` | boolean | `false` |
| `disabled` | boolean | `false` |
| `type` | `button` / `submit` / `reset` | `button` |

Colour map: `primary`→orange, `accent`→purple, `danger`→red, `warning`→yellow, `ghost`→grey.

### `Badge.jsx`

```jsx
<Badge variant="green" dot={true} size="md">Active</Badge>
```

| `variant` | Colour |
|-----------|--------|
| `green` | success-400 |
| `red` | danger-400 |
| `warning` | warn-400 |
| `blue` | blue-400 |
| `purple` | purple-400 |
| `cyan` | turquoise-400 |
| `amber` | yellow-400 |
| `grey` | grey-500 |
| `orange` | orange-400 |

### `Modal.jsx`

```jsx
<Modal open={showModal} onClose={() => setShowModal(false)} title="Edit User" size="md">
    {/* content */}
</Modal>
```

- Closes on `Escape` key
- Locks body scroll when open
- Sizes: `sm` / `md` / `lg` / `xl`

### `SearchBar.jsx`

```jsx
const [input, setInput] = useState('');
const debounced = useDebounce(input, 300);

<SearchBar
    value={input}
    onChange={setInput}
    placeholder="Search…"
    isDebouncing={input !== debounced}
/>
```

Shows an orange spinner while debouncing, a ✕ button when input is set.

### `LoadingSpinner.jsx`

```jsx
<LoadingSpinner />                          // centered in parent
<LoadingSpinner size="lg" />               // sm | md | lg
<LoadingSpinner fullPage label="Loading…" /> // fills viewport
```

### `ErrorBoundary.jsx`

```jsx
<ErrorBoundary fallback={<p>Custom fallback</p>}>
    <MyComponent />
</ErrorBoundary>
```

In `DEV` mode shows a stack trace. In production shows a friendly "Try again" button.

### `Navbar.jsx`

Key extension point — the `dropdownGroups` array (inside `useMemo`) is where project-specific nav sections are added:

```js
const dropdownGroups = useMemo(() => {
    if (!user || isLoading) return [];
    return [
        {
            label:      'Management',
            segmentKey: 'management',   // matches URL segment
            depth:      1,
            items: [
                { name: 'Users',    href: '/management/users',    description: 'Manage users' },
                { name: 'Settings', href: '/management/settings', description: 'System config' },
            ],
        },
    ];
}, [user, isLoading]);
```

The `authLinks` array is the other customisation point for top-level authenticated nav links.

---

## 11. Hooks

### `useDocumentTitle(title, suffix?, keepOnUnmount?)`

```js
useDocumentTitle('User Management');         // "User Management — App"
useDocumentTitle('Dashboard', 'OPITS');      // "Dashboard — OPITS"
useDocumentTitle('Report', undefined, true); // persists after unmount
```

Reads `VITE_APP_NAME` from env as the default suffix.

### `useDebounce(value, delay = 300)`

```js
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 300);

// Pass to SearchBar:
isDebouncing={search !== debouncedSearch}

// Trigger effects only on stabilised value:
useEffect(() => { fetchData(debouncedSearch); }, [debouncedSearch]);
```

### `usePagination({ items, defaultPage?, defaultPageSize? })`

```js
const {
    page, pageSize, totalItems, totalPages,
    paginatedItems,           // the slice to render
    goNext, goPrev, goToPage,
    setPageSize,
    isFirstPage, isLastPage,
    startIndex, endIndex,
} = usePagination({ items: filteredUsers, defaultPageSize: 25 });
```

Client-side only. For server-side pagination, pass the page number to `.api.js` via the hook.

---

## 12. Utilities

### `formatters.js`

```js
formatDate(value)                     // "Apr 10, 2026"
formatDateTime(value)                 // "Apr 10, 2026, 02:30 PM"
formatNumber(1234567)                 // "1,234,567"
formatCurrency(1500, 'PHP', 'en-PH')  // "₱1,500.00"
truncate(str, 50)                     // "Long string…"
toReadableName('SNAKE_CASE')          // "Snake Case"
maskEmail('john@example.com')         // "jo**n@example.com"
```

### `validators.js`

```js
isValidEmail(email)               // RFC 5322 regex
isStrongPassword(password)        // min 8 chars, 1 letter + 1 digit
isNonEmpty(value)                 // non-empty trimmed string
isPositiveInt(value)              // positive integer
validateRequired(data, fields)    // → { valid: boolean, missing: string[] }
```

### `storage.js`

```js
storage.get('key')          // localStorage, JSON-parsed, never throws
storage.set('key', value)   // JSON-serialised
storage.remove('key')
storage.clear()

storage.session.get('key')  // same API for sessionStorage
storage.session.set('key', value)
```

---

## 13. Adding a New Feature

Follow these steps exactly. The `users/` feature is the canonical example.

### Step 1: Create the feature directory

```
src/features/<domain>/
├── <domain>.api.js
├── <domain>.hook.js
└── <DomainList>.view.jsx    (or whatever name fits)
```

### Step 2: Write `<domain>.api.js`

```js
import httpClient from '../../middleware/HttpClient';

export const inventoryApi = {
    getAll:   (params) => httpClient.get('inventory', { params }),
    getById:  (id)     => httpClient.get(`inventory/${id}`),
    create:   (data)   => httpClient.post('inventory', data),
    update:   (id, d)  => httpClient.put(`inventory/${id}`, d),
    remove:   (id)     => httpClient.delete(`inventory/${id}`),
};
```

### Step 3: Write `<domain>.hook.js`

```js
import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { inventoryApi } from './inventory.api';

export const useInventory = () => {
    const [items, setItems]   = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError]   = useState(null);

    const fetchItems = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const res = await inventoryApi.getAll(params);
            setItems(res.data?.data ?? []);
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to load items';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }, []);

    // ...other handlers

    return { items, loading, error, fetchItems };
};
```

### Step 4: Write `<DomainName>.view.jsx`

```jsx
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useInventory } from './inventory.hook';

export default function InventoryView() {
    useDocumentTitle('Inventory');
    const { items, loading, fetchItems } = useInventory();

    useEffect(() => { fetchItems(); }, [fetchItems]);

    return (/* JSX only */);
}
```

### Step 5: Register the route in `App.jsx`

```jsx
// 1. Add lazy import at the top
const InventoryView = lazy(() => import('./features/inventory/Inventory.view'));

// 2. Add route inside the appropriate ProtectedRoute block
<Route element={<ProtectedRoute
    role={[ROLES.USER, ROLES.ADMIN, ROLES.SADMIN]}
    check={(user) => user.area?.includes('INV_CON')}
/>}>
    <Route path="inventory" element={<InventoryView />} />
</Route>
```

### Step 6: Add to Navbar (optional)

Add to the `authLinks` array or a new `dropdownGroups` entry in `Navbar.jsx`.

---

## 14. Absolute Rules (Never Break These)

### Architecture rules

1. **Views NEVER import `.api.js` directly.** Only hooks import API files.
2. **Never import `axios` directly** in feature code. Always use `HttpClient.js`.
3. **ROLES and route definitions live in `App.jsx`.** No global AREAS constant.
4. **Permission strings (`area?.includes('...')`) are defined inline at each route.**
5. **All providers live in `main.jsx`.** App.jsx is Routes only.
6. **HttpClient is the only place Axios is configured.** Interceptors, base URL, credentials — all of it is here and nowhere else.
7. **CsrfMiddleware is a singleton.** Never instantiate it directly. Import the default export.

### Styling rules

8. **All recurring Tailwind class strings go in `pre-set-styles.jsx`**, not scattered across component files.
9. **Use `orange-400` / `purple-400` / `danger-400` / `warn-400` naming** (the `pre-set-styles.jsx` convention), not `primary-400` / `secondary-400` inside components. The `primary-*` / `secondary-*` aliases exist for backward compat.
10. **`index.css` must define BOTH naming conventions** (orange-400 AND primary-400, danger-400 AND danger-default). If a token is missing, Tailwind silently renders no colour — verify after any changes to `@theme`.

### Security rules

11. **CSRF tokens are memory-only.** Never write them to localStorage or cookies.
12. **Auth tokens (JWT) are cookie-only.** Never write them to localStorage.

### Data flow rules

13. **Error messages always come from `err.response?.data?.message`** with a fallback string. Never show raw error objects in toasts.
14. **`loading` state must always be reset in `finally`** — not only in `try` or `catch`.
15. **`useCallback`** the handler functions in hooks so views don't cause infinite effect loops when passing them as `useEffect` dependencies.

---

## 15. Known Token Bug & Fix

### The problem

`src/assets/styles/index.css` (as committed) only defines `--color-primary-*`, `--color-secondary-*`, `--color-danger-default`, `--color-danger-light`, etc.

But `pre-set-styles.jsx` references: `orange-400`, `purple-400`, `danger-400`, `danger-100`, `warn-400`, `warn-100`, `success-400`, `success-100`, `blue-100`, `turquoise-100`, `yellow-100`, `grey-100`, `grey-200`, `grey-300`, `grey-500`.

In Tailwind v4, `danger-400` and `danger-default` are **different tokens**. If `danger-400` is not defined, every class using it silently renders nothing.

### The fix — complete corrected `@theme` block

```css
@theme {
    /* Orange (primary) — overrides Tailwind default */
    --color-orange-100: #FFB7A1;
    --color-orange-400: #FF4208;
    --color-orange-500: #da3806;

    /* Purple (secondary) — overrides Tailwind default */
    --color-purple-100: #a08ae5;
    --color-purple-400: #4827AF;
    --color-purple-500: #341c7d;

    /* Primary / secondary aliases (component code + ProtectedRoute) */
    --color-primary-100: #FFB7A1;
    --color-primary-400: #FF4208;
    --color-primary-500: #da3806;
    --color-secondary-100: #a08ae5;
    --color-secondary-400: #4827AF;
    --color-secondary-500: #341c7d;

    /* Blue */
    --color-blue-100: #a3ddf5;
    --color-blue-400: #18a9e7;
    --color-blue-500: #1b8dce;

    /* Turquoise */
    --color-turquoise-100: #a1f7ea;
    --color-turquoise-400: #12caae;

    /* Yellow */
    --color-yellow-100: #ebe9b5;
    --color-yellow-400: #cec43a;

    /* Grey */
    --color-grey-100: #f0f0f0;
    --color-grey-200: #dcdcdc;
    --color-grey-300: #c8c8c8;
    --color-grey-400: #aaaaaa;
    --color-grey-500: #787878;

    /* Danger — BOTH naming conventions required */
    --color-danger-400:     #d82822;   /* pre-set-styles: text-danger-400 */
    --color-danger-100:     #f0d3dc;   /* pre-set-styles: bg-danger-100 */
    --color-danger-default: #d82822;   /* component code: border-danger-default */
    --color-danger-light:   #f0d3dc;   /* component code: bg-danger-light */

    /* Warn — BOTH naming conventions required */
    --color-warn-400:     #ffd600;
    --color-warn-100:     #ffee99;
    --color-warn-default: #ffd600;
    --color-warn-light:   #ffee99;

    /* Success — BOTH naming conventions required */
    --color-success-400:     #32cb70;
    --color-success-100:     #adebc6;
    --color-success-default: #32cb70;
    --color-success-light:   #adebc6;

    /* Font */
    --font-sans: 'Aumovio', ui-sans-serif, system-ui, -apple-system, sans-serif;
}
```

Also add these CSS utility classes at the end of `index.css` (outside `@theme`):

```css
.font-aumovio            { font-family: var(--font-sans) !important; }
.font-aumovio-bold       { font-family: var(--font-sans) !important; font-weight: 700; }
.font-aumovio-italic     { font-family: var(--font-sans) !important; font-style: italic; }
```

And these missing animation keyframes:

```css
@keyframes scale-in-center {
    from { opacity: 0; transform: scale(0.85); }
    to   { opacity: 1; transform: scale(1); }
}
.animate-scale-in-center { animation: scale-in-center 0.5s ease-out forwards; }
```

(`LoadingScreen.jsx` uses `animate-scale-in-center` which is not in the committed `index.css`.)

---

## Environment Variables

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1/   # Must end with /
VITE_APP_NAME=YourAppName                          # Used in useDocumentTitle
VITE_APP_ENV=development
```

---

## Build & Dev

```bash
npm install
npm run dev       # Vite dev server on :5173
npm run build     # Production build → dist/
npm run preview   # Preview production build
npm run lint      # ESLint
```

The build uses `manualChunks` to split vendor bundles:

```
vendor-react  → react + react-dom
vendor-router → react-router-dom
vendor-ui     → react-toastify + @headlessui + @heroicons + @fortawesome
vendor        → everything else in node_modules
```