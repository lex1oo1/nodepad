# API Contracts

REST API specification derived from `backend/app/api/main.py`, `backend/app/api/routes/*.py`, and `backend/app/schemas/*.py`.

- **Base Prefix**: `/api/v1` (`settings.API_V1_STR`)
- **OpenAPI Schema**: `GET /api/v1/openapi.json`
- **Authentication**: OAuth2 Password Flow (`POST /api/v1/login/access-token`) returning a Bearer JWT (`HS256`, `sub = user.id`). Protected endpoints require `Authorization: Bearer <token>`.

## Auth & Error Conventions

| Status | Meaning |
| :--- | :--- |
| `400` | Bad request (e.g., invalid credentials, inactive user, duplicate email, invalid reset token) |
| `401` | User referenced by token not found |
| `403` | Invalid/missing JWT credentials, insufficient permissions, or non-owner access |
| `404` | Resource (`User`, `NodeList`, `Node`) not found |
| `409` | Conflict (email already exists on update) |
| `422` | FastAPI / Pydantic validation error |

---

## 1. Login & Password Recovery (`/api/v1`, tag: `login`)

| Method | Path | Auth | Request | Response | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/login/demo` | Public | — | `DemoSession` (`access_token`, `token_type`, `list_id`) | Creates ephemeral demo user and copies "Weekend Getaway: Chamonix" |
| `POST` | `/login/demo/cleanup` | User (Demo) | — | `Message` | Deletes demo user and all their lists/nodes upon session exit or window close |
| `POST` | `/login/demo/reset` | User (Demo) | — | `DemoSession` (`access_token`, `token_type`, `list_id`) | Resets demo user's outline back to default state |
| `POST` | `/login/access-token` | Public | Form `OAuth2PasswordRequestForm` (`username`, `password`) | `Token` (`access_token`, `token_type="bearer"`) | `400` on bad credentials or inactive user |
| `POST` | `/login/test-token` | User | — | `UserPublic` | Validates current Bearer token |
| `POST` | `/password-recovery/{email}` | Public | Path `email: str` | `Message` | Always returns generic message to prevent enumeration |
| `POST` | `/reset-password/` | Public | `NewPassword` (`token`, `new_password` 8..128) | `Message` | `400` if token invalid or user inactive |
| `POST` | `/password-recovery-html-content/{email}` | Superuser | Path `email: str` | `HTMLResponse` | Preview reset email HTML (`404` if user missing) |

---

## 2. Users (`/api/v1/users`, tag: `users`)

| Method | Path | Auth | Request | Response | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/users/` | Superuser | Query `skip=0`, `limit=100` | `UsersPublic` (`data`, `count`) | Ordered by `created_at DESC` |
| `POST` | `/users/` | Superuser | `UserCreate` | `UserPublic` | Sends new-account email if SMTP enabled |
| `POST` | `/users/signup` | Public | `UserRegister` (`email`, `password` 8..128, `full_name?`) | `UserPublic` | `400` if email exists |
| `GET` | `/users/me` | User | — | `UserPublic` | Current user profile |
| `PATCH` | `/users/me` | User | `UserUpdateMe` (`full_name?`, `email?`) | `UserPublic` | `409` if email taken by another user |
| `PATCH` | `/users/me/password` | User | `UpdatePassword` (`current_password`, `new_password`) | `Message` | `400` on wrong or identical password |
| `DELETE` | `/users/me` | User | — | `Message` | `403` if superuser |
| `GET` | `/users/{user_id}` | User/Superuser | Path `user_id: UUID` | `UserPublic` | Non-superusers can only read self (`403` otherwise) |
| `PATCH` | `/users/{user_id}` | Superuser | Path `user_id: UUID`, `UserUpdate` | `UserPublic` | `404` missing, `409` duplicate email |
| `DELETE` | `/users/{user_id}` | Superuser | Path `user_id: UUID` | `Message` | `403` on self-delete; deletes user's `NodeList`s |

---

## 3. Lists (`/api/v1/lists`, tag: `lists`)

Ownership rule: Non-superusers can only read/modify lists where `NodeList.owner_id == current_user.id` (`403` otherwise).

| Method | Path | Auth | Request | Response | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/lists/` | User | Query `skip=0`, `limit=100` | `NodeListsPublic` (`data`, `count`) | Superusers see all lists; users see own lists |
| `POST` | `/lists/` | User | `NodeListCreate` (`title` 1..255, `description?`, `nodes?`) | `NodeListPublic` | Creates list (and optional initial nodes) |
| `GET` | `/lists/{id}` | User | Path `id: UUID` | `NodeListPublic` | Returns list with ordered `nodes` |
| `PUT` | `/lists/{id}` | User | Path `id: UUID`, `NodeListUpdate` | `NodeListPublic` | Updates metadata and/or bulk-syncs `nodes` |
| `DELETE` | `/lists/{id}` | User | Path `id: UUID` | `Message` | Cascades to all nodes in list |

---

## 4. Nodes (`/api/v1/nodes`, tag: `nodes`)

Ownership rule: Non-superusers must own the parent `NodeList` (`403` otherwise).

| Method | Path | Auth | Request | Response | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/nodes/` | User | Query `nodelist_id: UUID`, Body `NodeCreate` (`content` <=255, `parent_id?`, `position?`, `id?`) | `Node` | Appends/inserts node and computes `path`/`level` |
| `PATCH` | `/nodes/{id}` | User | Path `id: UUID`, Body `NodeUpdate` (`content?`, `parent_id?`, `position?`, `level?`) | `Node` | Updates content and/or moves node |
| `POST` | `/nodes/{id}/reorder` | User | Path `id: UUID`, Query `before_id?: UUID`, `after_id?: UUID` | `Node` | Fractional-index reorder between siblings |
| `DELETE` | `/nodes/{id}` | User | Path `id: UUID` | `Message` | Cascades to descendant nodes |

---

## 5. Utilities & Local Private Routes

| Method | Path | Auth | Request | Response | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/utils/health-check/` | Public | — | `bool` (`true`) | Used by Docker healthcheck |
| `POST` | `/utils/test-email/` | Superuser | Query `email_to: EmailStr` | `Message` | Status `201`; sends test email |
| `POST` | `/private/users/` | Public (**`local` env only**) | `PrivateUserCreate` (`email`, `password`, `full_name`, `is_verified`) | `UserPublic` | Mounted only when `ENVIRONMENT == "local"` |

