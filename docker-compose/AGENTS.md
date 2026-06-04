<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-01 | Updated: 2026-06-01 -->

# docker-compose

## Purpose
Docker Compose deployment configuration for running xkube with its MySQL and Redis dependencies. Includes the database seed file for initial setup.

## Key Files
| File | Description |
|------|-------------|
| `docker-compose.yml` | Defines services: xkube app, MySQL 8.0, Redis; mounts config and database files |
| `db_xkube.sql` | MySQL database schema and seed data (~155KB); creates all tables for the `db_xkube` database |

## For AI Agents

### Working In This Directory
- Deploy with: `docker-compose up -d` or `docker compose up -d`
- Stop with: `docker-compose down`
- The SQL file must be imported into MySQL before the application starts
- MySQL version must be 8.0+
- Database: `db_xkube` with `utf8mb4` charset

### Common Patterns
- The `db_xkube.sql` file contains table definitions for: clusters, users, roles, RBAC nodes, audit logs, wiki, favorites, CI/CD configs, and app names
- Table prefix: `xkb_` for application tables, `rbac_` for admin/RBAC tables

<!-- MANUAL: -->
