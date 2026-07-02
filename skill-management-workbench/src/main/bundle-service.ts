import { randomUUID } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import type {
  SkillBundleDiffSummary,
  SkillBundleExportInput,
  SkillBundleExportResult,
  SkillBundleImportStrategy,
  SkillBundleImportInput,
  SkillBundleImportResult,
  SkillBundleIngestStrategy,
  SkillBundleLifecycleState,
  SkillBundleManifest,
  SkillBundleManifestItem,
  SkillBundleMatchingSkill,
  SkillBundleSummary,
  SkillBundleValidationIssue,
  SkillBundleValidationResult
} from "../shared/types";
import type { AuthorizationService } from "./authorization-service";
import type { WorkbenchDatabase } from "./database";

interface SkillExportRow {
  skill_id: string;
  display_name: string;
  canonical_name: string;
  source_type: string;
  source_path: string;
  version_id: string | null;
  version_fingerprint: string | null;
  description: string | null;
}

interface BundleRow {
  id: string;
  source_bundle_id: string | null;
  lineage_key: string | null;
  bundle_name: string;
  bundle_type: string;
  version_label: string;
  lifecycle_state: string | null;
  ingest_strategy: string | null;
  created_at: string;
  created_from_policy_id: string;
  export_path: string;
  manifest_path: string;
  supersedes_bundle_id: string | null;
  superseded_by_bundle_id: string | null;
  primary_skill_id: string | null;
  primary_skill_name: string | null;
  item_count: number;
}

interface BundleManifestRow extends BundleRow {
  manifest_json: string;
}

interface SkillMatchRow {
  skill_id: string;
  display_name: string;
  source_path: string;
  version_fingerprint: string | null;
}

interface StoredBundleRecord {
  summary: SkillBundleSummary;
  manifest: SkillBundleManifest;
  primarySkillItem: SkillBundleManifestItem | null;
  primaryCanonicalName: string | null;
  primaryFingerprint: string | null;
}

function nowIso() {
  return new Date().toISOString();
}

function timestampSlug(timestamp: string) {
  return timestamp.replaceAll("-", "").replaceAll(":", "").replaceAll(".", "").replace("T", "-").replace("Z", "");
}

function sanitizeSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function normalizeLifecycleState(value: string | null): SkillBundleLifecycleState {
  switch (value) {
    case "retained":
    case "superseded":
    case "current":
      return value;
    default:
      return "current";
  }
}

function normalizeIngestStrategy(value: string | null): SkillBundleIngestStrategy {
  switch (value) {
    case "preserve_existing":
    case "supersede_current":
    case "export_snapshot":
      return value;
    default:
      return "export_snapshot";
  }
}

function toBundleSummary(row: BundleRow): SkillBundleSummary {
  return {
    id: row.id,
    sourceBundleId: row.source_bundle_id?.trim() || row.id,
    lineageKey: row.lineage_key?.trim() || `source:${row.source_bundle_id?.trim() || row.id}`,
    bundleName: row.bundle_name,
    bundleType: row.bundle_type === "skill_package" ? "skill_package" : "skill_package",
    versionLabel: row.version_label,
    lifecycleState: normalizeLifecycleState(row.lifecycle_state),
    ingestStrategy: normalizeIngestStrategy(row.ingest_strategy),
    createdAt: row.created_at,
    createdFromPolicyId: row.created_from_policy_id,
    exportPath: row.export_path,
    manifestPath: row.manifest_path,
    itemCount: Number(row.item_count ?? 0),
    primarySkillId: row.primary_skill_id,
    primarySkillName: row.primary_skill_name,
    supersedesBundleId: row.supersedes_bundle_id,
    supersededByBundleId: row.superseded_by_bundle_id
  };
}

