--> [main project index](../README.md)

## Nodepad Backend ##


## Run Tests locally ##
```sh ./scripts/tests-start.sh```


## Database and Cache ##



Run the development server (from `backend/`):

```bash
uv run fastapi dev app/main.py
```

### Database & Migrations

Migrations are managed with Alembic (`backend/alembic.ini`, `backend/app/alembic/`):

```bash
# Apply migrations
uv run alembic upgrade head

# Create a new migration
uv run alembic revision --autogenerate -m "description"
```

### Linting, Type Checking, and Formatting

```bash
bash scripts/lint.sh
bash scripts/format.sh
```

### Running Tests

Tests require a running PostgreSQL instance configured via `.env`:

```bash
bash scripts/tests-start.sh
```

Or run `pytest` directly via `scripts/test.sh` (which runs `coverage run -m pytest tests/` and generates an HTML coverage report in `backend/htmlcov/`).

## Data Model & Structures

- **Database**: PostgreSQL 18+ with the `ltree` extension enabled (`backend/app/alembic/versions/346ced739fbd_add_ltree_to_node.py`).
- **IDs**: UUID v7 (`edwh-uuid7`) for time-ordered primary keys.
- **Hierarchy & Ordering**: Nodes store `parent_id`, a materialized `path` (`LtreeType`), `level`, and a `Numeric(30, 15)` `position` for fractional indexing (`backend/app/crud/nodes.py`, `backend/app/services/nodes.py`, `backend/app/services/lists.py`).
