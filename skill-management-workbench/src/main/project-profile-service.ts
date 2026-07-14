import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import type {
  ProjectProfileEvidenceState,
  ProjectProfileModuleSummary,
  ProjectProfileStatus,
  ProjectProfileSummary
} from "../shared/types";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function asStringArrayMap(value: unknown): Record<string, string[]> {
  const record = asRecord(value);
  return Object.fromEntries(
    Object.entries(record).map(([key, entry]) => [key, asStringArray(entry)])
  );
}

function parseYamlFile(path: string): UnknownRecord | null {
  if (!existsSync(path)) {
    return null;
  }

  try {
    return asRecord(parseYaml(readFileSync(path, "utf8")));
  } catch {
    return null;
  }
}

function parseJsonFile(path: string): UnknownRecord | null {
  if (!existsSync(path)) {
    return null;
  }

  try {
    return asRecord(JSON.parse(readFileSync(path, "utf8")));
  } catch {
    return null;
  }
}

function parseModules(value: unknown): ProjectProfileModuleSummary[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry, index) => {
    if (typeof entry === "string" && entry.trim()) {
      return [{ name: entry.trim(), responsibility: null, entry: null, dependsOn: [], evidence: [] }];
    }

    const record = asRecord(entry);
    const name = asString(record.name) ?? asString(record.module) ?? `Module ${index + 1}`;
    return [
      {
        name,
        responsibility: asString(record.responsibility),
        entry: asString(record.entry),
        dependsOn: asStringArray(record.depends_on ?? record.dependsOn),
        evidence: asStringArray(record.evidence)
      }
    ];
  });
}

function profilePaths(projectRoot: string) {
  const profileRoot = join(projectRoot, ".specify", "project-profile");
  return {
    profile: join(profileRoot, "profile.yaml"),
    architecture: join(profileRoot, "architecture.md"),
    decisions: join(profileRoot, "decision-memory.yaml"),
    localState: join(profileRoot, "local-state.json")
  };
}

function probeProfileStatus(projectRoot: string) {
  const scriptPath = join(projectRoot, ".specify", "scripts", "project-profile.mjs");
  if (!existsSync(scriptPath)) {
    return null;
  }

  try {
    const output = execFileSync(
      process.execPath,
      [scriptPath, "status", "--output-dir", projectRoot, "--json"],
      { encoding: "utf8", timeout: 3000, stdio: ["ignore", "pipe", "ignore"] }
    );
    return asRecord(JSON.parse(output));
  } catch {
    return null;
  }
}

function defaultSummary(projectRoot: string): ProjectProfileSummary {
  const paths = profilePaths(projectRoot);
  return {
    projectRoot,
    profilePath: paths.profile,
    architecturePath: paths.architecture,
    decisionMemoryPath: paths.decisions,
    localStatePath: paths.localState,
    status: "missing",
    evidenceState: "missing",
    lastAnalyzedAt: null,
    lastCheckedAt: null,
    capturedAt: null,
    changedEvidence: [],
    evidenceCount: 0,
    projectName: null,
    declaredStack: null,
    applicationRoots: [],
    detectedLanguages: [],
    packageManagers: [],
    frameworks: [],
    runtimes: [],
    architectureStyles: [],
    modules: [],
    entryPoints: [],
    requestOrEventFlows: [],
    ownershipBoundaries: [],
    dataStores: [],
    cachesIndexes: [],
    messagingJobs: [],
    externalIntegrations: [],
    commands: {},
    conventions: {},
    unknowns: [],
    decisionCount: 0,
    activeDecisionCount: 0
  };
}

export class ProjectProfileService {
  read(projectRoot: string): ProjectProfileSummary {
    const root = resolve(projectRoot.trim());
    const summary = defaultSummary(root);
    if (!projectRoot.trim()) {
      return summary;
    }

    const paths = profilePaths(root);
    const profile = parseYamlFile(paths.profile);
    const decisions = parseYamlFile(paths.decisions);
    const localState = parseJsonFile(paths.localState);

    if (!profile && !decisions && !existsSync(paths.architecture)) {
      return summary;
    }

    if (!profile) {
      return { ...summary, status: "invalid", evidenceState: "unknown" };
    }

    const profileStatus = asString(profile.status);
    const project = asRecord(profile.project);
    const architecture = asRecord(profile.architecture);
    const freshness = asRecord(profile.freshness);
    const evidence = asRecord(profile.evidence);
    const stateEvidence = Array.isArray(localState?.evidence) ? localState.evidence : [];
    const status: ProjectProfileStatus = profileStatus === "ready" ? "ready" : "pending_analysis";
    const rawEvidenceState = asString(freshness.evidence_state);
    const probe = probeProfileStatus(root);
    const probedEvidenceState = asString(probe?.evidenceState);
    const evidenceState: ProjectProfileEvidenceState =
      probedEvidenceState === "fresh" || probedEvidenceState === "changed" || probedEvidenceState === "missing"
        ? probedEvidenceState
        : rawEvidenceState === "fresh" || rawEvidenceState === "changed" || rawEvidenceState === "missing"
          ? rawEvidenceState
          : localState
            ? "fresh"
            : "missing";
    const changedEvidence = asStringArray(probe?.changedEvidence);
    const decisionEntries = Array.isArray(decisions?.entries) ? decisions.entries : [];
    const activeDecisionCount = decisionEntries.filter(
      (entry) => asString(asRecord(entry).status) === "active"
    ).length;

    return {
      ...summary,
      status,
      evidenceState,
      lastAnalyzedAt: asString(profile.last_analyzed_at),
      lastCheckedAt: asString(freshness.last_checked_at),
      capturedAt: asString(localState?.capturedAt),
      changedEvidence:
        changedEvidence.length > 0 ? changedEvidence : asStringArray(freshness.changed_evidence),
      evidenceCount: stateEvidence.length,
      projectName: asString(project.name),
      declaredStack: asString(project.declared_stack),
      applicationRoots: asStringArray(project.application_roots),
      detectedLanguages: asStringArray(project.detected_languages),
      packageManagers: asStringArray(project.package_managers),
      frameworks: asStringArray(project.frameworks),
      runtimes: asStringArray(project.runtimes),
      architectureStyles: asStringArray(architecture.styles),
      modules: parseModules(architecture.modules),
      entryPoints: asStringArray(architecture.entry_points),
      requestOrEventFlows: asStringArray(architecture.request_or_event_flows),
      ownershipBoundaries: asStringArray(architecture.ownership_boundaries),
      dataStores: asStringArray(architecture.data_stores),
      cachesIndexes: asStringArray(architecture.caches_indexes),
      messagingJobs: asStringArray(architecture.messaging_jobs),
      externalIntegrations: asStringArray(architecture.external_integrations),
      commands: asStringArrayMap(profile.commands),
      conventions: asStringArrayMap(profile.engineering_conventions),
      unknowns: asStringArray(evidence.unknowns),
      decisionCount: decisionEntries.length,
      activeDecisionCount
    };
  }
}
