import { Prisma } from '../../generated';
import { CommercialDomainError } from './domainError';
export function cents(value: unknown): number {
  const amount = new Prisma.Decimal(String(value));
  const result = amount.mul(100);
  if (!result.isFinite() || !result.isInteger() || result.abs().gt('99999999999999')) {
    throw new CommercialDomainError('El importe debe tener como máximo dos decimales y caber en Decimal(14,2)');
  }
  return result.toNumber();
}
