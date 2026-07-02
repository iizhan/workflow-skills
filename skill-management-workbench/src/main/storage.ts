import { mkdirSync } from "node:fs";
import { join } from "node:path";

export interface AppStoragePaths {
  root: string;
  configDir: string;
  dbDir: string;
  eventsDir: string;
  bundlesDir: string;
  backupsDir: string;
  databasePath: string;
}

function ensureDir(path: string) {
  mkdirSync(path, { recursive: true });
}

export function ensureStorage(root: string): AppStoragePaths {
  const configDir = join(root, "config");
  const dbDir = join(root, "db");
  const eventsDir = join(root, "events");
  const bundlesDir = join(root, "bundles");
  const backupsDir = join(root, "backups");
  const databasePath = join(dbDir, "skill-management-workbench.sqlite");

  for (const path of [root, configDir, dbDir, eventsDir, bundlesDir, backupsDir]) {
    ensureDir(path);
  }

  return {
    root,
    configDir,
    dbDir,
    eventsDir,
    bundlesDir,
    backupsDir,
    databasePath
  };
}
