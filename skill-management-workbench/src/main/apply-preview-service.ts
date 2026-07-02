import { randomUUID } from "node:crypto";
import type { RemoteSkillSourceAnalysis, SkillApplyPreview, SkillApplyPreviewInput } from "../shared/types";
import type { AuthorizationService } from "./authorization-service";
import type { WorkbenchDatabase } from "./database";

function nowIso() {
  return new Date().toISOString();
}

export class ApplyPreviewService {
  constructor(
    private readonly database: WorkbenchDatabase,
    private readonly authorizationService: AuthorizationService
  ) {}

  previewSkillApply(input: SkillApplyPreviewInput): SkillApplyPreview {
    const policy = this.authorizationService.getActivePolicy();
    if (!policy) {
      throw new Error("Authorize scan roots before previewing Skill apply impact.");
    }

    if (input.remoteCandidateId) {
      return this.previewRemoteCandidateApply(input);
    }

    if (!input.skillId) {
      throw new Error("Choose an indexed Skill before previewing apply impact.");
    }

    const skill = this.database.db
      .prepare(
        `SELECT id, display_name, source_type, source_path
         FROM skills
         WHERE id = ? AND is_active = 1
         LIMIT 1`
      )
      .get(input.skillId) as Record<string, unknown> | undefined;

    if (!skill) {
      throw new Error("Choose an indexed Skill before previewing apply impact.");
    }

    const roots = this.authorizationService.listRoots(policy.id);
    const exclusions = this.authorizationService.listExclusions(policy.id);
    const rootCount = Math.max(roots.length, 1);
    const skillCount = Number(
      (
        this.database.db
          .prepare(`SELECT COUNT(*) AS count FROM skills WHERE is_active = 1`)
          .get() as { count: number }
      ).count
    );
    const safeSkillCount = Math.max(skillCount, 1);
    const primaryRoot = roots[0]?.path ?? null;

    const scopeTargets: Record<
      SkillApplyPreviewInput["scope"],
      {
        targetLabel: string;
        targetPath: string | null;
        projects: number;
        folders: number;
        workspaces: number;
        pendingWrites: number;
        requiresBackupRecommendation: boolean;
      }
    > = {
      system: {
        targetLabel: "Current user system profile",
        targetPath: policy.storageRoot,
        projects: safeSkillCount,
        folders: rootCount,
        workspaces: rootCount,
        pendingWrites: Math.max(2, rootCount + 1),
        requiresBackupRecommendation: true
      },
      workspace: {
        targetLabel: "Approved workspace root",
        targetPath: primaryRoot,
        projects: Math.max(rootCount, 1),
        folders: rootCount,
        workspaces: 1,
        pendingWrites: 2,
        requiresBackupRecommendation: true
      },
      project: {
        targetLabel: "Active project root",
        targetPath: primaryRoot,
        projects: 1,
        folders: Math.max(1, Math.min(rootCount + exclusions.length, 3)),
        workspaces: 0,
        pendingWrites: 1,
        requiresBackupRecommendation: false
      },
      folder: {
        targetLabel: "Current folder only",
        targetPath: primaryRoot,
        projects: 0,
        folders: 1,
        workspaces: 0,
        pendingWrites: 1,
        requiresBackupRecommendation: false
      }
    };

    const target = scopeTargets[input.scope];
    const sourceType = String(skill.source_type ?? "");
    const warnings = [
      target.requiresBackupRecommendation
        ? "Create or verify a local backup before confirming broad-scope apply."
        : null,
      primaryRoot ? null : "No approved root path is available; choose a target before confirmation.",
      sourceType.includes("remote") ? "Remote Skills must be imported and activated manually first." : null
    ].filter((warning): warning is string => Boolean(warning));

    return {
      id: randomUUID(),
      skillId: String(skill.id),
      sourceKind: "local_skill",
      remoteCandidateId: null,
      skillName: String(skill.display_name),
      scope: input.scope,
      generatedAt: nowIso(),
      targetLabel: target.targetLabel,
      targetPath: target.targetPath,
      conflictPolicy: "preview_diff_first",
      remoteSkillPolicy: "activation_required",
      readyForConfirmation: warnings.length === 0 || !warnings.some((warning) => warning.includes("No approved root")),
      requiresBackupRecommendation: target.requiresBackupRecommendation,
      impact: {
        projects: target.projects,
        folders: target.folders,
        workspaces: target.workspaces,
        pendingWrites: target.pendingWrites
      },
      previewSteps: [
        "Select Skill and scope.",
        "Resolve target path inside approved local boundaries.",
        "Preview file and policy changes.",
        "Create backup if the scope is broad.",
        "Confirm manually before any write."
      ],
      warnings
    };
  }

