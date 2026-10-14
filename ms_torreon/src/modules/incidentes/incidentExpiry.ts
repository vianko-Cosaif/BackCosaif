// Torreón model v1.1: time cannot resolve, cancel or replace a natural movement.
// Compatibility exports deliberately perform no work; the server has no expiry worker.
export async function expireNaturalIncident(_id: number, _now = new Date()) { return { changed: false }; }
export function startIncidentExpiry() { return () => {}; }
