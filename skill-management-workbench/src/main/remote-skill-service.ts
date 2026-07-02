import { createHash, randomUUID } from "node:crypto";
import type {
  RemoteMarketplaceSkill,
  RemoteSkillActivationPreview,
  RemoteSkillCandidateDetail,
  RemoteSkillCandidateSummary,
  RemoteSkillImportResult,
  RemoteSkillRiskLevel,
  RemoteSkillSourceAnalysis,
  RemoteSkillSourceCheck,
  RemoteSkillSourceType,
  RemoteSkillVerificationStatus
} from "../shared/types";
import type { WorkbenchDatabase } from "./database";

function titleCaseSlug(value: string) {
  return value
    .replace(/\.git$/i, "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function sourceIdFor(normalizedUrl: string) {
  return createHash("sha256").update(normalizedUrl).digest("hex").slice(0, 16);
}

function normalizeGitHubUrl(sourceUrl: string) {
  const parsed = new URL(sourceUrl.trim());
  if (parsed.hostname !== "github.com" && parsed.hostname !== "www.github.com") {
    throw new Error("Only github.com repository URLs are supported in the current local preview.");
  }

  const [owner, repo] = parsed.pathname
    .split("/")
    .filter(Boolean)
    .slice(0, 2);

  if (!owner || !repo) {
    throw new Error("GitHub URL must include both owner and repository name.");
  }

  const normalizedRepo = repo.replace(/\.git$/i, "");
  return {
    owner,
    repo: normalizedRepo,
    normalizedUrl: `https://github.com/${owner}/${normalizedRepo}`
  };
}

function getChecks(input: {
  sourceUrl: string;
  normalizedUrl: string;
  owner: string;
  repo: string;
}): RemoteSkillSourceCheck[] {
  const usesHttps = input.sourceUrl.trim().startsWith("https://");
  const skillNameHint = /skill|agent|prompt|workflow|mcp/i.test(input.repo);
  const hasOrgLikeOwner = input.owner.length >= 2;

  return [
    {
      label: "Source URL",
      status: usesHttps ? "pass" : "warn",
      summary: usesHttps
        ? "Repository URL uses HTTPS."
        : "Repository URL should use HTTPS before import."
    },
    {
      label: "Repository Identity",
      status: hasOrgLikeOwner ? "pass" : "warn",
      summary: `Parsed GitHub owner '${input.owner}' and repository '${input.repo}'.`
    },
    {
      label: "Manifest Detection",
      status: "warn",
      summary: "Manifest files are not fetched during local preflight; import must validate manifest before activation."
    },
    {
      label: "Skill Naming Signal",
      status: skillNameHint ? "pass" : "warn",
      summary: skillNameHint
        ? "Repository name looks related to Skill, agent, prompt, workflow, or MCP content."
        : "Repository name does not clearly indicate Skill content; preview before import."
    },
    {
      label: "Activation Boundary",
      status: "pass",
      summary: "Remote candidate will remain inactive until scope selection and explicit activation."
    }
  ];
}

function getRiskLevel(checks: RemoteSkillSourceCheck[]) {
  if (checks.some((check) => check.status === "block")) {
    return "blocked" as const;
  }
  const warnings = checks.filter((check) => check.status === "warn").length;
  if (warnings >= 3) {
    return "high" as const;
  }
  if (warnings > 0) {
    return "medium" as const;
  }
  return "low" as const;
}

function getMarketplaceRiskLevel(skill: RemoteMarketplaceSkill): RemoteSkillRiskLevel {
  const risk = `${skill.riskLabel} ${skill.riskLabelZh}`.toLowerCase();
  if (risk.includes("blocked") || risk.includes("high") || risk.includes("高")) {
    return "high";
  }
  if (risk.includes("medium") || risk.includes("review") || risk.includes("中") || risk.includes("审查")) {
    return "medium";
  }
  return "low";
}

function getMarketplaceSourceType(skill: RemoteMarketplaceSkill): RemoteSkillSourceType {
  return skill.source === "GitHub" ? "github" : "marketplace";
}

function getMarketplaceNormalizedUrl(skill: RemoteMarketplaceSkill) {
  return skill.sourceUrl || `skill-market://catalog/${skill.id}`;
}

function parseSourcePayload(sourcePayloadJson: string | null): Partial<RemoteMarketplaceSkill> | null {
  if (!sourcePayloadJson) {
    return null;
  }

  try {
    return JSON.parse(sourcePayloadJson) as Partial<RemoteMarketplaceSkill>;
  } catch {
    return null;
  }
}

function getMarketplaceChecks(skill: RemoteMarketplaceSkill): RemoteSkillSourceCheck[] {
  const riskLevel = getMarketplaceRiskLevel(skill);
  return [
    {
      label: "Catalog Candidate",
      status: "pass",
      summary: `${skill.name} was found in the bundled local marketplace catalog.`
    },
    {
      label: "Verification Metadata",
      status: skill.verificationStatus === "verified" ? "pass" : "warn",
      summary:
        skill.verificationStatus === "verified"
          ? "Catalog metadata marks this Skill as verified."
          : "Catalog metadata requires review before activation."
    },
    {
      label: "Risk Level",
      status: riskLevel === "low" ? "pass" : "warn",
      summary: `Catalog risk signal is ${skill.riskLabel}.`
    },
    {
      label: "Source Boundary",
      status: "pass",
      summary: "Import stores an inactive app-local candidate and does not fetch or execute remote code."
    },
    {
      label: "Activation Boundary",
      status: "pass",
      summary: "Activation still requires scope selection, target preview, and explicit confirmation."
    }
  ];
}

export class RemoteSkillService {
  constructor(private readonly database: WorkbenchDatabase) {}

  analyzeSource(sourceUrl: string): RemoteSkillSourceAnalysis {
    const generatedAt = new Date().toISOString();

    let parsed: ReturnType<typeof normalizeGitHubUrl>;
    let checks: RemoteSkillSourceCheck[];
    try {
      parsed = normalizeGitHubUrl(sourceUrl);
      checks = getChecks({ sourceUrl, ...parsed });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Remote source URL is invalid.";
      const fallbackUrl = sourceUrl.trim() || "invalid-remote-source";
      const normalizedUrl = fallbackUrl;
      const analysis: RemoteSkillSourceAnalysis = {
        id: `remote-${sourceIdFor(normalizedUrl)}`,
        sourceType: "github",
        sourceUrl,
        normalizedUrl,
        owner: null,
        repo: null,
        displayName: "Blocked Remote Candidate",
        generatedAt,
        riskLevel: "blocked",
        canImport: false,
        verificationStatus: "unverified",
        checks: [
          {
            label: "Source URL",
            status: "block",
            summary: message
          }
        ],
        activationSteps: [
          "Fix the repository URL.",
          "Run local preflight again.",
          "Validate manifest before import.",
          "Choose scope before activation."
        ],
        importPreview: {
          storageMode: "app_local_copy",
          executionPolicy: "manual_until_activated",
          targetState: "inactive_remote_candidate",
          requiresScopeSelection: true,
          requiresManifestValidation: true
        }
      };
      this.persistAnalysis(analysis);
      return analysis;
    }

    const riskLevel = getRiskLevel(checks);
    const analysis: RemoteSkillSourceAnalysis = {
      id: `remote-${sourceIdFor(parsed.normalizedUrl)}`,
      sourceType: "github",
      sourceUrl,
      normalizedUrl: parsed.normalizedUrl,
      owner: parsed.owner,
      repo: parsed.repo,
      displayName: titleCaseSlug(parsed.repo) || parsed.repo,
      generatedAt,
      riskLevel,
      canImport: riskLevel !== "blocked",
      verificationStatus: "unverified",
      checks,
      activationSteps: [
        "Analyze repository metadata.",
        "Validate manifest and Skill entrypoint.",
        "Import as an inactive app-local candidate.",
        "Choose scope and preview target impact.",
        "Activate manually only after confirmation."
      ],
      importPreview: {
        storageMode: "app_local_copy",
        executionPolicy: "manual_until_activated",
        targetState: "inactive_remote_candidate",
        requiresScopeSelection: true,
        requiresManifestValidation: true
      }
    };

    this.persistAnalysis(analysis);
    return analysis;
  }

  importMarketplaceSkill(skill: RemoteMarketplaceSkill): RemoteSkillImportResult {
    const importedAt = new Date().toISOString();
    const normalizedUrl = getMarketplaceNormalizedUrl(skill);
    const sourceType = getMarketplaceSourceType(skill);
    const riskLevel = getMarketplaceRiskLevel(skill);
    const analysis: RemoteSkillSourceAnalysis = {
      id: `remote-${sourceIdFor(normalizedUrl)}`,
      sourceType,
      sourceUrl: skill.sourceUrl,
      normalizedUrl,
      owner: skill.source === "GitHub" ? null : "Skill Market",
      repo: skill.source === "GitHub" ? null : skill.id,
      displayName: skill.name,
      generatedAt: importedAt,
      riskLevel,
      canImport: true,
      verificationStatus: skill.verificationStatus,
      checks: getMarketplaceChecks(skill),
      activationSteps: [
        "Store inactive app-local candidate.",
        "Review verification, trust, risk, and dependencies.",
        "Choose system, workspace, project, or folder scope.",
        "Preview target impact before any write.",
        "Activate manually only after confirmation."
      ],
      importPreview: {
        storageMode: "app_local_copy",
        executionPolicy: "manual_until_activated",
        targetState: "inactive_remote_candidate",
        requiresScopeSelection: true,
        requiresManifestValidation: true
      }
    };

    this.persistAnalysis(analysis, {
      importedAt,
      sourceCatalogId: skill.id,
      sourcePayloadJson: JSON.stringify(skill)
    });

    return {
      candidateId: analysis.id,
      catalogSkillId: skill.id,
      sourceType,
      sourceUrl: skill.sourceUrl,
      normalizedUrl,
      displayName: skill.name,
      importedAt,
      status: "inactive_remote_candidate",
      storageMode: "app_local_copy",
      executionPolicy: "manual_until_activated",
      riskLevel,
      verificationStatus: skill.verificationStatus,
      nextSteps: [
        "Review the imported inactive candidate.",
        "Open activation preview.",
        "Choose scope in Apply Center.",
        "Confirm manually before any execution."
      ]
    };
  }

  previewActivation(candidateId: string): RemoteSkillActivationPreview {
    const row = this.database.db
      .prepare(
        `SELECT id, display_name, can_import, imported_at, source_catalog_id, analysis_json
         FROM remote_skill_sources
         WHERE id = ?`
      )
      .get(candidateId) as
      | {
          id: string;
          display_name: string;
          can_import: number;
          imported_at: string | null;
          source_catalog_id: string | null;
          analysis_json: string;
        }
      | undefined;

    if (!row) {
      throw new Error("Remote candidate must be imported before activation preview.");
    }

    const previewedAt = new Date().toISOString();
    const analysis = JSON.parse(row.analysis_json) as RemoteSkillSourceAnalysis;
    const canActivateAfterConfirmation = Boolean(row.imported_at) && Boolean(row.can_import);
    const requiredSteps = [
      row.imported_at ? "Inactive candidate is stored locally." : "Import candidate into app-local storage.",
      "Choose the narrowest safe scope.",
      "Preview target impact and pending writes.",
      "Review risk, verification, and dependency signals.",
      "Confirm activation manually."
    ];

    this.database.db
      .prepare(
        `UPDATE remote_skill_sources
         SET activation_previewed_at = ?
         WHERE id = ?`
      )
      .run(previewedAt, candidateId);

    return {
      candidateId: row.id,
      catalogSkillId: row.source_catalog_id,
      displayName: analysis.displayName || row.display_name,
      previewedAt,
      status: "activation_preview",
      canActivateAfterConfirmation,
      willRunNow: false,
      scopeRequired: true,
      targetPreviewRequired: true,
      recommendedScope: "project",
      scopeOptions: ["system", "workspace", "project", "folder"],
      requiredSteps,
      boundarySummary: canActivateAfterConfirmation
        ? "Activation is ready for a manual scope and target-preview decision; no execution has run."
        : "Activation is blocked until the remote Skill is imported as an inactive local candidate."
    };
  }

  listCandidates(): RemoteSkillCandidateSummary[] {
    const rows = this.database.db
      .prepare(
        `SELECT id,
                source_type,
                source_url,
                normalized_url,
                display_name,
                risk_level,
                can_import,
                verification_status,
                imported_at,
                activation_previewed_at,
                source_catalog_id,
                analysis_json
         FROM remote_skill_sources
         WHERE imported_at IS NOT NULL
         ORDER BY imported_at DESC, generated_at DESC
         LIMIT 24`
      )
      .all() as Array<{
      id: string;
      source_type: RemoteSkillSourceType;
      source_url: string;
      normalized_url: string;
      display_name: string;
      risk_level: RemoteSkillRiskLevel;
      can_import: number;
      verification_status: RemoteSkillVerificationStatus;
      imported_at: string;
      activation_previewed_at: string | null;
      source_catalog_id: string | null;
      analysis_json: string;
    }>;

    return rows.map((row) => {
      let displayName = row.display_name;
      try {
        const analysis = JSON.parse(row.analysis_json) as Partial<RemoteSkillSourceAnalysis>;
        displayName = analysis.displayName ?? displayName;
      } catch {
        // Keep durable row data if an older analysis payload cannot be parsed.
      }

      return {
        candidateId: row.id,
        catalogSkillId: row.source_catalog_id,
        sourceType: row.source_type,
        sourceUrl: row.source_url,
        normalizedUrl: row.normalized_url,
        displayName,
        importedAt: row.imported_at,
        activationPreviewedAt: row.activation_previewed_at,
        status: row.activation_previewed_at ? "activation_previewed" : "inactive_remote_candidate",
        riskLevel: row.risk_level,
        verificationStatus: row.verification_status,
        canImport: Boolean(row.can_import),
        willRunNow: false,
        nextStep: row.activation_previewed_at ? "open_apply_center" : "preview_activation"
      };
    });
  }

  getCandidateDetail(candidateId: string): RemoteSkillCandidateDetail {
    const row = this.database.db
      .prepare(
        `SELECT id,
                source_type,
                source_url,
                normalized_url,
                owner,
                repo,
                display_name,
                risk_level,
                can_import,
                verification_status,
                generated_at,
                imported_at,
                activation_previewed_at,
                source_catalog_id,
                source_payload_json,
                analysis_json
         FROM remote_skill_sources
         WHERE id = ? AND imported_at IS NOT NULL`
      )
      .get(candidateId) as
      | {
          id: string;
          source_type: RemoteSkillSourceType;
          source_url: string;
          normalized_url: string;
          owner: string | null;
          repo: string | null;
          display_name: string;
          risk_level: RemoteSkillRiskLevel;
          can_import: number;
          verification_status: RemoteSkillVerificationStatus;
          generated_at: string;
          imported_at: string;
          activation_previewed_at: string | null;
          source_catalog_id: string | null;
          source_payload_json: string | null;
          analysis_json: string;
        }
      | undefined;

    if (!row) {
      throw new Error("Remote candidate detail is available only after import.");
    }

    const analysis = JSON.parse(row.analysis_json) as RemoteSkillSourceAnalysis;
    const sourcePayload = parseSourcePayload(row.source_payload_json);
    const dependencyCount =
      typeof sourcePayload?.dependencyCount === "number" ? sourcePayload.dependencyCount : null;
    const tags = Array.isArray(sourcePayload?.tags) ? sourcePayload.tags.filter(Boolean) : [];
    const manifestCheck = analysis.checks.find((check) =>
      check.label.toLowerCase().includes("manifest")
    );
    const canImport = Boolean(row.can_import);
    const candidate: RemoteSkillCandidateSummary = {
      candidateId: row.id,
      catalogSkillId: row.source_catalog_id,
      sourceType: row.source_type,
      sourceUrl: row.source_url,
      normalizedUrl: row.normalized_url,
      displayName: analysis.displayName || row.display_name,
      importedAt: row.imported_at,
      activationPreviewedAt: row.activation_previewed_at,
      status: row.activation_previewed_at ? "activation_previewed" : "inactive_remote_candidate",
      riskLevel: row.risk_level,
      verificationStatus: row.verification_status,
      canImport,
      willRunNow: false,
      nextStep: row.activation_previewed_at ? "open_apply_center" : "preview_activation"
    };

    return {
      candidate,
      generatedAt: analysis.generatedAt || row.generated_at,
      sourceOwner: analysis.owner ?? row.owner,
      sourceRepo: analysis.repo ?? row.repo,
      checks: analysis.checks,
      activationSteps: analysis.activationSteps,
      manifestPreview: {
        status: manifestCheck?.status ?? "warn",
        summary:
          manifestCheck?.summary ??
          "Manifest validation is required before this remote Skill can be activated.",
        requiresValidation: analysis.importPreview.requiresManifestValidation
      },
      dependencyPreview: {
        dependencyCount,
        tags,
        summary:
          dependencyCount === null
            ? "Dependency metadata is not available until manifest validation runs."
            : `${dependencyCount} dependency signal(s) are available from the bundled catalog metadata.`
      },
      diffPreview: {
        status: "preview_required",
        summary:
          "Diff preview is required before any remote candidate writes into a project, workspace, folder, or system scope.",
        changedFiles: null
      },
      catalogSignals: {
        author: typeof sourcePayload?.author === "string" ? sourcePayload.author : null,
        healthScore: typeof sourcePayload?.healthScore === "number" ? sourcePayload.healthScore : null,
        trustScore: typeof sourcePayload?.trustScore === "number" ? sourcePayload.trustScore : null,
        downloadsLabel:
          typeof sourcePayload?.downloadsLabel === "string" ? sourcePayload.downloadsLabel : null,
        ratingLabel: typeof sourcePayload?.ratingLabel === "string" ? sourcePayload.ratingLabel : null,
        updatedLabel: typeof sourcePayload?.updatedLabel === "string" ? sourcePayload.updatedLabel : null
      },
      safetyBoundaries: [
        "Stored in app-local SQLite as an inactive remote candidate.",
        "No remote code has been fetched or executed by this detail view.",
        "Activation requires scope selection, target preview, and explicit manual confirmation.",
        canImport
          ? "Candidate can proceed to preview gates."
          : "Candidate is blocked until local checks pass."
      ]
    };
  }

  private persistAnalysis(
    analysis: RemoteSkillSourceAnalysis,
    importState?: {
      importedAt?: string;
      sourceCatalogId?: string;
      sourcePayloadJson?: string;
    }
  ) {
    this.database.db
      .prepare(
        `INSERT INTO remote_skill_sources (
           id,
           source_type,
           source_url,
           normalized_url,
           owner,
           repo,
           display_name,
           risk_level,
           can_import,
           verification_status,
           generated_at,
           imported_at,
           source_catalog_id,
           source_payload_json,
           analysis_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(normalized_url) DO UPDATE SET
           source_url = excluded.source_url,
           owner = excluded.owner,
           repo = excluded.repo,
           display_name = excluded.display_name,
           risk_level = excluded.risk_level,
           can_import = excluded.can_import,
           verification_status = excluded.verification_status,
           generated_at = excluded.generated_at,
           imported_at = COALESCE(excluded.imported_at, remote_skill_sources.imported_at),
           source_catalog_id = COALESCE(excluded.source_catalog_id, remote_skill_sources.source_catalog_id),
           source_payload_json = COALESCE(excluded.source_payload_json, remote_skill_sources.source_payload_json),
           analysis_json = excluded.analysis_json`
      )
      .run(
        analysis.id,
        analysis.sourceType,
        analysis.sourceUrl,
        analysis.normalizedUrl,
        analysis.owner,
        analysis.repo,
        analysis.displayName,
        analysis.riskLevel,
        analysis.canImport ? 1 : 0,
        analysis.verificationStatus,
        analysis.generatedAt,
        importState?.importedAt ?? null,
        importState?.sourceCatalogId ?? null,
        importState?.sourcePayloadJson ?? null,
        JSON.stringify(analysis)
      );
  }
}
