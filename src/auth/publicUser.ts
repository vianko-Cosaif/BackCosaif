import type { Prisma } from '@prisma/client';
// Explicit output contract: never include authentication or session fields.
export const publicUserSelect = {
  id: true, nombre: true, rol: true, empresaId: true, localidadId: true,
} as const satisfies Prisma.UsuarioSelect;
