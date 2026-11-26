import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createDbClient } from './db/database.js';
import { ensureSchema } from './db/schema.js';

async function main() {
  const config = loadConfig();
  const db = createDbClient({
    databaseUrl: config.databaseUrl,
    sqlitePath: config.sqlitePath,
  });

  await ensureSchema(db);

  const app = createApp({ db, config });
  const server = app.listen(config.port, () => {
    console.log(
      `[k12-cn-server] listening on port ${config.port} (dialect=${db.dialect}, devAuth=${config.enableDevAuth})`
    );
  });

  const shutdown = async () => {
    server.close();
    await db.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[k12-cn-server] fatal startup error:', err);
  process.exit(1);
});