interface DependencySummary {
  totalFiles: number;
  topLevelEntries: string[];
  directories: string[];
  hasScripts: boolean;
  hasReferences: boolean;
  hasAssets: boolean;
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

const skippedEntryNames = new Set([
  ".git",
  "node_modules",
  "dist",
  "out",
  ".next",
  ".turbo"
]);

function shouldIncludePath(rootPath: string, candidatePath: string) {
  if (candidatePath === rootPath) {
    return true;
  }

  return !skippedEntryNames.has(basename(candidatePath));
}

function parseManifest(raw: unknown): SkillBundleManifest | null {
  if (!isRecord(raw)) {
    return null;
  }

  const exportedFrom = isRecord(raw.exportedFrom) ? raw.exportedFrom : {};
  const dependencySummary = isRecord(raw.dependencySummary) ? raw.dependencySummary : {};
  const items = Array.isArray(raw.items)
    ? raw.items
        .map((item) => {
          if (!isRecord(item)) {
            return null;
          }

          const itemType = asString(item.itemType);
          const refId = asString(item.refId);
          const displayName = asString(item.displayName);
          const relativeSourcePath = asString(item.relativeSourcePath);
          const relativeExportPath = asString(item.relativeExportPath);
          const sourceType = asString(item.sourceType);
          const versionFingerprint = asString(item.versionFingerprint);

          if (
            !itemType ||
            !refId ||
            !displayName ||
            !relativeSourcePath ||
            !relativeExportPath ||
            !sourceType
          ) {
            return null;
          }

          return {
            itemType,
            refId,
            displayName,
            relativeSourcePath,
            relativeExportPath,
            versionFingerprint,
            sourceType,
            metadata: isRecord(item.metadata) ? item.metadata : {}
          } satisfies SkillBundleManifestItem;
        })
        .filter((item): item is SkillBundleManifestItem => item !== null)
    : [];

  const schemaVersion = asString(raw.schemaVersion);
  const bundleId = asString(raw.bundleId);
  const bundleName = asString(raw.bundleName);
  const bundleType = asString(raw.bundleType);
  const versionLabel = asString(raw.versionLabel);
  const createdAt = asString(raw.createdAt);
  const exportRoot = asString(raw.exportRoot);
  const entrypoint = asString(raw.entrypoint);

  if (
    !schemaVersion ||
    !bundleId ||
    !bundleName ||
    !bundleType ||
    !versionLabel ||
    !createdAt ||
    !exportRoot ||
    !entrypoint ||
    bundleType !== "skill_package"
  ) {
    return null;
  }

  return {
    schemaVersion,
    bundleId,
    bundleName,
    bundleType: "skill_package",
    versionLabel,
    createdAt,
    exportRoot,
    entrypoint,
    exportedFrom: {
      policyId: asString(exportedFrom.policyId) ?? "",
      storageRoot: asString(exportedFrom.storageRoot) ?? ""
    },
    dependencySummary: {
      totalFiles:
        typeof dependencySummary.totalFiles === "number"
          ? dependencySummary.totalFiles
          : Number(dependencySummary.totalFiles ?? 0),
      topLevelEntries: asStringArray(dependencySummary.topLevelEntries),
      directories: asStringArray(dependencySummary.directories),
      hasScripts: dependencySummary.hasScripts === true,
      hasReferences: dependencySummary.hasReferences === true,
      hasAssets: dependencySummary.hasAssets === true
    },
    items
  };
}

function summarizeDirectory(sourcePath: string): DependencySummary {
  const topLevelEntries = readdirSync(sourcePath, { withFileTypes: true })
    .filter((entry) => !skippedEntryNames.has(entry.name))
    .map((entry) => entry.name)
    .sort();
  const directories: string[] = [];
  let totalFiles = 0;
  let hasScripts = false;
  let hasReferences = false;
  let hasAssets = false;

  const queue = [{ absolutePath: sourcePath, relativePath: "" }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const entries = readdirSync(current.absolutePath, { withFileTypes: true });
    for (const entry of entries) {
      if (skippedEntryNames.has(entry.name)) {
        continue;
      }

      const relativePath = current.relativePath ? `${current.relativePath}/${entry.name}` : entry.name;
      const absolutePath = join(current.absolutePath, entry.name);

      if (entry.isDirectory()) {
        directories.push(relativePath);
        if (entry.name === "scripts") {
          hasScripts = true;
        }
        if (entry.name === "references") {
          hasReferences = true;
        }
        if (entry.name === "assets") {
          hasAssets = true;
        }
        queue.push({ absolutePath, relativePath });
        continue;
      }

      if (entry.isFile()) {
        totalFiles += 1;
      }
    }
  }

  directories.sort();

  return {
    totalFiles,
    topLevelEntries,
    directories,
    hasScripts,
    hasReferences,
    hasAssets
  };
}

function getPrimarySkillItem(manifest: SkillBundleManifest): SkillBundleManifestItem | null {
  return manifest.items.find((item) => item.itemType === "skill") ?? null;
}

function getItemCanonicalName(item: SkillBundleManifestItem | null) {
  if (!item) {
    return null;
  }

  return typeof item.metadata.canonicalName === "string" ? item.metadata.canonicalName : null;
}

function getFingerprintDelta(left: string | null, right: string | null) {
  if (!left || !right) {
    return "unknown" as const;
  }

  return left === right ? ("same" as const) : ("changed" as const);
}

function deriveLineageKeyFromSkill(canonicalName: string | null, displayName: string) {
  if (canonicalName && canonicalName.trim()) {
    return `canonical:${canonicalName.trim().toLowerCase()}`;
  }

  const fallback = sanitizeSegment(displayName) || "bundle";
  return `display:${fallback}`;
}

function deriveLineageKeyFromManifest(manifest: SkillBundleManifest) {
  const primarySkillItem = getPrimarySkillItem(manifest);
  const canonicalName = getItemCanonicalName(primarySkillItem);
  const displayName = primarySkillItem?.displayName || manifest.bundleName;
  return deriveLineageKeyFromSkill(canonicalName, displayName);
}

const diffCopy = {
  validationBlockedTitle: "Validation blocked",
  comparisonUnavailableTitle: "Comparison unavailable",
  blockingValidationSummary:
    "The bundle cannot be added locally until the blocking validation issues are resolved.",
  noBaselineSummary: "A comparable local bundle or indexed skill is not available yet.",
  noBaselineReason: "No comparable local snapshot was available for diffing yet.",
  safeUpdateTitle: "Safe update preview",
  safeUpdateSummary:
    "The incoming bundle differs from the closest local snapshot, but the differences look like a normal local upgrade.",
  firstImportTitle: "First local add",
  firstImportSummary:
    "No comparable local bundle was found, so this bundle will be added as a new local package.",
  blockedImportSummary:
    "The bundle cannot be added locally until validation issues are resolved.",
  resolveBlockingReason: "Resolve the blocking validation issues before adding this bundle locally.",
  noBaselineImportReason: "No local baseline exists yet for this package comparison.",
  importConflictTitle: "Bundle conflict",
  importConflictSummary:
    "The bundle has a comparable local baseline, but blocking validation issues prevent a safe local add.",
  importConflictReason: "Blocking validation issues were found during manifest or file checks.",
  conflictingStatesTitle: "Conflicting local states",
  conflictingStatesSummary:
    "The incoming bundle differs from both the indexed local skill and the closest stored bundle, so adding it now may fork your local baseline.",
  localSkillDiffReason: "The indexed local skill fingerprint differs from the incoming bundle.",
  storedBundleDiffReason:
    "The closest stored bundle fingerprint also differs from the incoming bundle.",
  driftTitle: "Local drift detected",
  driftSummary:
    "The incoming bundle no longer matches the indexed local skill, so review the drift before treating this as a clean upgrade.",
  driftReason: "The indexed local skill fingerprint differs from the incoming bundle fingerprint.",
  noChangeTitle: "No change detected",
  noChangeSummary:
    "This bundle matches the closest stored local bundle snapshot, so adding it again would not introduce a meaningful upgrade.",
  noChangeReason:
    "Bundle fingerprint, version label, and packaged file structure match the stored snapshot.",
  storedBundleChangedReason:
    "The incoming bundle fingerprint differs from the closest stored local bundle.",
  versionChangedReason:
    "The version label also changed, which is consistent with an intentional bundle update.",
  reviewRecommendedTitle: "Review recommended",
  reviewRecommendedSummary:
    "Local add is allowed, but the workbench detected non-blocking drift signals that should be reviewed first.",
  reviewRecommendedReason: "One or more warning-level validation signals were raised.",
  noBlockingConcernReason:
    "No blocking safety concerns were detected in the available local comparison data."
};

function createEmptyDiffSummary(issues: SkillBundleValidationIssue[] = []): SkillBundleDiffSummary {
  const blocking = issues.filter((issue) => issue.severity === "error");

  return {
    classification: "conflict",
    title:
      blocking.length > 0 ? diffCopy.validationBlockedTitle : diffCopy.comparisonUnavailableTitle,
    summary:
      blocking.length > 0
        ? diffCopy.blockingValidationSummary
        : diffCopy.noBaselineSummary,
    reasons:
      blocking.length > 0
        ? blocking.slice(0, 3).map((issue) => issue.message)
        : [diffCopy.noBaselineReason],
    comparedBundle: null,
    versionDelta: "unknown",
    comparedBundleFingerprintDelta: "unknown",
    localSkillFingerprintDelta: "unknown",
    incomingFingerprint: null,
    storedBundleFingerprint: null,
    localSkillFingerprint: null,
    itemDelta: {
      added: [],
      removed: [],
      changed: [],
      unchangedCount: 0
    },
    dependencyDelta: {
      totalFilesDelta: 0,
      addedTopLevelEntries: [],
      removedTopLevelEntries: [],
      addedDirectories: [],
      removedDirectories: []
    }
  };
}

function compareStringLists(incoming: string[], stored: string[]) {
  const incomingSet = new Set(incoming);
  const storedSet = new Set(stored);

  return {
    added: incoming.filter((value) => !storedSet.has(value)).sort(),
    removed: stored.filter((value) => !incomingSet.has(value)).sort()
  };
}

function getManifestItemKey(item: SkillBundleManifestItem) {
  return `${item.itemType}:${item.relativeExportPath}`;
}

function getManifestItemLabel(item: SkillBundleManifestItem) {
  return item.relativeExportPath || item.displayName;
}

function hasMatchingManifestItemShape(left: SkillBundleManifestItem, right: SkillBundleManifestItem) {
  return (
    left.displayName === right.displayName &&
    left.relativeSourcePath === right.relativeSourcePath &&
    left.relativeExportPath === right.relativeExportPath &&
    left.sourceType === right.sourceType &&
    left.versionFingerprint === right.versionFingerprint
  );
}

function parseStoredBundleManifest(rawManifest: string) {
  try {
    const parsed = JSON.parse(rawManifest) as unknown;
    return parseManifest(parsed);
  } catch {
    return null;
  }
}

function toStoredBundleRecord(row: BundleManifestRow): StoredBundleRecord | null {
  const manifest = parseStoredBundleManifest(row.manifest_json);
  if (!manifest) {
    return null;
  }

  const primarySkillItem = getPrimarySkillItem(manifest);

  return {
    summary: toBundleSummary(row),
    manifest,
    primarySkillItem,
    primaryCanonicalName: getItemCanonicalName(primarySkillItem),
    primaryFingerprint: primarySkillItem?.versionFingerprint ?? null
  };
}

function getComparableBundleScore(manifest: SkillBundleManifest, candidate: StoredBundleRecord) {
  const incomingPrimary = getPrimarySkillItem(manifest);
  const incomingCanonical = getItemCanonicalName(incomingPrimary);
  const incomingDisplayName = incomingPrimary?.displayName ?? null;
  const incomingFingerprint = incomingPrimary?.versionFingerprint ?? null;
  const incomingLineageKey = deriveLineageKeyFromManifest(manifest);
  let score = 0;

  if (candidate.summary.id === manifest.bundleId) {
    score += 100;
  }
  if (candidate.summary.lineageKey === incomingLineageKey) {
    score += 80;
  }
  if (incomingCanonical && candidate.primaryCanonicalName === incomingCanonical) {
    score += 60;
  }
  if (incomingDisplayName && candidate.primarySkillItem?.displayName === incomingDisplayName) {
    score += 30;
  }
  if (candidate.summary.bundleName === manifest.bundleName) {
    score += 20;
  }
  if (incomingFingerprint && candidate.primaryFingerprint === incomingFingerprint) {
    score += 25;
  }
  if (candidate.summary.versionLabel === manifest.versionLabel) {
    score += 10;
  }
  if (candidate.manifest.entrypoint === manifest.entrypoint) {
    score += 5;
  }
  if (candidate.summary.lifecycleState === "current") {
    score += 12;
  }

  return score;
}

export class BundleService {
  constructor(
    private readonly database: WorkbenchDatabase,
    private readonly authorizationService: AuthorizationService
  ) {}

