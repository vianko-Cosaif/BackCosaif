module.exports = function postgresEnvironment(connectionString) {
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('URL PostgreSQL inválida');
  const schema = url.searchParams.get('schema');
  if (schema && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) throw new Error('Esquema PostgreSQL inválido');
  return {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGSSLMODE: url.searchParams.get('sslmode') || 'prefer',
    PGCONNECT_TIMEOUT: '10',
    ...(url.searchParams.has('schema') ? { PGOPTIONS: `-c search_path=${url.searchParams.get('schema')}` } : {}),
  };
};
