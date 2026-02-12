# Informe de causa raíz: desviaciones del modelo de roles en Supabase

## Resumen ejecutivo
Se detectaron inconsistencias entre BD, RLS, backend y frontend: coexistían varios modelos de permisos (`is_root_admin`, `is_admin`, `Viewer`, RPC legacy), lo que provocaba decisiones distintas según la capa.

## Causas raíz detectadas
1. **Fuente de verdad fragmentada**
   - El estado de privilegios se resolvía mezclando flags históricos en `profiles` (`is_root_admin`, `is_admin`) y roles en `user_roles` con valores heterogéneos (`viewer`, `Viewer`, etc.).
2. **Funciones/RPC con compatibilidad heredada**
   - Frontend (`usePermissions`) y auth usaban fallback a funciones antiguas (`is_root_admin`, `is_admin`, firmas alternativas de `has_role`).
3. **RLS no unificada por capacidad funcional**
   - Algunas políticas permitían CRUD solo a administrador/superadmin en módulos donde también debía editar `Editor`.
4. **Backend de administración acoplado a nomenclatura legacy**
   - Edge functions de creación de usuarios y cambio de contraseña autorizaban por `is_root_admin`, no por el modelo objetivo `is_superadmin`.
5. **UI con gating parcial**
   - En la gestión de usuarios y carga documental se mostraban reglas y textos ligados al modelo anterior (sin reflejar `Editor` y `Espectador`).

## Impacto funcional
- Usuarios con rol operativo (`Editor`) podían quedar bloqueados para acciones de edición/subida.
- Superadmin y administrador podían ver comportamientos inconsistentes entre vistas y endpoints.
- Mayor riesgo de errores de autorización por desalineación entre capas.

## Corrección aplicada
- Se unificó el modelo sobre:
  - `profiles.is_superadmin` (no asignable desde UI).
  - `user_roles.role` en `{'Administrador','Editor','Espectador'}`.
- Se implementaron funciones canónicas:
  - `is_superadmin(uid)`, `has_role(uid, r)`, `can_manage_company(uid)`, `can_edit_content(uid)`.
- Se actualizó RLS para módulos funcionales con patrón:
  - lectura para autenticados;
  - edición/CRUD por `can_edit_content(auth.uid())`.
- Se reforzó seed idempotente de `admin@admin.com` como superadmin.
- Se alineó backend para que endpoints críticos (`admin-create-user`, `admin-update-user-password`) acepten solo superadmin (403 en otro caso).
- Se actualizó frontend con `usePermissions()` central para derivar capacidades (`canManageCompany`, `canEditContent`, `isViewer`, `canManagePasswords`) y aplicar gating consistente en Empresa/Documentos.

## Estado esperado
- Superadmin: acceso total + gestión de contraseñas.
- Administrador: gestión de empresa/usuarios + CRUD funcional (sin cambio de contraseñas).
- Editor: edición de contenido y adjuntos sin acceso a empresa/usuarios.
- Espectador: solo lectura.
