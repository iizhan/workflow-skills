import { createHash, randomUUID } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import type {
  LocalBackupArea,
  LocalBackupRestoreImpactAreaSummary,
  LocalBackupRestoreImpactResult,
  LocalBackupAreaSummary,
  LocalBackupManifest,
  LocalBackupValidationAreaCheck,
  LocalBackupValidationIssue,
  LocalBackupValidationResult,
  LocalBackupSummary
} from "../shared/types";
import type { AuthorizationService } from "./authorization-service";
import type { WorkbenchDatabase } from "./database";

const backupSchemaVersion = "1.0.0";
const backupAreaOrder: LocalBackupArea[] = ["config", "db", "events", "bundles"];

function nowIso() {
  return new Date().toISOString();
}

function timestampSlug(timestamp: string) {
  return timestamp.replaceAll("-", "").replaceAll(":", "").replaceAll(".", "").replace("T", "-").replace("Z", "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function quoteSqlString(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function isSafeRelativePath(pathValue: string) {
  const normalized = pathValue.trim();
  if (!normalized || isAbsolute(normalized)) {
    return false;
  }

  return !normalized.split(/[\\/]+/).includes("..");
}

function resolveInsideRoot(rootPath: string, relativePath: string) {
  const absoluteRoot = resolve(rootPath);
  const candidate = resolve(rootPath, relativePath);
  return candidate === absoluteRoot || candidate.startsWith(`${absoluteRoot}${sep}`);
}

function getBackupAgeDays(createdAt: string) {
  const parsed = Date.parse(createdAt);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return Math.max(0, Math.floor((Date.now() - parsed) / 86_400_000));
}

function copyDirectoryContents(sourcePath: string, destinationPath: string) {
  const entries = readdirSync(sourcePath, { withFileTypes: true });
  for (const entry of entries) {
    cpSync(join(sourcePath, entry.name), join(destinationPath, entry.name), {
      recursive: entry.isDirectory()
    });
  }
}

function summarizeDirectory(path: string, area: LocalBackupArea): LocalBackupAreaSummary {
  const topLevelEntries = readdirSync(path, { withFileTypes: true })
    .map((entry) => entry.name)
    .sort();
  let totalFiles = 0;
  let totalBytes = 0;
  const queue = [path];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const entries = readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(absolutePath);
        continue;
      }
      if (entry.isFile()) {
        totalFiles += 1;
        totalBytes += statSync(absolutePath).size;
      }
    }
  }

  return {
    area,
    relativePath: area,
    totalFiles,
    totalBytes,
    topLevelEntries
  };
}

interface FileSnapshotEntry {
  relativePath: string;
  size: number;
  hash: string;
}

interface FileSnapshotOptions {
  ignoredRelativePaths?: Set<string>;
}

function normalizeRelativeFilePath(pathValue: string) {
  return pathValue.replaceAll("\\", "/");
}

function hashFile(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function collectFileSnapshotMap(rootPath: string, options: FileSnapshotOptions = {}) {
  const snapshots = new Map<string, FileSnapshotEntry>();
  if (!existsSync(rootPath)) {
    return snapshots;
  }

  const queue = [rootPath];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const entries = readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(absolutePath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }

      const relativePath = normalizeRelativeFilePath(relative(rootPath, absolutePath));
      if (options.ignoredRelativePaths?.has(relativePath)) {
        continue;
      }
      snapshots.set(relativePath, {
        relativePath,
        size: statSync(absolutePath).size,
        hash: hashFile(absolutePath)
      });
    }
  }

  return snapshots;
}

function limitSamples(paths: string[], limit = 5) {
  return paths.slice(0, limit);
}

