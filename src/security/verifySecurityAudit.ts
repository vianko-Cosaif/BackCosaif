import 'dotenv/config';
import { resolveSecurityAuditPath, verifySecurityAuditFile } from './securityAudit';

async function main() {
  const key = String(process.env.AUDIT_HMAC_KEY ?? '');
  if (key.length < 32) throw new Error('AUDIT_HMAC_KEY es requerida y debe tener al menos 32 caracteres');

  const filePath = resolveSecurityAuditPath();
  const result = await verifySecurityAuditFile(filePath, key);
  if (!result.valid) {
    console.error(JSON.stringify({ filePath, ...result }));
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify({ filePath, ...result }));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
