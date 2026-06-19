# Project Memory

## Core
Un usuario = una sola empresa (cliente). Varios usuarios pueden compartir la misma empresa. Forzar con UNIQUE(user_id) en membership y RLS por company_id.

## Memories
- [Multi-tenancy](mem://features/multi-tenancy) — Modelo 1 empresa por usuario, N usuarios por empresa