function compareFileSnapshots(
  area: LocalBackupArea,
  backupRelativePath: string,
  targetPath: string,
  backupSnapshot: Map<string, FileSnapshotEntry>,
  currentSnapshot: Map<string, FileSnapshotEntry>
): LocalBackupRestoreImpactAreaSummary {
  const changed: string[] = [];
  const unchanged: string[] = [];
  const added: string[] = [];
  const removed: string[] = [];

  const allPaths = new Set([...backupSnapshot.keys(), ...currentSnapshot.keys()]);
  const sortedPaths = [...allPaths].sort((left, right) => left.localeCompare(right));

  for (const filePath of sortedPaths) {
    const backupEntry = backupSnapshot.get(filePath) ?? null;
    const currentEntry = currentSnapshot.get(filePath) ?? null;

    if (backupEntry && currentEntry) {
      if (backupEntry.size === currentEntry.size && backupEntry.hash === currentEntry.hash) {
        unchanged.push(filePath);
      } else {
        changed.push(filePath);
      }
      continue;
    }

    if (backupEntry) {
      added.push(filePath);
      continue;
    }

    removed.push(filePath);
  }

  return {
    area,
    backupRelativePath,
    targetPath,
    backupFileCount: backupSnapshot.size,
    currentFileCount: currentSnapshot.size,
    changedFileCount: changed.length,
    unchangedFileCount: unchanged.length,
    addedFileCount: added.length,
    removedFileCount: removed.length,
    sampleChangedPaths: limitSamples(changed),
    sampleAddedPaths: limitSamples(added),
    sampleRemovedPaths: limitSamples(removed)
  };
}

function parseManifest(raw: unknown): LocalBackupManifest | null {
  if (!isRecord(raw)) {
    return null;
  }

  const backupId = asString(raw.backupId);
  const schemaVersion = asString(raw.schemaVersion);
  const createdAt = asString(raw.createdAt);
  const backupPath = asString(raw.backupPath);
  const manifestPath = asString(raw.manifestPath);
  const storageRoot = asString(raw.storageRoot);
  const policyId = raw.policyId == null ? null : asString(raw.policyId);
  const totalFiles = asNumber(raw.totalFiles);
  const totalBytes = asNumber(raw.totalBytes);
  const areaCount = asNumber(raw.areaCount);
  const excludedRelativePaths = Array.isArray(raw.excludedRelativePaths)
    ? raw.excludedRelativePaths.filter((value): value is string => typeof value === "string")
    : [];
  const source = isRecord(raw.source) ? raw.source : {};
  const areas = Array.isArray(raw.areas)
    ? raw.areas
        .map((entry) => {
          if (!isRecord(entry)) {
            return null;
          }

          const area = asString(entry.area);
          const relativePath = asString(entry.relativePath);
          const entryTotalFiles = asNumber(entry.totalFiles);
          const entryTotalBytes = asNumber(entry.totalBytes);
          const topLevelEntries = Array.isArray(entry.topLevelEntries)
            ? entry.topLevelEntries.filter((value): value is string => typeof value === "string")
            : [];

          if (
            (area !== "config" && area !== "db" && area !== "events" && area !== "bundles") ||
            !relativePath ||
            entryTotalFiles == null ||
            entryTotalBytes == null
          ) {
            return null;
          }

          return {
            area,
            relativePath,
            totalFiles: entryTotalFiles,
            totalBytes: entryTotalBytes,
            topLevelEntries
          } satisfies LocalBackupAreaSummary;
        })
        .filter((entry): entry is LocalBackupAreaSummary => entry !== null)
    : [];

  const configDir = asString(source.configDir);
  const dbDir = asString(source.dbDir);
  const databasePath = asString(source.databasePath);
  const eventsDir = asString(source.eventsDir);
  const bundlesDir = asString(source.bundlesDir);

  if (
    !backupId ||
    !schemaVersion ||
    !createdAt ||
    !backupPath ||
    !manifestPath ||
    !storageRoot ||
    totalFiles == null ||
    totalBytes == null ||
    areaCount == null ||
    !configDir ||
    !dbDir ||
    !databasePath ||
    !eventsDir ||
    !bundlesDir
  ) {
    return null;
  }

  return {
    backupId,
    schemaVersion,
    createdAt,
    backupPath,
    manifestPath,
    storageRoot,
    policyId,
    totalFiles,
    totalBytes,
    areaCount,
    excludedRelativePaths,
    areas,
    source: {
      configDir,
      dbDir,
      databasePath,
      eventsDir,
      bundlesDir
    }
  };
}

