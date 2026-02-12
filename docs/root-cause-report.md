# Root-cause report: acceso admin y errores de schema cache

## 1) ¿Por qué `admin@admin.com` no tenía acceso a Empresa/admin?

### Hallazgos
- La app tenía chequeos de permisos mezclados entre diferentes fuentes (`profiles`, RPC `has_role` con firma antigua y `is_root_admin`), lo que podía desalinear el estado real del usuario.  
- La lógica de UI estaba duplicada en componentes (por ejemplo Documentos) y no centralizada en un único origen de verdad.
- Se detectó riesgo de apuntar a proyecto Supabase incorrecto cuando variables de entorno no coinciden entre frontend y entorno de datos.

### Correcciones aplicadas
- Se añadió logging en desarrollo para mostrar `Supabase URL` y `projectRef` al iniciar el cliente.
- Se unificó la evaluación de permisos con RPC basadas en BD (`is_superadmin`, `has_role(uid, r)`), y se creó `usePermissions()` para mapear capacidades funcionales de UI.
- Se reforzó el seed idempotente de `admin@admin.com` como superadministrador (`is_root_admin=true`) y rol `Administrador`.

## 2) ¿Por qué faltaban tablas en schema cache?

### Hallazgos
- El error `Could not find table 'public.<tabla>' in the schema cache` no corresponde a RLS denegando acceso; indica desalineación de esquema/proyecto/naming.
- El frontend consume nombres exactos (`audits`, `capa_plans`, `non_conformities`, `actions`, `incidencias`) y si alguna tabla no existe en `public`, o el frontend apunta a otro proyecto, Supabase devuelve ese error de cache.

### Correcciones aplicadas
- Se agregó una migration idempotente que asegura creación de esas tablas con el naming exacto esperado por frontend.
- Se habilitó RLS (sin desactivarlo) y se aplicaron políticas CRUD para `Administrador` o `Superadministrador` a través de `can_manage_qms(uid)`.
- Se dejó explícito en frontend el uso de nombres de tabla sin prefijo de esquema (por ejemplo `from('incidencias')`).

## 3) Estado esperado tras aplicar cambios

- `admin@admin.com` entra como superadministrador y tiene acceso a Empresa.
- Botones y vistas de gestión respetan:
  - `Superadministrador`: acceso total + gestión de contraseñas.
  - `Administrador`: gestión funcional (documentos, incidencias, auditorías, acciones).
- No deben aparecer errores de schema cache si el frontend apunta al mismo proyecto donde corrieron las migrations.
