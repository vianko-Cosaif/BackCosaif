# Roles de usuarios

Corrige el error PostgreSQL `22P02` al guardar un usuario con uno de los roles
definidos en Prisma que aún no existen en la base. La migración agrega los cinco
valores faltantes al enum `Rol`; no actualiza ni elimina usuarios.

Aplicar en la base principal configurada por `DATABASE_URL`:

```sh
node scripts/security-migrate.cjs --target=main --version=roles-20260917 --apply
node scripts/security-migrate.cjs --target=main --version=roles-20260917 --check
```

El ejecutor registra el checksum y no vuelve a aplicar una migración registrada.
No requiere reiniciar el backend ni regenerar Prisma si el cliente ya contiene
estos roles. El cambio entra en vigor después del commit.
