# Data Model

Database schema and tree/ordering mechanics from `backend/app/models/` and `backend/app/crud/nodes.py`.

## 1. Entity Relationship Overview

```
User (1) ────< (N) NodeList (1) ────< (N) Node
                                            │
                                            └──< (N) Node (self-referential parent_id)
```

All primary keys use `uuid.UUID` generated with `edwh_uuid7.uuid7`.

## 2. Tables

### `user` (`backend/app/models/users.py`)

| Column | Type | Constraints / Default | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PK, default `uuid7` | Time-ordered UUID v7 |
| `email` | `String` | Unique, Indexed, Not Null | Login identifier |
| `hashed_password` | `String` | Not Null | Argon2 / Bcrypt via `pwdlib` |
| `full_name` | `String` | Nullable | Optional display name |
| `is_active` | `Boolean` | Default `True` | Soft active flag |
| `is_superuser` | `Boolean` | Default `False` | Admin privilege flag |
| `created_at` | `DateTime(tz)` | Not Null, `server_default=func.now()` | |
| `updated_at` | `DateTime(tz)` | Nullable, `onupdate=func.now()` | |

- Relationship: `lists: list[NodeList]` (`cascade="all, delete"`).

### `nodelist` (`backend/app/models/lists.py`)

| Column | Type | Constraints / Default | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PK, default `uuid7` | |
| `title` | `String(255)` | Not Null | List title |
| `description` | `String(255)` | Nullable, default `None` | Optional description |
| `owner_id` | `UUID` | FK `user.id` (`ON DELETE CASCADE`), Not Null | Owner user |
| `created_at` | `DateTime(tz)` | Not Null, `server_default=func.now()` | |
| `updated_at` | `DateTime(tz)` | Nullable, `onupdate=func.now()` | |

- Relationship: `nodes: list[Node]` (`cascade="all, delete-orphan"`, `order_by="cast(Node.path, String), Node.position"`).

### `node` (`backend/app/models/lists.py`)

| Column | Type | Constraints / Default | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PK, default `uuid7` | |
| `nodelist_id` | `UUID` | FK `nodelist.id` (`ON DELETE CASCADE`), Not Null | Parent list |
| `parent_id` | `UUID` | FK `node.id` (`ON DELETE CASCADE`), Nullable | `None` for root nodes |
| `content` | `String` | Not Null | Node text (API schema caps at `max_length=255`) |
| `position` | `Numeric(30, 15)` | Not Null | Fractional index among siblings |
| `path` | `LtreeType` | Not Null | Materialized path of `node_id.hex` labels |
| `level` | `Integer` | Not Null, `server_default="0"` | Depth in tree (`0` = root) |
| `created_at` | `DateTime(tz)` | Not Null, `server_default=func.now()` | |
| `updated_at` | `DateTime(tz)` | Nullable, `onupdate=func.now()` | |

**Constraints & Indexes on `node`:**
- `ck_node_parent_not_self`: `parent_id IS NULL OR parent_id <> id`
- `idx_nodes_list_parent_pos`: `(nodelist_id, parent_id, position)`
- `idx_node_path_gist`: GiST index on `path`
- `idx_node_level`: B-tree index on `level`

## 3. Hierarchy & Ordering Mechanics

- **Path Calculation (`backend/app/services/nodes.py`)**:
  - Root node: `path = Ltree(node_id.hex)`, `level = 0`.
  - Child node: `path = parent_path + node_id.hex`, `level = parent_level + 1`.
- **Fractional Indexing (`backend/app/crud/nodes.py`)**:
  - `get_position_start`: `MIN(position) - 1000` (defaults to `1000` if empty).
  - `get_position_end`: `MAX(position) + 1000` (defaults to `1000` if empty).
  - `get_position_between`: `(left.position + right.position) / 2` using `SELECT ... FOR UPDATE`.
  - `reindex_nodes`: Reassigns `ROW_NUMBER() OVER (ORDER BY position) * 1000` for siblings under `(nodelist_id, parent_id)`.
- **Subtree Moves & Bulk Updates**:
  - Moving a node under a new parent updates its `path` and `level` and cascades path/level updates to descendants.
  - Bulk list updates use `get_lis_nodes` (`backend/app/services/lists.py`) to keep the longest increasing subsequence of existing sibling positions untouched.

