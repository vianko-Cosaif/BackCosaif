/**
 * auth.ts (interfaces)
 * 
 * Define las interfaces relacionadas con el proceso de autenticación
 * y autorización mediante tokens JWT y usuarios autenticados.
 * 
 * Estas interfaces son utilizadas en todo el sistema para garantizar
 * el tipado estricto de los datos JWT y del usuario autenticado.
 */

/**
 * JwtPayload
 * 
 * Representa la estructura del payload decodificado de un token JWT.
 * 
 * Propiedades:
 * - `id`: Identificador único del usuario (obligatorio).
 * - `jti`: JWT ID, identificador único del token (opcional). Usado para revocación de tokens.
 * - `iat`: Fecha de emisión del token (timestamp UNIX en segundos) (opcional).
 * - `exp`: Fecha de expiración del token (timestamp UNIX en segundos) (opcional).
 */
export interface JwtPayload {
  sub?: string;
  userId?: number;
  jti?: string;
  id?: number;
  rol?: string;
  v?: number;
  iat?: number;
  exp?: number;
}

/**
 * SafeUser
 * 
 * Representa un subconjunto seguro de los datos del usuario
 * que pueden ser expuestos al cliente o utilizados internamente
 * en el sistema una vez autenticado.
 * 
 * Propiedades:
 * - `id`: Identificador único del usuario.
 * - `usuario`: Nombre de usuario (login).
 * - `rol`: Rol asignado al usuario (e.g., admin, operador).
 */
export interface SafeUser {
  id: number;
  usuario: string;
  rol: string;
}

export interface AuthTokenMeta {
  jti: string;
  iat?: number;
  exp?: number;
  v?: number;
  expiresAt?: string;
}

export interface AuthenticatedUser {
  id: number;
  nombre: string;
  rol: string;
  empresa?: { id: number; nombre: string };
  localidad?: { id: number; nombre: string; estado: string };
  auth: AuthTokenMeta;
}
