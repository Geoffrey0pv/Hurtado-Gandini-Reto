---
name: Multi-tenancy model
description: One company per user account; multiple users can belong to the same company
type: feature
---
- Un usuario está asociado a UNA sola empresa (cliente). No se permite multi-empresa por usuario.
- Una empresa puede tener varios usuarios trabajando sobre ella (colaboración).
- Al modelar auth/orgs: tabla `companies` + `company_members(user_id, company_id, role)` con UNIQUE(user_id) para forzar 1 empresa por usuario.
- Todo recurso (colaboradores, novedades, expedientes, documentos, obligaciones) debe filtrarse por `company_id` vía RLS.