  private getBundleRecordById(bundleId: string): StoredBundleRecord | null {
    const row = this.database.db
      .prepare(
        `SELECT
           workflow_bundles.id,
           workflow_bundles.source_bundle_id,
           workflow_bundles.lineage_key,
           workflow_bundles.bundle_name,
           workflow_bundles.bundle_type,
           workflow_bundles.version_label,
           workflow_bundles.lifecycle_state,
           workflow_bundles.ingest_strategy,
           workflow_bundles.created_at,
           workflow_bundles.created_from_policy_id,
           workflow_bundles.export_path,
           workflow_bundles.manifest_path,
           workflow_bundles.supersedes_bundle_id,
           workflow_bundles.superseded_by_bundle_id,
           workflow_bundles.manifest_json,
           COUNT(bundle_items.id) AS item_count,
           MAX(CASE WHEN bundle_items.position_index = 0 THEN bundle_items.ref_id END) AS primary_skill_id,
           MAX(CASE WHEN bundle_items.position_index = 0 THEN skills.display_name END) AS primary_skill_name
         FROM workflow_bundles
         LEFT JOIN bundle_items
           ON bundle_items.workflow_bundle_id = workflow_bundles.id
         LEFT JOIN skills
           ON skills.id = bundle_items.ref_id
          AND bundle_items.item_type = 'skill'
         WHERE workflow_bundles.id = ?
         GROUP BY workflow_bundles.id
         LIMIT 1`
      )
      .get(bundleId) as BundleManifestRow | undefined;

    return row ? toStoredBundleRecord(row) : null;
  }

  private getBundleById(bundleId: string): SkillBundleSummary | null {
    return this.getBundleRecordById(bundleId)?.summary ?? null;
  }

