# Account journey architecture

## Outcome

The account journey protects the product's first-value moment:

1. A visitor records a first win without creating an account.
2. The win is stored locally and immediately reflected back with specific encouragement.
3. The visitor may create an account or sign in.
4. Local wins are migrated to that account with idempotent writes.
5. Only successfully migrated local records are removed from the device.

Registration is a persistence step, not an entrance fee.

## Module boundaries

### `src/features/account/guestWins.js`

Owns the versioned local-storage record format. It validates, reads, writes and removes guest wins. It has no React, routing or network knowledge.

### `src/features/account/migrateGuestWins.js`

Owns the local-to-server migration transaction. It depends only on an API-shaped object and the guest repository. Every write carries a deterministic idempotency key, so retrying after a partial failure cannot duplicate a win.

### `src/features/account/components/`

Owns the public first-win and registration screens. Components may coordinate form state and navigation, but must not read or mutate local storage directly.

### `src/contexts/AuthContext.jsx`

Owns authenticated session state and token persistence. It exposes email, Google and self-host login commands. It does not own guest data.

### `api/routes/auth_routes.py`

Owns the HTTP contract: accepted fields, validation errors, rate limits and safe response shapes. It does not issue SQL.

### `api/services/user_service.py`

Owns account rules and password hashing/checking. It does not know about HTTP or guest migration.

### `api/database_users.py`

Owns atomic user persistence and uniqueness checks. It never returns credentials to the client; route serializers explicitly whitelist public fields.

## Data boundaries

- Guest wins exist only in `little-wins:guest-wins:v1` on the current device.
- Passwords are accepted only over the auth endpoint and stored only as Werkzeug password hashes.
- Email comparison is performed on a trimmed, lower-cased normalized address.
- Mood entries remain scoped by the authenticated JWT user ID.
- A failed migration keeps its local source record; a successful migration removes only that record.
- Guest idempotency keys are stable across retries and unique within an account.

## Public contracts

### Register

`POST /api/auth/email/register`

```json
{ "name": "可选显示名", "email": "person@example.com", "password": "12+ characters" }
```

Returns `{ token, user }`. Duplicate addresses return `409` without exposing credential data.

### Login

`POST /api/auth/email/login`

```json
{ "email": "person@example.com", "password": "account password" }
```

Returns `{ token, user }`. Unknown account and wrong password share one generic `401` response.

## Failure and retry model

- Form drafts remain in component state while a request is in flight or fails.
- Registration/login errors are shown beside the form and do not clear the guest win.
- Migration proceeds record by record and reports migrated and remaining counts.
- Re-entering the migration after interruption is safe because the server create endpoint already enforces `(user_id, idempotency_key)` uniqueness.

## Deferred requirements

- Email ownership verification.
- Password reset and recovery.
- Account deletion/export from the account screen.
- Cross-device conflict resolution beyond server-created record ordering.