export class BackupService {
  constructor(
    private readonly database: WorkbenchDatabase,
    private readonly authorizationService: AuthorizationService
  ) {}

  private getCurrentAreaPath(area: LocalBackupArea) {
    switch (area) {
      case "config":
        return this.database.paths.configDir;
      case "db":
        return this.database.paths.dbDir;
      case "events":
        return this.database.paths.eventsDir;
      case "bundles":
        return this.database.paths.bundlesDir;
      default:
        return this.database.paths.root;
    }
  }

  private getIgnoredRelativePathsForArea(area: LocalBackupArea) {
    if (area !== "db") {
      return undefined;
    }

    const databaseFileName = basename(this.database.paths.databasePath);
    return new Set([`${databaseFileName}-wal`, `${databaseFileName}-shm`]);
  }

  createBackup(): LocalBackupSummary {
    const createdAt = nowIso();
    const backupId = randomUUID();
    const backupRoot = join(
      this.database.paths.backupsDir,
      `backup-${timestampSlug(createdAt)}-${backupId.slice(0, 8)}`
    );
    const manifestPath = join(backupRoot, "backup.manifest.json");

    mkdirSync(backupRoot, { recursive: true });

    for (const area of backupAreaOrder) {
      mkdirSync(join(backupRoot, area), { recursive: true });
    }

    copyDirectoryContents(this.database.paths.configDir, join(backupRoot, "config"));
    copyDirectoryContents(this.database.paths.eventsDir, join(backupRoot, "events"));
    copyDirectoryContents(this.database.paths.bundlesDir, join(backupRoot, "bundles"));

    const databaseSnapshotPath = join(backupRoot, "db", basename(this.database.paths.databasePath));
    this.database.db.pragma("wal_checkpoint(FULL)");
    this.database.db.exec(`VACUUM INTO ${quoteSqlString(databaseSnapshotPath)}`);

    const dbDirEntries = readdirSync(this.database.paths.dbDir, { withFileTypes: true });
    const databaseFileName = basename(this.database.paths.databasePath);
    const transientDbFiles = new Set([
      databaseFileName,
      `${databaseFileName}-wal`,
      `${databaseFileName}-shm`
    ]);

    for (const entry of dbDirEntries) {
      if (transientDbFiles.has(entry.name)) {
        continue;
      }
      const sourcePath = join(this.database.paths.dbDir, entry.name);
      const destinationPath = join(backupRoot, "db", entry.name);
      cpSync(sourcePath, destinationPath, { recursive: entry.isDirectory() });
    }

    const areas = backupAreaOrder.map((area) => summarizeDirectory(join(backupRoot, area), area));
    const totalFiles = areas.reduce((sum, area) => sum + area.totalFiles, 0);
    const totalBytes = areas.reduce((sum, area) => sum + area.totalBytes, 0);
    const policyId = this.authorizationService.getActivePolicy()?.id ?? null;

    const manifest: LocalBackupManifest = {
      backupId,
      schemaVersion: backupSchemaVersion,
      createdAt,
      backupPath: backupRoot,
      manifestPath,
      storageRoot: this.database.paths.root,
      policyId,
      totalFiles,
      totalBytes,
      areaCount: areas.length,
      excludedRelativePaths: ["backups"],
      areas,
      source: {
        configDir: resolve(this.database.paths.configDir),
        dbDir: resolve(this.database.paths.dbDir),
        databasePath: resolve(this.database.paths.databasePath),
        eventsDir: resolve(this.database.paths.eventsDir),
        bundlesDir: resolve(this.database.paths.bundlesDir)
      }
    };

    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    this.database.db
      .prepare(
        `INSERT INTO authorization_events (
           id, policy_id, event_type, event_summary, actor_type, created_at, metadata_json
         ) VALUES (?, ?, 'backup.created', ?, 'user', ?, ?)`
      )
      .run(
        randomUUID(),
        policyId,
        `Created a local recovery backup with ${totalFiles} file snapshot(s).`,
        createdAt,
        JSON.stringify({
          backupId,
          backupPath: backupRoot,
          manifestPath,
          totalFiles,
          totalBytes,
          areaCount: areas.length,
          areas: areas.map((area) => area.area)
        })
      );

    return manifest;
  }