  private findBundleRecordBySourceBundleId(sourceBundleId: string): StoredBundleRecord | null {
    const row = this.database.db
      .prepare(
        `SELECT
           workflow_bundles.id,
           workflow_bundles.source_bundle_id,
           workflow_bundles.lineage_key,
           workflow_bundles.bundle_name,
           workflow_bundles.bundle_type,
           workflow_bundles.version_label,
           workflow_bundles.lifecycle_state,
           workflow_bundles.ingest_strategy,
           workflow_bundles.created_at,
           workflow_bundles.created_from_policy_id,
           workflow_bundles.export_path,
           workflow_bundles.manifest_path,
           workflow_bundles.supersedes_bundle_id,
           workflow_bundles.superseded_by_bundle_id,
           workflow_bundles.manifest_json,
           COUNT(bundle_items.id) AS item_count,
           MAX(CASE WHEN bundle_items.position_index = 0 THEN bundle_items.ref_id END) AS primary_skill_id,
           MAX(CASE WHEN bundle_items.position_index = 0 THEN skills.display_name END) AS primary_skill_name
         FROM workflow_bundles
         LEFT JOIN bundle_items
           ON bundle_items.workflow_bundle_id = workflow_bundles.id
         LEFT JOIN skills
           ON skills.id = bundle_items.ref_id
          AND bundle_items.item_type = 'skill'
         WHERE workflow_bundles.source_bundle_id = ?
            OR workflow_bundles.id = ?
         GROUP BY workflow_bundles.id
         ORDER BY workflow_bundles.created_at DESC
         LIMIT 1`
      )
      .get(sourceBundleId, sourceBundleId) as BundleManifestRow | undefined;

    return row ? toStoredBundleRecord(row) : null;
  }

  private findCurrentLineageBundle(lineageKey: string): StoredBundleRecord | null {
    const row = this.database.db
      .prepare(
        `SELECT
           workflow_bundles.id,
           workflow_bundles.source_bundle_id,
           workflow_bundles.lineage_key,
           workflow_bundles.bundle_name,
           workflow_bundles.bundle_type,
           workflow_bundles.version_label,
           workflow_bundles.lifecycle_state,
           workflow_bundles.ingest_strategy,
           workflow_bundles.created_at,
           workflow_bundles.created_from_policy_id,
           workflow_bundles.export_path,
           workflow_bundles.manifest_path,
           workflow_bundles.supersedes_bundle_id,
           workflow_bundles.superseded_by_bundle_id,
           workflow_bundles.manifest_json,
           COUNT(bundle_items.id) AS item_count,
           MAX(CASE WHEN bundle_items.position_index = 0 THEN bundle_items.ref_id END) AS primary_skill_id,
           MAX(CASE WHEN bundle_items.position_index = 0 THEN skills.display_name END) AS primary_skill_name
         FROM workflow_bundles
         LEFT JOIN bundle_items
           ON bundle_items.workflow_bundle_id = workflow_bundles.id
         LEFT JOIN skills
           ON skills.id = bundle_items.ref_id
          AND bundle_items.item_type = 'skill'
         WHERE workflow_bundles.lineage_key = ?
           AND COALESCE(workflow_bundles.lifecycle_state, 'current') = 'current'
         GROUP BY workflow_bundles.id
         ORDER BY workflow_bundles.created_at DESC
         LIMIT 1`
      )
      .get(lineageKey) as BundleManifestRow | undefined;

    return row ? toStoredBundleRecord(row) : null;
  }

  private getAvailableStrategies(comparableBundle: StoredBundleRecord | null): SkillBundleImportStrategy[] {
    if (comparableBundle?.summary.lifecycleState === "current") {
      return ["preserve_existing", "supersede_current"];
    }

    return ["preserve_existing"];
  }

