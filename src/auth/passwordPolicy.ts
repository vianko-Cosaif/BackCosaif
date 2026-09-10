import argon2 from 'argon2';
export const passwordHashOptions = {
  type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1,
};
export function validatePasswordSize(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length < 8 || Buffer.byteLength(value) > 1024) {
    throw new Error('La contraseña debe tener entre 8 caracteres y 1024 bytes');
  }
}