  listBackups(limit = 8): LocalBackupSummary[] {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const entries = readdirSync(this.database.paths.backupsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        const manifestPath = join(this.database.paths.backupsDir, entry.name, "backup.manifest.json");
        if (!existsSync(manifestPath)) {
          return null;
        }

        try {
          const parsed = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;
          return parseManifest(parsed);
        } catch {
          return null;
        }
      })
      .filter((entry): entry is LocalBackupManifest => entry !== null)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    return entries.slice(0, safeLimit);
  }

  validateBackupManifest(manifestPath: string): LocalBackupValidationResult {
    const normalizedManifestPath = resolve(manifestPath.trim());
    const backupRoot = dirname(normalizedManifestPath);
    let manifest: LocalBackupManifest | null = null;
    const issues: LocalBackupValidationIssue[] = [];
    const areaChecks: LocalBackupValidationAreaCheck[] = [];
    let actualTotalFiles = 0;
    let actualTotalBytes = 0;
    let storageRootMatchesCurrent: boolean | null = null;
    let policyMatchesCurrent: boolean | null = null;
    let backupAgeDays: number | null = null;

    if (!manifestPath.trim()) {
      issues.push({
        severity: "error",
        code: "manifest_path_missing",
        message: "Choose a local backup manifest before validating."
      });

      return {
        manifestPath: normalizedManifestPath,
        backupRoot,
        canRestore: false,
        manifest: null,
        issues,
        areaChecks,
        expectedAreaCount: 0,
        presentAreaCount: 0,
        expectedTotalFiles: null,
        actualTotalFiles: 0,
        expectedTotalBytes: null,
        actualTotalBytes: 0,
        storageRootMatchesCurrent: null,
        policyMatchesCurrent: null,
        backupAgeDays: null
      };
    }

    if (!existsSync(normalizedManifestPath)) {
      issues.push({
        severity: "error",
        code: "manifest_not_found",
        message: "The selected backup manifest file does not exist."
      });
    } else {
      try {
        const parsed = JSON.parse(readFileSync(normalizedManifestPath, "utf8")) as unknown;
        manifest = parseManifest(parsed);
        if (!manifest) {
          issues.push({
            severity: "error",
            code: "manifest_schema_invalid",
            message: "The selected file is missing required backup manifest fields or uses an unsupported shape."
          });
        }
      } catch {
        issues.push({
          severity: "error",
          code: "manifest_parse_failed",
          message: "The selected file could not be parsed as a backup manifest JSON document."
        });
      }
    }

    if (manifest) {
      if (manifest.schemaVersion !== backupSchemaVersion) {
        issues.push({
          severity: "error",
          code: "schema_version_unsupported",
          message: `This workbench preview supports backup schema ${backupSchemaVersion}, but the manifest declares ${manifest.schemaVersion}.`
        });
      }

      backupAgeDays = getBackupAgeDays(manifest.createdAt);
      const currentPolicyId = this.authorizationService.getActivePolicy()?.id ?? null;

      storageRootMatchesCurrent = manifest.storageRoot === this.database.paths.root;
      if (storageRootMatchesCurrent === false) {
        issues.push({
          severity: "warning",
          code: "storage_root_differs",
          message: "This backup was captured from a different local app storage root than the one currently in use."
        });
      }

      policyMatchesCurrent =
        currentPolicyId && manifest.policyId ? currentPolicyId === manifest.policyId : null;
      if (currentPolicyId && manifest.policyId && policyMatchesCurrent === false) {
        issues.push({
          severity: "warning",
          code: "policy_scope_differs",
          message: "This backup was captured under a different authorization policy than the active one on this machine."
        });
      }

      if (manifest.areaCount !== manifest.areas.length) {
        issues.push({
          severity: "error",
          code: "area_count_mismatch",
          message: "The backup manifest area count does not match the number of declared backup areas."
        });
      }

      const uniqueAreaCount = new Set(manifest.areas.map((area) => area.area)).size;
      if (uniqueAreaCount !== manifest.areas.length) {
        issues.push({
          severity: "error",
          code: "duplicate_area_entries",
          message: "The backup manifest declares the same backup area more than once."
        });
      }

      if (manifest.excludedRelativePaths.includes("backups") === false) {
        issues.push({
          severity: "info",
          code: "backup_area_not_excluded",
          message: "This manifest does not declare `backups` as an excluded path, so review it carefully before using it for recovery."
        });
      }

      for (const area of backupAreaOrder) {
        const areaManifest = manifest.areas.find((entry) => entry.area === area) ?? null;
        const fallbackAreaPath = join(backupRoot, area);
        let exists = false;
        let actualFiles: number | null = null;
        let actualBytes: number | null = null;
        let relativePath = areaManifest?.relativePath ?? area;

        if (!areaManifest) {
          issues.push({
            severity: "error",
            code: `area_missing_${area}`,
            message: `The backup manifest is missing the required ${area} area entry.`
          });

          if (existsSync(fallbackAreaPath)) {
            const summary = summarizeDirectory(fallbackAreaPath, area);
            exists = true;
            actualFiles = summary.totalFiles;
            actualBytes = summary.totalBytes;
            actualTotalFiles += summary.totalFiles;
            actualTotalBytes += summary.totalBytes;
          }
        } else if (
          !isSafeRelativePath(areaManifest.relativePath) ||
          !resolveInsideRoot(backupRoot, areaManifest.relativePath)
        ) {
          issues.push({
            severity: "error",
            code: `area_path_invalid_${area}`,
            message: `The ${area} area points outside the backup root or uses an unsafe relative path.`
          });
        } else {
          const areaPath = resolve(backupRoot, areaManifest.relativePath);
          relativePath = areaManifest.relativePath;

          if (!existsSync(areaPath)) {
            issues.push({
              severity: "error",
              code: `area_path_missing_${area}`,
              message: `The ${area} area directory referenced by the manifest was not found inside the backup root.`
            });
          } else {
            const summary = summarizeDirectory(areaPath, area);
            exists = true;
            actualFiles = summary.totalFiles;
            actualBytes = summary.totalBytes;
            actualTotalFiles += summary.totalFiles;
            actualTotalBytes += summary.totalBytes;

            if (summary.totalFiles !== areaManifest.totalFiles) {
              issues.push({
                severity: "error",
                code: `area_file_count_mismatch_${area}`,
                message: `The ${area} area currently contains ${summary.totalFiles} file(s), but the manifest expects ${areaManifest.totalFiles}.`
              });
            }

            if (summary.totalBytes !== areaManifest.totalBytes) {
              issues.push({
                severity: "error",
                code: `area_size_mismatch_${area}`,
                message: `The ${area} area currently contains ${summary.totalBytes} byte(s), but the manifest expects ${areaManifest.totalBytes}.`
              });
            }
          }
        }

        areaChecks.push({
          area,
          relativePath,
          exists,
          manifestFiles: areaManifest?.totalFiles ?? 0,
          actualFiles,
          manifestBytes: areaManifest?.totalBytes ?? 0,
          actualBytes
        });
      }

      if (manifest.totalFiles !== actualTotalFiles) {
        issues.push({
          severity: "error",
          code: "total_file_count_mismatch",
          message: `The backup manifest expects ${manifest.totalFiles} total file(s), but the selected backup currently contains ${actualTotalFiles}.`
        });
      }

      if (manifest.totalBytes !== actualTotalBytes) {
        issues.push({
          severity: "error",
          code: "total_size_mismatch",
          message: `The backup manifest expects ${manifest.totalBytes} total byte(s), but the selected backup currently contains ${actualTotalBytes}.`
        });
      }
    }

    return {
      manifestPath: normalizedManifestPath,
      backupRoot,
      canRestore: manifest !== null && issues.every((issue) => issue.severity !== "error"),
      manifest,
      issues,
      areaChecks,
      expectedAreaCount: manifest?.areaCount ?? 0,
      presentAreaCount: areaChecks.filter((check) => check.exists).length,
      expectedTotalFiles: manifest?.totalFiles ?? null,
      actualTotalFiles,
      expectedTotalBytes: manifest?.totalBytes ?? null,
      actualTotalBytes,
      storageRootMatchesCurrent,
      policyMatchesCurrent,
      backupAgeDays
    };
  }

  previewBackupRestoreImpact(manifestPath: string): LocalBackupRestoreImpactResult {
    const validation = this.validateBackupManifest(manifestPath);
    const previewGeneratedAt = nowIso();

    if (!validation.manifest || !validation.canRestore) {
      return {
        manifestPath: validation.manifestPath,
        previewGeneratedAt,
        comparisonMode: "replace_area",
        targetStorageRoot: this.database.paths.root,
        validation,
        readyForManualRestore: false,
        totalBackupFileCount: 0,
        totalCurrentFileCount: 0,
        totalChangedFileCount: 0,
        totalUnchangedFileCount: 0,
        totalAddedFileCount: 0,
        totalRemovedFileCount: 0,
        destructiveAreaCount: 0,
        areas: []
      };
    }

    const areas = backupAreaOrder.map((area) => {
      const areaManifest = validation.manifest?.areas.find((entry) => entry.area === area);
      const backupRelativePath = areaManifest?.relativePath ?? area;
      const backupAreaPath = resolve(validation.backupRoot, backupRelativePath);
      const currentAreaPath = resolve(this.getCurrentAreaPath(area));

      return compareFileSnapshots(
        area,
        backupRelativePath,
        currentAreaPath,
        collectFileSnapshotMap(backupAreaPath, {
          ignoredRelativePaths: this.getIgnoredRelativePathsForArea(area)
        }),
        collectFileSnapshotMap(currentAreaPath, {
          ignoredRelativePaths: this.getIgnoredRelativePathsForArea(area)
        })
      );
    });

    return {
      manifestPath: validation.manifestPath,
      previewGeneratedAt,
      comparisonMode: "replace_area",
      targetStorageRoot: this.database.paths.root,
      validation,
      readyForManualRestore: true,
      totalBackupFileCount: areas.reduce((sum, area) => sum + area.backupFileCount, 0),
      totalCurrentFileCount: areas.reduce((sum, area) => sum + area.currentFileCount, 0),
      totalChangedFileCount: areas.reduce((sum, area) => sum + area.changedFileCount, 0),
      totalUnchangedFileCount: areas.reduce((sum, area) => sum + area.unchangedFileCount, 0),
      totalAddedFileCount: areas.reduce((sum, area) => sum + area.addedFileCount, 0),
      totalRemovedFileCount: areas.reduce((sum, area) => sum + area.removedFileCount, 0),
      destructiveAreaCount: areas.filter(
        (area) => area.changedFileCount > 0 || area.removedFileCount > 0
      ).length,
      areas
    };
  }
}