  private previewRemoteCandidateApply(input: SkillApplyPreviewInput): SkillApplyPreview {
    const policy = this.authorizationService.getActivePolicy();
    if (!policy) {
      throw new Error("Authorize scan roots before previewing remote candidate apply impact.");
    }

    const row = this.database.db
      .prepare(
        `SELECT id, display_name, imported_at, activation_previewed_at, analysis_json
         FROM remote_skill_sources
         WHERE id = ? AND imported_at IS NOT NULL
         LIMIT 1`
      )
      .get(input.remoteCandidateId) as
      | {
          id: string;
          display_name: string;
          imported_at: string;
          activation_previewed_at: string | null;
          analysis_json: string;
        }
      | undefined;

    if (!row) {
      throw new Error("Import the remote Skill before previewing apply impact.");
    }

    const roots = this.authorizationService.listRoots(policy.id);
    const primaryRoot = roots[0]?.path ?? null;
    const analysis = JSON.parse(row.analysis_json) as RemoteSkillSourceAnalysis;
    const broadScope = input.scope === "system" || input.scope === "workspace";
    const scopeTargets: Record<
      SkillApplyPreviewInput["scope"],
      {
        targetLabel: string;
        targetPath: string | null;
        projects: number;
        folders: number;
        workspaces: number;
        pendingWrites: number;
        requiresBackupRecommendation: boolean;
      }
    > = {
      system: {
        targetLabel: "Remote candidate system-scope target preview",
        targetPath: policy.storageRoot,
        projects: Math.max(roots.length, 1),
        folders: Math.max(roots.length, 1),
        workspaces: Math.max(roots.length, 1),
        pendingWrites: 0,
        requiresBackupRecommendation: true
      },
      workspace: {
        targetLabel: "Remote candidate workspace target preview",
        targetPath: primaryRoot,
        projects: Math.max(roots.length, 1),
        folders: Math.max(roots.length, 1),
        workspaces: 1,
        pendingWrites: 0,
        requiresBackupRecommendation: true
      },
      project: {
        targetLabel: "Remote candidate project target preview",
        targetPath: primaryRoot,
        projects: 1,
        folders: primaryRoot ? 1 : 0,
        workspaces: 0,
        pendingWrites: 0,
        requiresBackupRecommendation: false
      },
      folder: {
        targetLabel: "Remote candidate folder target preview",
        targetPath: primaryRoot,
        projects: 0,
        folders: primaryRoot ? 1 : 0,
        workspaces: 0,
        pendingWrites: 0,
        requiresBackupRecommendation: false
      }
    };
    const target = scopeTargets[input.scope];
    const warnings = [
      row.activation_previewed_at ? null : "Activation preview must run before remote candidate apply confirmation.",
      primaryRoot ? null : "No approved root path is available; choose a target before confirmation.",
      broadScope ? "Broad remote candidate scope requires backup and extra review." : null,
      analysis.importPreview.requiresManifestValidation
        ? "Manifest validation and diff preview are required before any write."
        : null
    ].filter((warning): warning is string => Boolean(warning));

    return {
      id: randomUUID(),
      skillId: null,
      sourceKind: "remote_candidate",
      remoteCandidateId: row.id,
      skillName: analysis.displayName || row.display_name,
      scope: input.scope,
      generatedAt: nowIso(),
      targetLabel: target.targetLabel,
      targetPath: target.targetPath,
      conflictPolicy: "preview_diff_first",
      remoteSkillPolicy: "activation_required",
      readyForConfirmation: false,
      requiresBackupRecommendation: target.requiresBackupRecommendation,
      impact: {
        projects: target.projects,
        folders: target.folders,
        workspaces: target.workspaces,
        pendingWrites: target.pendingWrites
      },
      previewSteps: [
        "Review imported inactive remote candidate.",
        "Confirm activation preview has run.",
        "Choose the narrowest safe scope.",
        "Preview target impact and diff before any write.",
        "Confirm manually only after manifest validation."
      ],
      warnings
    };
  }
}
