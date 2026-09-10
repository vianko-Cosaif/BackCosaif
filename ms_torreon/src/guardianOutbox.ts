// Canonical Guardian transport source. Other services receive a checked copy via sync-guardian.cjs.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

export type GuardianBatch = { requestId: string; body: string; eventIds: string[] };
type IdentifiedEvent = { eventId: string };

/** Private, bounded journal. A batch keeps its body and identity until Guardian acknowledges it. */
export class GuardianOutbox<T extends IdentifiedEvent> {
  private readonly events = new Map<string, T>();
  private pending?: GuardianBatch;
  private readonly journal: string;
  private readonly batchFile: string;
  private readonly lock: string;
  private closed = false;
  private storageFailed = false;

  constructor(private readonly directory: string, private readonly capacity = 2000) {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    fs.chmodSync(directory, 0o700);
    this.journal = path.join(directory, 'events.jsonl');
    this.batchFile = path.join(directory, 'pending.json');
    this.lock = path.join(directory, 'owner.pid');
    if (fs.existsSync(this.lock)) {
      const pid = Number(fs.readFileSync(this.lock, 'utf8'));
      if (!Number.isSafeInteger(pid) || pid < 1) throw new Error('Guardian outbox owner is invalid');
      let alive = true;
      try { process.kill(pid, 0); } catch (error) {
        alive = (error as NodeJS.ErrnoException).code !== 'ESRCH';
      }
      if (alive) throw new Error('Guardian outbox already has an owner; use a separate GUARDIAN_OUTBOX_INSTANCE');
      fs.unlinkSync(this.lock);
    }
    fs.writeFileSync(this.lock, String(process.pid), { flag: 'wx', mode: 0o600 });
    try {
      if (fs.existsSync(this.journal)) {
        if (fs.statSync(this.journal).size > capacity * 17000) throw new Error('Guardian journal exceeds its bound');
        const journal = fs.readFileSync(this.journal, 'utf8');
        // Only a final partial append can be discarded after a process/storage failure.
        const complete = journal.slice(0, journal.lastIndexOf('\n') + 1);
        for (const line of complete.split('\n').filter(Boolean)) {
          const event = JSON.parse(line) as T;
          this.validate(event);
          this.events.set(event.eventId, event);
        }
        if (this.events.size > capacity) throw new Error('Guardian journal exceeds its capacity');
        if (complete !== journal) this.atomic(this.journal, complete);
      }
      if (fs.existsSync(this.batchFile)) {
        if (fs.statSync(this.batchFile).size > 140000) throw new Error('Guardian batch exceeds its bound');
        const batch = JSON.parse(fs.readFileSync(this.batchFile, 'utf8')) as GuardianBatch;
        if (!/^[0-9a-f-]{36}$/.test(batch.requestId) || typeof batch.body !== 'string'
            || Buffer.byteLength(batch.body) > 60000 || !Array.isArray(batch.eventIds)
            || batch.eventIds.length > 100) throw new Error('Invalid Guardian batch');
        this.pending = batch;
      }
    } catch (error) { this.close(); throw error; }
  }

  get size() { return this.events.size; }

  enqueue(event: T): void {
    this.ensureOpen();
    this.validate(event);
    if (this.events.has(event.eventId)) return;
    if (this.events.size >= this.capacity) throw new Error('Guardian outbox is full; pending events were preserved');
    const descriptor = fs.openSync(this.journal, 'a', 0o600);
    try { fs.writeFileSync(descriptor, JSON.stringify(event) + '\n'); fs.fsyncSync(descriptor); }
    catch (error) { this.storageFailed = true; throw error; }
    finally { fs.closeSync(descriptor); }
    this.events.set(event.eventId, event);
  }

  batch(telemetry: Record<string, unknown>): GuardianBatch {
    this.ensureOpen();
    if (this.pending) return this.pending;
    const selected: T[] = [];
    let body = JSON.stringify({ telemetry, events: selected });
    if (Buffer.byteLength(body) > 43000) throw new Error('Guardian telemetry exceeds the batch budget');
    for (const event of this.events.values()) {
      const candidate = JSON.stringify({ telemetry, events: [...selected, event] });
      if (selected.length === 100 || Buffer.byteLength(candidate) > 60000) break;
      selected.push(event); body = candidate;
    }
    const batch = { requestId: randomUUID(), body, eventIds: selected.map(event => event.eventId) };
    this.atomic(this.batchFile, JSON.stringify(batch));
    this.pending = batch;
    return batch;
  }

  acknowledge(requestId: string, receipt: unknown): void {
    this.ensureOpen();
    if (!this.pending || this.pending.requestId !== requestId) throw new Error('Guardian batch acknowledgement mismatch');
    const result = receipt as { requestId?: unknown; status?: unknown; acceptedEvents?: unknown } | null;
    if (!result || result.requestId !== requestId
        || !['STORED', 'DUPLICATE'].includes(String(result.status))
        || result.acceptedEvents !== (result.status === 'DUPLICATE' ? 0 : this.pending.eventIds.length)) {
      throw new Error('Guardian receipt is invalid; pending events were preserved');
    }
    const acknowledged = new Set(this.pending.eventIds);
    const remaining = [...this.events.values()].filter(event => !acknowledged.has(event.eventId));
    // Persist remaining events before removing the batch. A crash only causes an idempotent retry.
    this.atomic(this.journal, remaining.map(event => JSON.stringify(event) + '\n').join(''));
    fs.unlinkSync(this.batchFile);
    for (const id of acknowledged) this.events.delete(id);
    this.pending = undefined;
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    fs.unlinkSync(this.lock);
  }

  private validate(event: T) {
    if (!event || !/^[0-9a-f-]{36}$/.test(event.eventId)
        || Buffer.byteLength(JSON.stringify(event)) > 16000) throw new Error('Invalid or oversized Guardian event');
  }
  private ensureOpen() {
    if (this.closed) throw new Error('Guardian outbox is closed');
    if (this.storageFailed) throw new Error('Guardian storage failed; repair disk and restart the agent');
  }
  private atomic(destination: string, value: string) {
    const temporary = `${destination}.${randomUUID()}.tmp`;
    try {
      const descriptor = fs.openSync(temporary, 'wx', 0o600);
      try { fs.writeFileSync(descriptor, value); fs.fsyncSync(descriptor); }
      finally { fs.closeSync(descriptor); }
      fs.renameSync(temporary, destination);
      // Directory fsync is required on the Linux production target; Windows cannot open directories this way.
      if (process.platform !== 'win32') {
        const directory = fs.openSync(this.directory, 'r');
        try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
      }
    } catch (error) {
      this.storageFailed = true;
      if (fs.existsSync(temporary)) { try { fs.unlinkSync(temporary); } catch { /* Preserve diagnostic evidence on disk failure. */ } }
      throw error;
    }
  }
}

export function guardianOutboxDirectory(service: string): string {
  const instance = process.env.GUARDIAN_OUTBOX_INSTANCE || process.env.NODE_APP_INSTANCE || '0';
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(instance) || !/^[a-z0-9-]{1,80}$/.test(service)) {
    throw new Error('Invalid Guardian outbox identity');
  }
  return path.resolve(process.env.GUARDIAN_OUTBOX_DIR || '.private/guardian-outbox', `${service}-${instance}`);
}
