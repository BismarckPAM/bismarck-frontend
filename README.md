# Bismarck PAM — Frontend

A React + TypeScript single-page application for the Bismarck Privileged Access
Management (PAM) system. It drives the access-request / approval / JIT / audit /
notification workflow implemented by the `bismarck-backend` microservices.

The API contract documented below was derived directly from the backend source
at commit **`5e8214fcb4b747d01ad0fdbca56cc94a4d950efd`** (*"feat: approval service
initialization"*). Nothing here is invented: where an endpoint does not exist,
that is called out explicitly and handled gracefully by the UI.

---

## Stack

| Concern | Choice |
| --- | --- |
| Framework | React 19 + TypeScript 6 |
| Build tool | Vite 8 |
| Routing | react-router-dom 7 |
| HTTP | axios (shared clients with Bearer-token + 401 interceptors) |
| Icons | lucide-react |
| Tests | Vitest 4 + React Testing Library + jsdom |
| Lint / format | ESLint 10 (flat config) + Prettier 3 |
| Package manager | **npm** (there is a `package-lock.json`) |

---

## Getting started

```bash
# from the bismarck-frontend directory
npm install
cp .env.example .env      # if present — otherwise create .env (see below)
npm run dev               # http://localhost:5173
```

### Environment variables

All variables are read at build time by Vite and must be prefixed with `VITE_`.
No secrets belong here.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `VITE_API_URL` | yes (for live API) | `''` | Base URL of the **API Gateway** — the single public entry point for every browser call. |
| `VITE_AUTHORIZATION_API_URL` | no | falls back to `VITE_API_URL` | Existing project convention; only used by the authorization client. |
| `VITE_NOTIFICATION_POLL_MS` | no | `60000` | Notification polling interval in **milliseconds**. Deliberately not aggressive. |
| `VITE_CAPABILITIES` | no | `{}` | JSON overrides for backend capability flags (see below). |

Example `.env`:

```dotenv
VITE_API_URL=http://localhost:8080
VITE_NOTIFICATION_POLL_MS=60000
```

All `/api` and `/authz` calls are proxied through the gateway (`vite.config.ts`
`server.proxy`), so a single base URL is all that is required.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server (Vite). |
| `npm run build` | Type-check (`tsc -b`) then create a production build. |
| `npm run preview` | Serve the production build locally. |
| `npm run lint` | Run ESLint over the whole project. |
| `npm run format` | Auto-format with Prettier. |
| `npm run format:check` | Verify formatting (used in CI). |
| `npm run test` | Run Vitest in watch mode. |
| `npm run test:run` | Run the test suite once. |
| `npm run test:coverage` | Run tests with V8 coverage. |

### Quality gate

All of the following pass on the current tree:

```bash
npm run lint
npm run format:check
npm run test:coverage
npm run build
```

Latest results: **lint 0 problems**, **format clean**, **126 tests passing across
26 files**, **coverage 82.8% statements / 84.6% lines / 75.8% branches**,
**production build succeeds**.

---

## Backend API mapping

Base URL = API Gateway. Every request is authenticated with a **JWT Bearer
token** in the `Authorization` header. The gateway forwards to the owning
service.

| Feature | Method | Endpoint | Request body | Response | Required role |
| --- | --- | --- | --- | --- | --- |
| Submit access request | `POST` | `/api/approval/requests` | `CreateApprovalRequestRequest` | `ApprovalRequestResponse` (201) | Any authenticated user |
| List pending requests (approval queue) | `GET` | `/api/approval/requests` | — | `ApprovalRequestResponse[]` | Approver (`Admin`) — others get `403` |
| View a single request | `GET` | `/api/approval/requests/{id}` | — | `ApprovalRequestResponse` | Any authenticated user |
| Approve request | `POST` | `/api/approval/requests/{id}/approve` | — | `ApprovalRequestResponse` | Approver (`Admin`) — others get `403` |
| Reject request | `POST` | `/api/approval/requests/{id}/reject` | `RejectApprovalRequest` | `ApprovalRequestResponse` | Approver (`Admin`) — others get `403` |
| List notifications | `GET` | `/api/notifications/{userId}?page=&pageSize=` | — | `PagedResult<NotificationResponseDto>` | Any authenticated user |
| Query audit logs | `GET` | `/api/audit/logs?user=&resource=&eventType=&from=&to=&page=&pageSize=` | — | `PagedResult<AuditLog>` | `[Authorize]` (policies vary by service) |
| Manually revoke a JIT permission | `POST` | `/api/authorization/permissions/{id}/revoke` | — | `{ message, id, status, revokedAt }` | `Admin` — others get `403` |
| List resources | `GET` | `/api/resources` | — | `ResourceResponse[]` | Any authenticated user |
| Log in | `POST` | `/api/identity/auth/login` | `LoginRequest` | `LoginResponse` | Public |

### Request / response shapes (exact backend fields)

**`CreateApprovalRequestRequest`** (`POST /api/approval/requests`)

| Field | Type | Validation (backend) |
| --- | --- | --- |
| `resourceId` | `string` | **Required**, max length 100 |
| `requestedLevel` | `int` | Range **1–5** |
| `reason` | `string` | **Required**, max length 500 |
| `durationMinutes` | `int` | Range **1–1440** |

**`RejectApprovalRequest`** (`POST /api/approval/requests/{id}/reject`)

| Field | Type | Validation (backend) |
| --- | --- | --- |
| `reason` | `string` | **Required**, max length 500 |

**`ApprovalRequestResponse`**

```
id: Guid, requesterUserId: string, resourceId: string,
requestedLevel: int, reason: string, durationMinutes: int,
status: "PENDING" | "APPROVED" | "REJECTED",
createdAt: DateTime, reviewedAt: DateTime | null,
reviewedByUserId: string | null, rejectionReason: string | null
```

### Status / enum values

- **`ApprovalStatus`** (backend enum, serialised): `PENDING`, `APPROVED`, `REJECTED`.
- The frontend normaliser `normalizeApprovalStatus` tolerates both the string
  enum name and a numeric ordinal, because not every service registers
  `JsonStringEnumConverter`.
- **Roles** — the Identity token carries a *single* role (`ClaimTypes.Role`).
  Approver authorization is configured as `Approval:ApproverRoles = ["Admin"]`,
  so **Admin** is the only role the backend currently treats as an approver.
  `Manager` is handled defensively in the UI (`src/auth/roles.ts`) so it works if
  that configuration is ever widened — but backend authorization stays
  authoritative.

### Error response format

- Validation failures (`400`) return ASP.NET Core `ValidationProblemDetails`
  with an `errors` map. `normalizeApiError` (`src/api/errors.ts`) folds these
  into a single readable message.
- `403` (forbidden) and `401` (unauthenticated) are surfaced distinctly.
- `404` → not found, `409` → conflict (e.g. approving an already-decided request,
  or revoking a non-active permission). The conflict body is `{ message }`.
- Network/timeouts/malformed payloads are converted to a generic, user-safe
  message — raw stack traces are never displayed.

---

## Authentication & authorization

- **Mechanism:** JWT Bearer token stored in `localStorage` via the existing
  helpers (`getAuthToken`, `TOKEN_KEY`). The shared axios clients attach the
  token and handle `401` through a central interceptor.
- **Current user:** loaded once at startup (`src/context/AuthProvider.tsx`). The
  user model exposes `id`, `fullName`, `email`, `role`, `department` — enough to
  render identity, gate navigation, and fetch the notification feed
  (`GET /api/notifications/{userId}`).
- **Role checks are for usability only.** Route guards (`RequireAuth`,
  `RequireRole`) and hidden actions improve UX; the backend remains the source of
  truth. A user who navigates directly to `/approval-queue` still receives `403`
  from the API if they are not an approver.
- **Token never rendered.** Access tokens are not shown in the UI.

---

## Screens & features

| Route | Screen | Who sees it |
| --- | --- | --- |
| `/` | Dashboard | All authenticated users |
| `/request-access` | Request Access form | All authenticated users |
| `/my-requests` | My Requests | All authenticated users |
| `/approval-queue` | Approval Queue | Approvers (Admin) |
| `/jit` | JIT Access | All authenticated users (revoke is Admin-only) |
| `/audit` | Audit Log | Admin (and Manager defensively) |
| `/notifications` | Notifications | All authenticated users |

Navigation items are filtered by role; route guards enforce access on direct URL
entry. Every screen implements loading, empty, error, retry, disabled, and
success states, and mutations update state in place without a full page reload.

### Dashboard
Summarises the current user's activity: totals, pending/approved/rejected
counters, unread notifications, recent notifications, and — for approvers — the
pending queue and a link to the audit log. Optional panels degrade gracefully if
their endpoint is unavailable.

### Request Access
Submits to `POST /api/approval/requests` using the exact field names above.
Client-side validation mirrors the backend: resource required, access level
required (1–5), justification required with a minimum length, duration required
and positive (1–1440). Handles `400/401/403/404/409/500`, network failures,
unknown formats. On success it shows the new request id + status, resets the
form, inserts the request into My Requests, and refreshes notifications — no
reload.

### My Requests
Lists requests submitted in the current session (see limitations) with search,
status/resource filtering, newest/oldest/status sorting, detail drawer, and the
full status timeline. Status is conveyed by accessible text, not colour alone.

### Approval Queue
Approver-only. Lists pending requests with requester/resource/level/duration/
timestamp. Approve (with confirmation dialog) and Reject (modal requiring a
reason, validated non-blank) call the exact backend endpoints, disable while
submitting, prevent duplicate submissions, update the queue in place on success,
preserve dialog input on failure, and refresh notifications.

### Notifications
Bell in the shell with unread count, plus a full page. Fetches
`GET /api/notifications/{userId}`, shows title/message/time/read-state/type,
links to the related request when a request id exists, offers manual refresh,
and polls on a configurable interval with a single well-cleaned-up timer (no
duplicate intervals or leaks). Empty/loading/error states are handled.

### JIT Access
JIT grants are created automatically by the `approval-granted` Kafka event —
there is **no standalone JIT request endpoint**. The only JIT mutation the
backend exposes is the Admin-only manual revoke
(`POST /api/authorization/permissions/{id}/revoke`), which this screen wires up.
Normal access requests and JIT grants are clearly distinguished.

### Audit Log
Queryable audit feed (`GET /api/audit/logs`) with search, filtering by actor,
action/event type, resource and date, pagination, and an event detail view.
Sensitive metadata is only shown to the extent the backend authorises it.

---

## API architecture

```
src/
  api/          # one module per backend area — no fetch calls in components
    client.ts       # shared axios clients (Bearer + 401 interceptors)
    config.ts       # env + capability flags
    errors.ts       # normalizeApiError
    approval.ts  notifications.ts  audit.ts  jit.ts  auth.ts
  auth/roles.ts   # role helpers (approver/admin/audit/revoke)
  components/     # layout, common, requests, notifications, auth guards
  context/        # AuthProvider / useAuth
  hooks/          # useResources
  pages/          # one component per screen
  state/          # WorkflowProvider (requests + notifications store)
  types/          # shared domain types (pam.ts, auth.ts)
```

- **Base URL** comes only from `VITE_API_URL` (no per-service env vars).
- Responses are **typed**; errors are converted consistently, never thrown raw.
- **Abort/cancellation** is supported (list endpoints accept an `AbortSignal`).
- Logging is limited to development.

---

## Capability flags (missing endpoints)

`src/api/config.ts` holds flags for endpoints that **do not exist** in the
backend today. Defaults reflect reality; flip them (or set `VITE_CAPABILITIES`)
once an endpoint is added, with no screen changes required.

| Flag | Default | Reason |
| --- | --- | --- |
| `approvalPendingQueue` | `true` | `GET /api/approval/requests` exists (approver-only). |
| `approvalGetById` | `true` | `GET /api/approval/requests/{id}` exists. |
| `approvalMyRequests` | `false` | **No "list my own requests" endpoint.** The `GET` above returns the approver-only pending queue, so My Requests shows session-submitted requests. |
| `notificationsList` | `true` | `GET /api/notifications/{userId}` exists. |
| `notificationsMarkRead` | `false` | **No mark-as-read endpoint.** Read state is local-only and clearly not persisted. |
| `auditList` | `true` | `GET /api/audit/logs` exists. |
| `jitList` | `false` | **No "list JIT permissions" endpoint.** |
| `jitRequest` | `false` | **No standalone JIT request endpoint** (grants come from the `approval-granted` event). |
| `jitRevoke` | `true` | `POST /api/authorization/permissions/{id}/revoke` exists (Admin-only). |

### Backend limitations / future work

1. **No "my requests" listing** — the UI tracks session-submitted requests and
   labels the limitation explicitly. Add an endpoint to make history complete.
2. **No notification mark-as-read** — the notification log is immutable by
   design; read state is deliberately local-only.
3. **No JIT list/request endpoints** — JIT is event-driven; only manual revoke is
   exposed.
4. **Approver role is `Admin` only** — `Manager` is handled defensively pending a
   configuration change.
5. **Only three approval statuses** — `PENDING`/`APPROVED`/`REJECTED`. There is no
   backend `EXPIRED` approval status; expiry is a JIT-permission concept. The
   timeline therefore shows only the stages that actually apply.

---

## Manual testing

Run the backend (gateway + services) and `npm run dev`, then log in.

**Normal user**
1. Log in with a non-admin account → only Dashboard / Request Access / My
   Requests / JIT / Notifications appear.
2. Manually visit `/approval-queue` → access is denied (guard + backend `403`).
3. Submit a request with a blank resource / bad duration → field validation
   blocks it.
4. Submit a valid request → success message with id + `PENDING`; it appears in My
   Requests without a reload.

**Manager**
1. Log in → same screens as a normal user (backend treats only `Admin` as
   approver).
2. `/approval-queue` reflects the backend decision (`403` → denied).

**Admin**
1. Log in → Approval Queue and Audit Log become visible.
2. Approve a pending request (confirmation dialog) → row leaves the queue;
   notifications refresh.
3. Reject a pending request with a blank reason → blocked; with a reason →
   removed from the queue and the reason is shown in details.

**Approved request** — appears in My Requests with `APPROVED` and an approval
timestamp/approver.

**Rejected request** — shows `REJECTED` plus the rejection reason.

**Expired request** — an approved request whose JIT window has elapsed; expiry is
reflected on the JIT screen (the approval status has no backend `EXPIRED` value).

**JIT request** — an approved request provisions a temporary permission via the
`approval-granted` event; as Admin, revoke it from the JIT screen (non-admins
see no revoke action).

**Notification refresh** — watch the bell unread count update on the polling
interval, or press Refresh on the Notifications page.

**Unauthorized access** — as a normal user, open `/approval-queue` or `/audit`
directly → denied, no data leaked.

---

## Notes / assumptions

- The frontend preserves the existing project structure and reuses the existing
  axios clients, auth helpers, CSS class system, and `Resources.tsx` patterns.
- No backend behaviour, fields, or schemas were modified.
- Where an endpoint is missing, the UI degrades gracefully and the limitation is
  stated in-product rather than faked.