  private findComparableBundle(manifest: SkillBundleManifest): StoredBundleRecord | null {
    const lineageKey = deriveLineageKeyFromManifest(manifest);
    const currentLineageBundle = this.findCurrentLineageBundle(lineageKey);
    if (currentLineageBundle) {
      return currentLineageBundle;
    }

    const rows = this.database.db
      .prepare(
        `SELECT
           workflow_bundles.id,
           workflow_bundles.source_bundle_id,
           workflow_bundles.lineage_key,
           workflow_bundles.bundle_name,
           workflow_bundles.bundle_type,
           workflow_bundles.version_label,
           workflow_bundles.lifecycle_state,
           workflow_bundles.ingest_strategy,
           workflow_bundles.created_at,
           workflow_bundles.created_from_policy_id,
           workflow_bundles.export_path,
           workflow_bundles.manifest_path,
           workflow_bundles.supersedes_bundle_id,
           workflow_bundles.superseded_by_bundle_id,
           workflow_bundles.manifest_json,
           COUNT(bundle_items.id) AS item_count,
           MAX(CASE WHEN bundle_items.position_index = 0 THEN bundle_items.ref_id END) AS primary_skill_id,
           MAX(CASE WHEN bundle_items.position_index = 0 THEN skills.display_name END) AS primary_skill_name
         FROM workflow_bundles
         LEFT JOIN bundle_items
           ON bundle_items.workflow_bundle_id = workflow_bundles.id
         LEFT JOIN skills
           ON skills.id = bundle_items.ref_id
          AND bundle_items.item_type = 'skill'
         GROUP BY workflow_bundles.id
         ORDER BY workflow_bundles.created_at DESC`
      )
      .all() as BundleManifestRow[];

    const comparable = rows
      .map((row) => toStoredBundleRecord(row))
      .filter((entry): entry is StoredBundleRecord => entry !== null)
      .map((entry) => ({ entry, score: getComparableBundleScore(manifest, entry) }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score);

    return comparable[0]?.entry ?? null;
  }

  private findMatchingSkill(manifest: SkillBundleManifest): SkillBundleMatchingSkill | null {
    const primarySkillItem = getPrimarySkillItem(manifest);
    if (!primarySkillItem) {
      return null;
    }

    const canonicalName = getItemCanonicalName(primarySkillItem);
    const versionFingerprint = primarySkillItem.versionFingerprint;
    const displayName = primarySkillItem.displayName;

    const row = this.database.db
      .prepare(
        `SELECT
           skills.id AS skill_id,
           skills.display_name,
           skills.source_path,
           current_versions.version_fingerprint
         FROM skills
         LEFT JOIN skill_versions AS current_versions
           ON current_versions.skill_id = skills.id
          AND current_versions.is_current = 1
         WHERE skills.is_active = 1
           AND (
             (? IS NOT NULL AND skills.canonical_name = ?)
             OR skills.display_name = ?
             OR (? IS NOT NULL AND current_versions.version_fingerprint = ?)
           )
         ORDER BY
           CASE
             WHEN (? IS NOT NULL AND skills.canonical_name = ?) THEN 0
             WHEN (? IS NOT NULL AND current_versions.version_fingerprint = ?) THEN 1
             WHEN skills.display_name = ? THEN 2
             ELSE 3
           END,
           skills.last_seen_at DESC
         LIMIT 1`
      )
      .get(
        canonicalName,
        canonicalName,
        displayName,
        versionFingerprint,
        versionFingerprint,
        canonicalName,
        canonicalName,
        versionFingerprint,
        versionFingerprint,
        displayName
      ) as SkillMatchRow | undefined;

    if (!row) {
      return null;
    }

    return {
      skillId: row.skill_id,
      skillName: row.display_name,
      sourcePath: row.source_path,
      currentVersionFingerprint: row.version_fingerprint ?? null,
      sameVersionFingerprint:
        row.version_fingerprint != null &&
        versionFingerprint != null &&
        row.version_fingerprint === versionFingerprint
    };
  }

  private buildDiffSummary(
    manifest: SkillBundleManifest | null,
    matchingSkill: SkillBundleMatchingSkill | null,
    comparableBundle: StoredBundleRecord | null,
    issues: SkillBundleValidationIssue[]
  ): SkillBundleDiffSummary {
    if (!manifest) {
      return createEmptyDiffSummary(issues);
    }

    const incomingPrimary = getPrimarySkillItem(manifest);
    const incomingFingerprint = incomingPrimary?.versionFingerprint ?? null;
    const storedManifest = comparableBundle?.manifest ?? null;
    const storedFingerprint = comparableBundle?.primaryFingerprint ?? null;
    const localSkillFingerprint = matchingSkill?.currentVersionFingerprint ?? null;

    const storedItemMap = new Map(
      (storedManifest?.items ?? []).map((item) => [getManifestItemKey(item), item])
    );
    const addedItems: string[] = [];
    const removedItems = (storedManifest?.items ?? [])
      .filter((item) => !manifest.items.some((candidate) => getManifestItemKey(candidate) === getManifestItemKey(item)))
      .map((item) => getManifestItemLabel(item))
      .sort();
    const changedItems: string[] = [];
    let unchangedCount = 0;

    for (const item of manifest.items) {
      const key = getManifestItemKey(item);
      const storedItem = storedItemMap.get(key);
      if (!storedItem) {
        addedItems.push(getManifestItemLabel(item));
        continue;
      }

      if (hasMatchingManifestItemShape(item, storedItem)) {
        unchangedCount += 1;
      } else {
        changedItems.push(getManifestItemLabel(item));
      }
    }

    const topLevelDelta = compareStringLists(
      manifest.dependencySummary.topLevelEntries,
      storedManifest?.dependencySummary.topLevelEntries ?? []
    );
    const directoryDelta = compareStringLists(
      manifest.dependencySummary.directories,
      storedManifest?.dependencySummary.directories ?? []
    );

    const versionDelta =
      storedManifest == null
        ? ("unknown" as const)
        : manifest.versionLabel === storedManifest.versionLabel
          ? ("same" as const)
          : ("changed" as const);
    const comparedBundleFingerprintDelta = getFingerprintDelta(incomingFingerprint, storedFingerprint);
    const localSkillFingerprintDelta = getFingerprintDelta(incomingFingerprint, localSkillFingerprint);

    const reasons: string[] = [];
    let classification: SkillBundleDiffSummary["classification"] = "safe_update";
    let title = diffCopy.safeUpdateTitle;
    let summary = diffCopy.safeUpdateSummary;

    const hasBlockingErrors = issues.some((issue) => issue.severity === "error");
    const hasWarnings = issues.some((issue) => issue.severity === "warning");
    const hasMaterialFileDelta =
      addedItems.length > 0 ||
      removedItems.length > 0 ||
      changedItems.length > 0 ||
      topLevelDelta.added.length > 0 ||
      topLevelDelta.removed.length > 0 ||
      directoryDelta.added.length > 0 ||
      directoryDelta.removed.length > 0 ||
      (storedManifest
        ? manifest.dependencySummary.totalFiles !== storedManifest.dependencySummary.totalFiles
        : false);

    if (!comparableBundle && !matchingSkill) {
      classification = hasBlockingErrors ? "conflict" : "safe_update";
      title = hasBlockingErrors ? diffCopy.validationBlockedTitle : diffCopy.firstImportTitle;
      if (hasBlockingErrors) {
        summary = diffCopy.blockedImportSummary;
      } else {
        summary = diffCopy.firstImportSummary;
      }
      reasons.push(
        hasBlockingErrors ? diffCopy.resolveBlockingReason : diffCopy.noBaselineImportReason
      );
    } else if (hasBlockingErrors) {
      classification = "conflict";
      title = diffCopy.importConflictTitle;
      summary = diffCopy.importConflictSummary;
      reasons.push(diffCopy.importConflictReason);
    } else if (
      matchingSkill &&
      localSkillFingerprintDelta === "changed" &&
      comparableBundle &&
      comparedBundleFingerprintDelta === "changed"
    ) {
      classification = "conflict";
      title = diffCopy.conflictingStatesTitle;
      summary = diffCopy.conflictingStatesSummary;
      reasons.push(diffCopy.localSkillDiffReason);
      reasons.push(diffCopy.storedBundleDiffReason);
    } else if (matchingSkill && localSkillFingerprintDelta === "changed") {
      classification = "drift";
      title = diffCopy.driftTitle;
      summary = diffCopy.driftSummary;
      reasons.push(diffCopy.driftReason);
    } else if (
      comparableBundle &&
      comparedBundleFingerprintDelta === "same" &&
      versionDelta === "same" &&
      !hasMaterialFileDelta
    ) {
      classification = "no_change";
      title = diffCopy.noChangeTitle;
      summary = diffCopy.noChangeSummary;
      reasons.push(diffCopy.noChangeReason);
    } else if (comparableBundle && comparedBundleFingerprintDelta === "changed") {
      reasons.push(diffCopy.storedBundleChangedReason);
      if (versionDelta === "changed") {
        reasons.push(diffCopy.versionChangedReason);
      }
    }

    if (comparableBundle) {
      reasons.push(`Compared against stored bundle ${comparableBundle.summary.bundleName}.`);
    }

    if (hasWarnings && classification === "safe_update") {
      classification = "drift";
      title = diffCopy.reviewRecommendedTitle;
      summary = diffCopy.reviewRecommendedSummary;
      reasons.push(diffCopy.reviewRecommendedReason);
    }

    if (reasons.length === 0) {
      reasons.push(diffCopy.noBlockingConcernReason);
    }

    return {
      classification,
      title,
      summary,
      reasons,
      comparedBundle: comparableBundle?.summary ?? null,
      versionDelta,
      comparedBundleFingerprintDelta,
      localSkillFingerprintDelta,
      incomingFingerprint,
      storedBundleFingerprint: storedFingerprint,
      localSkillFingerprint,
      itemDelta: {
        added: addedItems.sort(),
        removed: removedItems,
        changed: changedItems.sort(),
        unchangedCount
      },
      dependencyDelta: {
        totalFilesDelta: storedManifest
          ? manifest.dependencySummary.totalFiles - storedManifest.dependencySummary.totalFiles
          : 0,
        addedTopLevelEntries: topLevelDelta.added,
        removedTopLevelEntries: topLevelDelta.removed,
        addedDirectories: directoryDelta.added,
        removedDirectories: directoryDelta.removed
      }
    };
  }

  private getRecommendedStrategy(): SkillBundleImportStrategy {
    return "preserve_existing";
  }

  listBundles(): SkillBundleSummary[] {
    const rows = this.database.db
      .prepare(
        `SELECT
           workflow_bundles.id,
           workflow_bundles.source_bundle_id,
           workflow_bundles.lineage_key,
           workflow_bundles.bundle_name,
           workflow_bundles.bundle_type,
           workflow_bundles.version_label,
           workflow_bundles.lifecycle_state,
           workflow_bundles.ingest_strategy,
           workflow_bundles.created_at,
           workflow_bundles.created_from_policy_id,
           workflow_bundles.export_path,
           workflow_bundles.manifest_path,
           workflow_bundles.supersedes_bundle_id,
           workflow_bundles.superseded_by_bundle_id,
           COUNT(bundle_items.id) AS item_count,
           MAX(CASE WHEN bundle_items.position_index = 0 THEN bundle_items.ref_id END) AS primary_skill_id,
           MAX(CASE WHEN bundle_items.position_index = 0 THEN skills.display_name END) AS primary_skill_name
         FROM workflow_bundles
         LEFT JOIN bundle_items
           ON bundle_items.workflow_bundle_id = workflow_bundles.id
         LEFT JOIN skills
           ON skills.id = bundle_items.ref_id
          AND bundle_items.item_type = 'skill'
         GROUP BY workflow_bundles.id
         ORDER BY
           CASE COALESCE(workflow_bundles.lifecycle_state, 'current')
             WHEN 'current' THEN 0
             WHEN 'retained' THEN 1
             ELSE 2
           END,
           workflow_bundles.created_at DESC,
           workflow_bundles.bundle_name ASC`
      )
      .all() as BundleRow[];

    return rows.map(toBundleSummary);
  }

  validateSkillBundleImport(manifestPath: string): SkillBundleValidationResult {
    const normalizedManifestPath = resolve(manifestPath.trim());
    const bundleRoot = dirname(normalizedManifestPath);
    const issues: SkillBundleValidationIssue[] = [];
    let manifest: SkillBundleManifest | null = null;
    let existingBundle: SkillBundleSummary | null = null;
    let matchingSkill: SkillBundleMatchingSkill | null = null;
    let comparableBundle: StoredBundleRecord | null = null;
    let discoveredFileCount = 0;
    const recommendedStrategy = this.getRecommendedStrategy();
    let availableStrategies: SkillBundleImportStrategy[] = ["preserve_existing"];

    if (!manifestPath.trim()) {
      issues.push({
        severity: "error",
        code: "manifest_path_missing",
        message: "Choose a local bundle manifest before validating."
      });

      return {
        manifestPath: normalizedManifestPath,
        bundleRoot,
        canImport: false,
        manifest: null,
        issues,
        existingBundle,
        matchingSkill,
        diff: createEmptyDiffSummary(issues),
        recommendedStrategy,
        availableStrategies,
        discoveredFileCount
      };
    }

    if (!existsSync(normalizedManifestPath)) {
      issues.push({
        severity: "error",
        code: "manifest_not_found",
        message: "The selected bundle manifest file does not exist."
      });
    } else {
      try {
        const parsed = JSON.parse(readFileSync(normalizedManifestPath, "utf8")) as unknown;
        manifest = parseManifest(parsed);
        if (!manifest) {
          issues.push({
            severity: "error",
            code: "manifest_schema_invalid",
            message: "The selected manifest is missing required bundle fields or uses an unsupported shape."
          });
        }
      } catch {
        issues.push({
          severity: "error",
          code: "manifest_parse_failed",
          message: "The selected file could not be parsed as a bundle manifest JSON document."
        });
      }
    }

    if (manifest) {
      discoveredFileCount = summarizeDirectory(bundleRoot).totalFiles;

      if (manifest.items.length === 0) {
        issues.push({
          severity: "error",
          code: "bundle_items_missing",
          message: "The bundle manifest does not declare any packaged items."
        });
      }

      if (!isSafeRelativePath(manifest.entrypoint) || !resolveInsideRoot(bundleRoot, manifest.entrypoint)) {
        issues.push({
          severity: "error",
          code: "entrypoint_outside_bundle",
          message: "The manifest entrypoint must stay inside the bundle root and use a safe relative path."
        });
      } else if (!existsSync(resolve(bundleRoot, manifest.entrypoint))) {
        issues.push({
          severity: "error",
          code: "entrypoint_missing",
          message: "The bundle entrypoint file referenced by the manifest was not found."
        });
      }

      for (const item of manifest.items) {
        if (
          !isSafeRelativePath(item.relativeExportPath) ||
          !resolveInsideRoot(bundleRoot, item.relativeExportPath)
        ) {
          issues.push({
            severity: "error",
            code: "item_outside_bundle",
            message: `Bundle item ${item.displayName} points outside the bundle root.`
          });
          continue;
        }

        if (!existsSync(resolve(bundleRoot, item.relativeExportPath))) {
          issues.push({
            severity: "error",
            code: "item_missing",
            message: `Bundle item ${item.displayName} is missing from the bundle artifact.`
          });
        }
      }

      existingBundle = this.findBundleRecordBySourceBundleId(manifest.bundleId)?.summary ?? null;
      if (existingBundle) {
        issues.push({
          severity: "error",
          code: "bundle_already_registered",
          message: `Bundle ${existingBundle.bundleName} is already stored locally from this same source bundle id.`
        });
      }

      matchingSkill = this.findMatchingSkill(manifest);
      comparableBundle = this.findComparableBundle(manifest);
      availableStrategies = this.getAvailableStrategies(comparableBundle);
      if (matchingSkill) {
        issues.push({
          severity: matchingSkill.sameVersionFingerprint ? "info" : "warning",
          code: matchingSkill.sameVersionFingerprint ? "matching_skill_same_version" : "matching_skill_drift",
          message: matchingSkill.sameVersionFingerprint
            ? `Indexed skill ${matchingSkill.skillName} already matches this bundle fingerprint.`
            : `Indexed skill ${matchingSkill.skillName} exists locally, but its current fingerprint differs from the bundle.`
        });
      } else {
        issues.push({
          severity: "info",
          code: "matching_skill_not_found",
          message: "No indexed local skill currently matches this bundle manifest."
        });
      }
    }

    const diff = this.buildDiffSummary(manifest, matchingSkill, comparableBundle, issues);

    return {
      manifestPath: normalizedManifestPath,
      bundleRoot,
      canImport: manifest !== null && issues.every((issue) => issue.severity !== "error"),
      manifest,
      issues,
      existingBundle,
      matchingSkill,
      diff,
      recommendedStrategy,
      availableStrategies,
      discoveredFileCount
    };
  }

  exportSkillBundle(input: SkillBundleExportInput): SkillBundleExportResult {
    const policy = this.authorizationService.getActivePolicy();
    if (!policy) {
      throw new Error("Grant authorization before exporting a bundle.");
    }

    const skill = this.database.db
      .prepare(
        `SELECT
           skills.id AS skill_id,
           skills.display_name,
           skills.canonical_name,
           skills.source_type,
           skills.source_path,
           current_versions.id AS version_id,
           current_versions.version_fingerprint,
           current_versions.frontmatter_description AS description
         FROM skills
         LEFT JOIN skill_versions AS current_versions
           ON current_versions.skill_id = skills.id
          AND current_versions.is_current = 1
         WHERE skills.id = ?
           AND skills.is_active = 1
         LIMIT 1`
      )
      .get(input.skillId) as SkillExportRow | undefined;

    if (!skill) {
      throw new Error("Selected skill was not found in the active registry.");
    }

    const createdAt = nowIso();
    const bundleId = randomUUID();
    const baseName = input.bundleName?.trim() || `${skill.display_name} Package`;
    const bundleName = baseName;
    const lineageKey = deriveLineageKeyFromSkill(skill.canonical_name, skill.display_name);
    const currentLineageBundle = this.findCurrentLineageBundle(lineageKey);
    const lifecycleState: SkillBundleLifecycleState = currentLineageBundle ? "retained" : "current";
    const ingestStrategy: SkillBundleIngestStrategy = "export_snapshot";
    const versionLabel = `v${skill.version_fingerprint ?? "snapshot"}-${timestampSlug(createdAt).slice(0, 15)}`;
    const exportFolderName = [
      sanitizeSegment(bundleName) || sanitizeSegment(skill.canonical_name) || "skill-bundle",
      sanitizeSegment(versionLabel) || "snapshot",
      bundleId.slice(0, 8)
    ].join("--");
    const exportPath = join(this.database.paths.bundlesDir, exportFolderName);
    const skillExportDir = join(exportPath, "skill");
    const manifestPath = join(exportPath, "bundle.manifest.json");
    const dependencySummary = summarizeDirectory(skill.source_path);

    mkdirSync(exportPath, { recursive: false });
    cpSync(skill.source_path, skillExportDir, {
      recursive: true,
      filter: (source) => shouldIncludePath(skill.source_path, source)
    });

    const item: SkillBundleManifestItem = {
      itemType: "skill",
      refId: skill.skill_id,
      displayName: skill.display_name,
      relativeSourcePath: basename(skill.source_path),
      relativeExportPath: "skill",
      versionFingerprint: skill.version_fingerprint,
      sourceType: skill.source_type,
      metadata: {
        canonicalName: skill.canonical_name,
        description: skill.description
      }
    };

    const manifest: SkillBundleManifest = {
      schemaVersion: "1.0.0",
      bundleId,
      bundleName,
      bundleType: "skill_package",
      versionLabel,
      createdAt,
      exportRoot: ".",
      entrypoint: "skill/SKILL.md",
      exportedFrom: {
        policyId: policy.id,
        storageRoot: this.database.paths.root
      },
      dependencySummary,
      items: [item]
    };

    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    const transaction = this.database.db.transaction(() => {
      this.database.db
        .prepare(
          `INSERT INTO workflow_bundles (
             id, source_bundle_id, lineage_key, bundle_name, bundle_type, version_label,
             lifecycle_state, ingest_strategy, created_at, created_from_policy_id,
             export_path, manifest_path, supersedes_bundle_id, superseded_by_bundle_id, manifest_json
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          bundleId,
          bundleId,
          lineageKey,
          bundleName,
          "skill_package",
          versionLabel,
          lifecycleState,
          ingestStrategy,
          createdAt,
          policy.id,
          exportPath,
          manifestPath,
          null,
          null,
          JSON.stringify(manifest)
        );

      this.database.db
        .prepare(
          `INSERT INTO bundle_items (
             id, workflow_bundle_id, item_type, ref_id, position_index, metadata_json
           ) VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(
          randomUUID(),
          bundleId,
          item.itemType,
          item.refId,
          0,
          JSON.stringify(item.metadata)
        );

      this.database.db
        .prepare(
          `INSERT INTO authorization_events (
             id, policy_id, event_type, event_summary, actor_type, created_at, metadata_json
           ) VALUES (?, ?, 'bundle.created', ?, 'system', ?, ?)`
        )
        .run(
          randomUUID(),
          policy.id,
          `Created bundle ${bundleName} with 1 packaged skill.`,
          createdAt,
          JSON.stringify({
            bundleId,
            sourceBundleId: bundleId,
            lineageKey,
            bundleType: "skill_package",
            itemCount: 1,
            exportPath,
            lifecycleState,
            ingestStrategy
          })
        );
    });

    transaction();

    const bundle = this.listBundles().find((entry) => entry.id === bundleId);
    if (!bundle) {
      throw new Error("Bundle export completed but the local record could not be read back.");
    }

    return {
      bundle,
      manifest,
      copiedFileCount: dependencySummary.totalFiles
    };
  }

  importSkillBundle(input: SkillBundleImportInput): SkillBundleImportResult {
    const policy = this.authorizationService.getActivePolicy();
    if (!policy) {
      throw new Error("Grant authorization before importing a bundle.");
    }

    const validation = this.validateSkillBundleImport(input.manifestPath);
    if (!validation.manifest || !validation.canImport) {
      const blockingIssue = validation.issues.find((issue) => issue.severity === "error");
      throw new Error(blockingIssue?.message ?? "Bundle validation failed.");
    }

    const manifest = validation.manifest;
    const strategy = input.strategy ?? validation.recommendedStrategy;
    if (!validation.availableStrategies.includes(strategy)) {
      throw new Error("The selected bundle add strategy is not available for this validation result.");
    }

    const importedAt = nowIso();
    const localBundleId = randomUUID();
    const sourceBundleId = manifest.bundleId;
    const lineageKey = deriveLineageKeyFromManifest(manifest);
    const currentLineageBundle = this.findCurrentLineageBundle(lineageKey);
    const shouldSupersedeCurrent =
      strategy === "supersede_current" && currentLineageBundle && currentLineageBundle.summary.id !== localBundleId;
    const lifecycleState: SkillBundleLifecycleState =
      currentLineageBundle && !shouldSupersedeCurrent ? "retained" : "current";
    const ingestStrategy: SkillBundleIngestStrategy = strategy;
    const supersedesBundleId = shouldSupersedeCurrent ? currentLineageBundle?.summary.id ?? null : null;
    const destinationFolderName = [
      sanitizeSegment(manifest.bundleName) || "skill-bundle",
      sanitizeSegment(manifest.versionLabel) || "snapshot",
      localBundleId.slice(0, 8)
    ].join("--");
    const destinationRoot = join(this.database.paths.bundlesDir, destinationFolderName);
    const sourceRoot = validation.bundleRoot;
    const sourceRootResolved = resolve(sourceRoot);
    const destinationRootResolved = resolve(destinationRoot);
    const useExistingLocalArtifact = sourceRootResolved === destinationRootResolved;

    if (!useExistingLocalArtifact) {
      if (existsSync(destinationRootResolved)) {
        throw new Error("A local bundle artifact directory already exists at the import destination.");
      }

      mkdirSync(destinationRootResolved, { recursive: false });
      cpSync(sourceRootResolved, destinationRootResolved, {
        recursive: true,
        filter: (source) => shouldIncludePath(sourceRootResolved, source)
      });
    }

    const storedManifestPath = useExistingLocalArtifact
      ? resolve(input.manifestPath)
      : join(destinationRootResolved, relative(sourceRootResolved, resolve(input.manifestPath)));

    const transaction = this.database.db.transaction(() => {
      this.database.db
        .prepare(
          `INSERT INTO workflow_bundles (
             id, source_bundle_id, lineage_key, bundle_name, bundle_type, version_label,
             lifecycle_state, ingest_strategy, created_at, created_from_policy_id,
             export_path, manifest_path, supersedes_bundle_id, superseded_by_bundle_id, manifest_json
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          localBundleId,
          sourceBundleId,
          lineageKey,
          manifest.bundleName,
          manifest.bundleType,
          manifest.versionLabel,
          lifecycleState,
          ingestStrategy,
          importedAt,
          policy.id,
          useExistingLocalArtifact ? sourceRootResolved : destinationRootResolved,
          storedManifestPath,
          supersedesBundleId,
          null,
          JSON.stringify(manifest)
        );

      if (shouldSupersedeCurrent && currentLineageBundle) {
        this.database.db
          .prepare(
            `UPDATE workflow_bundles
             SET lifecycle_state = 'superseded',
                 superseded_by_bundle_id = ?
             WHERE id = ?`
          )
          .run(localBundleId, currentLineageBundle.summary.id);
      }

      const insertBundleItem = this.database.db.prepare(
        `INSERT INTO bundle_items (
           id, workflow_bundle_id, item_type, ref_id, position_index, metadata_json
         ) VALUES (?, ?, ?, ?, ?, ?)`
      );

      manifest.items.forEach((item, index) => {
        insertBundleItem.run(
          randomUUID(),
          localBundleId,
          item.itemType,
          item.refId,
          index,
          JSON.stringify({
            ...item.metadata,
            displayName: item.displayName,
            relativeExportPath: item.relativeExportPath,
            versionFingerprint: item.versionFingerprint,
            sourceType: item.sourceType
          })
        );
      });

      this.database.db
        .prepare(
          `INSERT INTO authorization_events (
             id, policy_id, event_type, event_summary, actor_type, created_at, metadata_json
           ) VALUES (?, ?, 'bundle.imported', ?, 'user', ?, ?)`
        )
        .run(
          randomUUID(),
          policy.id,
          `Added bundle ${manifest.bundleName} into local bundle storage.`,
          importedAt,
          JSON.stringify({
            bundleId: localBundleId,
            sourceBundleId,
            lineageKey,
            strategy,
            lifecycleState,
            supersedesBundleId,
            importMode: input.importMode ?? "copy",
            importedItemCount: manifest.items.length,
            sourceManifestPath: validation.manifestPath,
            storedManifestPath
          })
        );
    });

    transaction();

    const bundle = this.getBundleById(localBundleId);
    if (!bundle) {
      throw new Error("Bundle import completed but the local record could not be read back.");
    }

    return {
      bundle,
      manifest,
      importedAt,
      copiedFileCount: validation.discoveredFileCount,
      appliedStrategy: strategy,
      validation
    };
  }
}
