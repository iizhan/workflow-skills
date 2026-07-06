import { basename } from "node:path";
import type {
  GraphEdgeSummary,
  GraphNeighborhood,
  GraphNodeSummary,
  GraphPathTrace,
  GraphSnapshot,
  GraphTracePath,
  GraphTypeCount
} from "../shared/types";
import type { AuthorizationService } from "./authorization-service";
import type { WorkbenchDatabase } from "./database";

interface RootRow {
  id: string;
  path: string;
  root_type: string;
}

interface SkillRow {
  skill_id: string;
  display_name: string;
  source_path: string;
  source_type: string;
  version_id: string | null;
  version_fingerprint: string | null;
}

interface ModelUsageRow {
  skill_id: string;
  model_name: string;
  runs_count: number;
}

interface ProposalRow {
  proposal_id: string;
  skill_id: string;
  title: string;
  status: string;
  severity: string;
}

interface BundleRow {
  bundle_id: string;
  source_bundle_id: string | null;
  lineage_key: string | null;
  bundle_name: string;
  bundle_type: string;
  version_label: string;
  lifecycle_state: string | null;
  ingest_strategy: string | null;
  supersedes_bundle_id: string | null;
  superseded_by_bundle_id: string | null;
  primary_skill_id: string | null;
  item_count: number;
}

interface NodeRow {
  id: string;
  node_type: string;
  ref_id: string;
  display_name: string;
  updated_at: string;
  metadata_json: string;
  degree: number | null;
}

interface EdgeRow {
  id: string;
  edge_type: string;
  from_node_id: string;
  to_node_id: string;
  weight: number;
  first_seen_at: string;
  last_seen_at: string;
  metadata_json: string;
  from_display_name: string;
  to_display_name: string;
}

interface BundleLineageStats {
  displayName: string;
  currentCount: number;
  retainedCount: number;
  supersededCount: number;
  bundleCount: number;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeRootMatch(sourcePath: string, rootPath: string) {
  return (
    sourcePath === rootPath ||
    sourcePath.startsWith(`${rootPath}/`) ||
    sourcePath.startsWith(`${rootPath}\\`)
  );
}

function toCountList(rows: Array<Record<string, unknown>>, keyName: string): GraphTypeCount[] {
  return rows.map((row) => ({
    key: String(row[keyName]),
    count: Number(row.count ?? 0)
  }));
}

function parseMetadata(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function toNodeSummary(row: NodeRow): GraphNodeSummary {
  return {
    id: row.id,
    nodeType: row.node_type,
    refId: row.ref_id,
    displayName: row.display_name,
    degree: Number(row.degree ?? 0),
    updatedAt: row.updated_at,
    metadata: parseMetadata(row.metadata_json)
  };
}

function toEdgeSummary(row: EdgeRow): GraphEdgeSummary {
  return {
    id: row.id,
    edgeType: row.edge_type,
    fromNodeId: row.from_node_id,
    toNodeId: row.to_node_id,
    fromDisplayName: row.from_display_name,
    toDisplayName: row.to_display_name,
    weight: Number(row.weight ?? 0),
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    metadata: parseMetadata(row.metadata_json)
  };
}

const graphDegreeJoinSql = `
  LEFT JOIN (
    SELECT node_id, COUNT(*) AS degree
    FROM (
      SELECT from_node_id AS node_id FROM graph_edges
      UNION ALL
      SELECT to_node_id AS node_id FROM graph_edges
    )
    GROUP BY node_id
  ) AS node_degrees
    ON node_degrees.node_id = graph_nodes.id
`;

function getGraphGeneratedAt(database: WorkbenchDatabase) {
  const generatedRow = database.db
    .prepare(
      `SELECT MAX(ts) AS generated_at
       FROM (
         SELECT updated_at AS ts FROM graph_nodes
         UNION ALL
         SELECT last_seen_at AS ts FROM graph_edges
       )`
    )
    .get() as Record<string, unknown> | undefined;

  return generatedRow?.generated_at ? String(generatedRow.generated_at) : null;
}

function selectGraphNodeRows(
  database: WorkbenchDatabase,
  nodeIds: string[],
  centerNodeId?: string
) {
  if (nodeIds.length === 0) {
    return [] as NodeRow[];
  }

  const placeholders = nodeIds.map(() => "?").join(", ");
  const centerOrderSql = centerNodeId
    ? "CASE WHEN graph_nodes.id = ? THEN 0 ELSE 1 END,"
    : "";
  const params = centerNodeId ? [...nodeIds, centerNodeId] : [...nodeIds];

  return database.db
    .prepare(
      `SELECT
         graph_nodes.id,
         graph_nodes.node_type,
         graph_nodes.ref_id,
         graph_nodes.display_name,
         graph_nodes.updated_at,
         graph_nodes.metadata_json,
         COALESCE(node_degrees.degree, 0) AS degree
       FROM graph_nodes
       ${graphDegreeJoinSql}
       WHERE graph_nodes.id IN (${placeholders})
       ORDER BY ${centerOrderSql} degree DESC, graph_nodes.node_type ASC, graph_nodes.display_name ASC`
    )
    .all(...params) as NodeRow[];
}

function selectIncidentEdgeRows(database: WorkbenchDatabase, nodeIds: string[]) {
  if (nodeIds.length === 0) {
    return [] as EdgeRow[];
  }

  const placeholders = nodeIds.map(() => "?").join(", ");

  return database.db
    .prepare(
      `SELECT
         graph_edges.id,
         graph_edges.edge_type,
         graph_edges.from_node_id,
         graph_edges.to_node_id,
         graph_edges.weight,
         graph_edges.first_seen_at,
         graph_edges.last_seen_at,
         graph_edges.metadata_json,
         from_nodes.display_name AS from_display_name,
         to_nodes.display_name AS to_display_name
       FROM graph_edges
       INNER JOIN graph_nodes AS from_nodes ON from_nodes.id = graph_edges.from_node_id
       INNER JOIN graph_nodes AS to_nodes ON to_nodes.id = graph_edges.to_node_id
       WHERE graph_edges.from_node_id IN (${placeholders})
          OR graph_edges.to_node_id IN (${placeholders})
       ORDER BY graph_edges.weight DESC, graph_edges.last_seen_at DESC, graph_edges.edge_type ASC`
    )
    .all(...nodeIds, ...nodeIds) as EdgeRow[];
}

const graphTraceTypePriority = [
  "proposal",
  "bundle",
  "bundle_lineage",
  "model",
  "skill",
  "version",
  "root"
];

function compareGraphTraceType(left: string, right: string) {
  const leftIndex = graphTraceTypePriority.indexOf(left);
  const rightIndex = graphTraceTypePriority.indexOf(right);

  if (leftIndex === -1 && rightIndex === -1) {
    return left.localeCompare(right);
  }
  if (leftIndex === -1) {
    return 1;
  }
  if (rightIndex === -1) {
    return -1;
  }
  return leftIndex - rightIndex;
}

export class GraphService {
  constructor(
    private readonly database: WorkbenchDatabase,
    private readonly authorizationService: AuthorizationService
  ) {}

  refreshGraph(): GraphSnapshot {
    const policy = this.authorizationService.getActivePolicy();
    if (!policy) {
      throw new Error("Grant authorization before generating the skill graph.");
    }

    const generatedAt = nowIso();

    const transaction = this.database.db.transaction(() => {
      const roots = this.database.db
        .prepare(
          `SELECT id, path, root_type
           FROM scan_roots
           WHERE policy_id = ? AND is_enabled = 1
           ORDER BY length(path) DESC, created_at ASC`
        )
        .all(policy.id) as RootRow[];

      const skills = this.database.db
        .prepare(
          `SELECT
             skills.id AS skill_id,
             skills.display_name,
             skills.source_path,
             skills.source_type,
             current_versions.id AS version_id,
             current_versions.version_fingerprint
           FROM skills
           LEFT JOIN skill_versions AS current_versions
             ON current_versions.skill_id = skills.id
            AND current_versions.is_current = 1
           WHERE skills.is_active = 1
           ORDER BY skills.display_name ASC`
        )
        .all() as SkillRow[];

      const modelUsage = this.database.db
        .prepare(
          `SELECT
             skill_id,
             model_name,
             COUNT(*) AS runs_count
           FROM skill_runs
           WHERE model_name IS NOT NULL AND trim(model_name) <> ''
           GROUP BY skill_id, model_name
           ORDER BY runs_count DESC`
        )
        .all() as ModelUsageRow[];

      const proposals = this.database.db
        .prepare(
          `SELECT
             id AS proposal_id,
             skill_id,
             title,
             status,
             severity
           FROM optimization_proposals
           WHERE status IN ('open', 'accepted')
           ORDER BY updated_at DESC`
        )
        .all() as ProposalRow[];

      const bundles = this.database.db
        .prepare(
          `SELECT
             workflow_bundles.id AS bundle_id,
             workflow_bundles.source_bundle_id,
             workflow_bundles.lineage_key,
             workflow_bundles.bundle_name,
             workflow_bundles.bundle_type,
             workflow_bundles.version_label,
             workflow_bundles.lifecycle_state,
             workflow_bundles.ingest_strategy,
             workflow_bundles.supersedes_bundle_id,
             workflow_bundles.superseded_by_bundle_id,
             MAX(CASE WHEN bundle_items.position_index = 0 THEN bundle_items.ref_id END) AS primary_skill_id,
             COUNT(bundle_items.id) AS item_count
           FROM workflow_bundles
           LEFT JOIN bundle_items
             ON bundle_items.workflow_bundle_id = workflow_bundles.id
           GROUP BY workflow_bundles.id
           ORDER BY workflow_bundles.created_at DESC`
        )
        .all() as BundleRow[];

      this.database.db.prepare(`DELETE FROM graph_edges`).run();
      this.database.db.prepare(`DELETE FROM graph_nodes`).run();

      const insertNode = this.database.db.prepare(
        `INSERT INTO graph_nodes (
           id, node_type, ref_id, display_name, metadata_json, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?)`
      );
      const insertEdge = this.database.db.prepare(
        `INSERT INTO graph_edges (
           id, edge_type, from_node_id, to_node_id, weight, first_seen_at, last_seen_at, metadata_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );

      const nodeIds = new Map<string, string>();
      let nodeCounter = 0;
      let edgeCounter = 0;

      const ensureNode = (
        logicalKey: string,
        nodeType: string,
        refId: string,
        displayName: string,
        metadata: Record<string, unknown>
      ) => {
        const existing = nodeIds.get(logicalKey);
        if (existing) {
          return existing;
        }

        nodeCounter += 1;
        const nodeId = `node-${nodeCounter}`;
        insertNode.run(
          nodeId,
          nodeType,
          refId,
          displayName,
          JSON.stringify(metadata),
          generatedAt
        );
        nodeIds.set(logicalKey, nodeId);
        return nodeId;
      };

      const createEdge = (
        edgeType: string,
        fromNodeId: string,
        toNodeId: string,
        weight: number,
        metadata: Record<string, unknown>
      ) => {
        edgeCounter += 1;
        insertEdge.run(
          `edge-${edgeCounter}`,
          edgeType,
          fromNodeId,
          toNodeId,
          weight,
          generatedAt,
          generatedAt,
          JSON.stringify(metadata)
        );
      };

      const normalizeLifecycleState = (value: string | null) => {
        switch (value) {
          case "retained":
          case "superseded":
          case "current":
            return value;
          default:
            return "current";
        }
      };

      const lineageStats = new Map<string, BundleLineageStats>();
      for (const bundle of bundles) {
        const lineageKey = bundle.lineage_key?.trim() || `source:${bundle.source_bundle_id ?? bundle.bundle_id}`;
        const existing = lineageStats.get(lineageKey) ?? {
          displayName: `Bundle Lineage · ${bundle.bundle_name}`,
          currentCount: 0,
          retainedCount: 0,
          supersededCount: 0,
          bundleCount: 0
        };
        const lifecycleState = normalizeLifecycleState(bundle.lifecycle_state);
        existing.bundleCount += 1;
        if (lifecycleState === "current") {
          existing.currentCount += 1;
        } else if (lifecycleState === "retained") {
          existing.retainedCount += 1;
        } else {
          existing.supersededCount += 1;
        }
        lineageStats.set(lineageKey, existing);
      }

      const rootNodeIds = new Map<string, string>();
      for (const root of roots) {
        const displayName = basename(root.path) || root.path;
        const nodeId = ensureNode(
          `root:${root.id}`,
          "root",
          root.id,
          displayName,
          { path: root.path, rootType: root.root_type }
        );
        rootNodeIds.set(root.id, nodeId);
      }

      const skillNodeIds = new Map<string, string>();
      for (const skill of skills) {
        const skillNodeId = ensureNode(
          `skill:${skill.skill_id}`,
          "skill",
          skill.skill_id,
          skill.display_name,
          { sourcePath: skill.source_path, sourceType: skill.source_type }
        );
        skillNodeIds.set(skill.skill_id, skillNodeId);

        const matchedRoot = roots.find((root) => normalizeRootMatch(skill.source_path, root.path));
        if (matchedRoot) {
          const rootNodeId = rootNodeIds.get(matchedRoot.id);
          if (rootNodeId) {
            createEdge("contains", rootNodeId, skillNodeId, 1, {
              rootPath: matchedRoot.path,
              skillPath: skill.source_path
            });
          }
        }

        if (skill.version_id && skill.version_fingerprint) {
          const versionNodeId = ensureNode(
            `version:${skill.version_id}`,
            "version",
            skill.version_id,
            `v${skill.version_fingerprint}`,
            { fingerprint: skill.version_fingerprint, skillId: skill.skill_id }
          );
          createEdge("has_version", skillNodeId, versionNodeId, 1, {
            fingerprint: skill.version_fingerprint
          });
        }
      }

      for (const usage of modelUsage) {
        const skillNodeId = skillNodeIds.get(usage.skill_id);
        if (!skillNodeId) {
          continue;
        }

        const modelNodeId = ensureNode(
          `model:${usage.model_name}`,
          "model",
          usage.model_name,
          usage.model_name,
          { modelName: usage.model_name }
        );
        createEdge("uses_model", skillNodeId, modelNodeId, Number(usage.runs_count ?? 0), {
          runs: Number(usage.runs_count ?? 0)
        });
      }

      for (const proposal of proposals) {
        const skillNodeId = skillNodeIds.get(proposal.skill_id);
        if (!skillNodeId) {
          continue;
        }

        const proposalNodeId = ensureNode(
          `proposal:${proposal.proposal_id}`,
          "proposal",
          proposal.proposal_id,
          proposal.title,
          { status: proposal.status, severity: proposal.severity }
        );
        createEdge("optimized_by", skillNodeId, proposalNodeId, 1, {
          status: proposal.status,
          severity: proposal.severity
        });
      }

      const bundleNodeIds = new Map<string, string>();
      for (const bundle of bundles) {
        const lineageKey = bundle.lineage_key?.trim() || `source:${bundle.source_bundle_id ?? bundle.bundle_id}`;
        const lifecycleState = normalizeLifecycleState(bundle.lifecycle_state);
        const bundleNodeId = ensureNode(
          `bundle:${bundle.bundle_id}`,
          "bundle",
          bundle.bundle_id,
          bundle.bundle_name,
          {
            sourceBundleId: bundle.source_bundle_id ?? bundle.bundle_id,
            lineageKey,
            bundleType: bundle.bundle_type,
            versionLabel: bundle.version_label,
            lifecycleState,
            ingestStrategy: bundle.ingest_strategy ?? "export_snapshot",
            itemCount: Number(bundle.item_count ?? 0),
            supersedesBundleId: bundle.supersedes_bundle_id,
            supersededByBundleId: bundle.superseded_by_bundle_id
          }
        );
        bundleNodeIds.set(bundle.bundle_id, bundleNodeId);

        const lineageNodeId = ensureNode(
          `bundle-lineage:${lineageKey}`,
          "bundle_lineage",
          lineageKey,
          lineageStats.get(lineageKey)?.displayName ?? `Bundle Lineage · ${bundle.bundle_name}`,
          {
            lineageKey,
            ...lineageStats.get(lineageKey)
          }
        );
        createEdge("belongs_to_lineage", bundleNodeId, lineageNodeId, 1, {
          lifecycleState,
          lineageKey
        });

        if (bundle.primary_skill_id) {
          const skillNodeId = skillNodeIds.get(bundle.primary_skill_id);
          if (skillNodeId) {
            createEdge("packaged_as", skillNodeId, bundleNodeId, 1, {
              lineageKey,
              lifecycleState,
              versionLabel: bundle.version_label,
              itemCount: Number(bundle.item_count ?? 0)
            });
          }
        }
      }

      for (const bundle of bundles) {
        if (!bundle.supersedes_bundle_id) {
          continue;
        }

        const bundleNodeId = bundleNodeIds.get(bundle.bundle_id);
        const previousBundleNodeId = bundleNodeIds.get(bundle.supersedes_bundle_id);
        if (!bundleNodeId || !previousBundleNodeId) {
          continue;
        }

        createEdge("supersedes", bundleNodeId, previousBundleNodeId, 1, {
          lineageKey: bundle.lineage_key?.trim() || `source:${bundle.source_bundle_id ?? bundle.bundle_id}`,
          promotedBundleId: bundle.bundle_id,
          previousBundleId: bundle.supersedes_bundle_id
        });
      }
    });

    transaction();
    return this.getGraphSnapshot();
  }

  getGraphSnapshot(): GraphSnapshot {
    const totals = this.database.db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM graph_nodes) AS total_nodes,
           (SELECT COUNT(*) FROM graph_edges) AS total_edges`
      )
      .get() as Record<string, unknown>;

    const nodeTypeCountsRows = this.database.db
      .prepare(
        `SELECT node_type, COUNT(*) AS count
         FROM graph_nodes
         GROUP BY node_type
         ORDER BY count DESC, node_type ASC`
      )
      .all() as Array<Record<string, unknown>>;

    const edgeTypeCountsRows = this.database.db
      .prepare(
        `SELECT edge_type, COUNT(*) AS count
         FROM graph_edges
         GROUP BY edge_type
         ORDER BY count DESC, edge_type ASC`
      )
      .all() as Array<Record<string, unknown>>;

    const nodes = this.database.db
      .prepare(
        `SELECT
           graph_nodes.id,
           graph_nodes.node_type,
           graph_nodes.ref_id,
           graph_nodes.display_name,
           graph_nodes.updated_at,
           graph_nodes.metadata_json,
           COALESCE(node_degrees.degree, 0) AS degree
         FROM graph_nodes
         ${graphDegreeJoinSql}
         ORDER BY degree DESC, graph_nodes.node_type ASC, graph_nodes.display_name ASC
         LIMIT 18`
      )
      .all() as NodeRow[];

    const edges = this.database.db
      .prepare(
        `SELECT
           graph_edges.id,
           graph_edges.edge_type,
           graph_edges.from_node_id,
           graph_edges.to_node_id,
           graph_edges.weight,
           graph_edges.first_seen_at,
           graph_edges.last_seen_at,
           graph_edges.metadata_json,
           from_nodes.display_name AS from_display_name,
           to_nodes.display_name AS to_display_name
         FROM graph_edges
         INNER JOIN graph_nodes AS from_nodes ON from_nodes.id = graph_edges.from_node_id
         INNER JOIN graph_nodes AS to_nodes ON to_nodes.id = graph_edges.to_node_id
         ORDER BY graph_edges.weight DESC, graph_edges.edge_type ASC, graph_edges.last_seen_at DESC
         LIMIT 24`
      )
      .all() as EdgeRow[];

    return {
      generatedAt: getGraphGeneratedAt(this.database),
      totalNodes: Number(totals.total_nodes ?? 0),
      totalEdges: Number(totals.total_edges ?? 0),
      nodeTypeCounts: toCountList(nodeTypeCountsRows, "node_type"),
      edgeTypeCounts: toCountList(edgeTypeCountsRows, "edge_type"),
      nodes: nodes.map(toNodeSummary),
      edges: edges.map(toEdgeSummary)
    };
  }

  getGraphNeighborhood(nodeId: string, edgeLimit = 18): GraphNeighborhood {
    if (!this.authorizationService.getActivePolicy()) {
      throw new Error("Grant authorization before exploring graph neighborhoods.");
    }

    const centerRows = selectGraphNodeRows(this.database, [nodeId], nodeId);
    const centerNode = centerRows[0] ? toNodeSummary(centerRows[0]) : null;
    const generatedAt = getGraphGeneratedAt(this.database);

    if (!centerNode) {
      return {
        centerNodeId: nodeId,
        centerNode: null,
        generatedAt,
        totalNodeCount: 0,
        totalEdgeCount: 0,
        hiddenNodeCount: 0,
        hiddenEdgeCount: 0,
        nodes: [],
        edges: []
      };
    }

    const totalEdgeRow = this.database.db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM graph_edges
         WHERE from_node_id = ? OR to_node_id = ?`
      )
      .get(nodeId, nodeId) as Record<string, unknown>;

    const neighborCountRow = this.database.db
      .prepare(
        `SELECT COUNT(
            DISTINCT CASE
              WHEN from_node_id = ? THEN to_node_id
              ELSE from_node_id
            END
          ) AS count
         FROM graph_edges
         WHERE from_node_id = ? OR to_node_id = ?`
      )
      .get(nodeId, nodeId, nodeId) as Record<string, unknown>;

    const edges = this.database.db
      .prepare(
        `SELECT
           graph_edges.id,
           graph_edges.edge_type,
           graph_edges.from_node_id,
           graph_edges.to_node_id,
           graph_edges.weight,
           graph_edges.first_seen_at,
           graph_edges.last_seen_at,
           graph_edges.metadata_json,
           from_nodes.display_name AS from_display_name,
           to_nodes.display_name AS to_display_name
         FROM graph_edges
         INNER JOIN graph_nodes AS from_nodes ON from_nodes.id = graph_edges.from_node_id
         INNER JOIN graph_nodes AS to_nodes ON to_nodes.id = graph_edges.to_node_id
         WHERE graph_edges.from_node_id = ? OR graph_edges.to_node_id = ?
         ORDER BY graph_edges.weight DESC, graph_edges.edge_type ASC, graph_edges.last_seen_at DESC
         LIMIT ?`
      )
      .all(nodeId, nodeId, edgeLimit) as EdgeRow[];

    const visibleNodeIds = new Set<string>([nodeId]);
    for (const edge of edges) {
      visibleNodeIds.add(edge.from_node_id);
      visibleNodeIds.add(edge.to_node_id);
    }

    const nodes = selectGraphNodeRows(this.database, [...visibleNodeIds], nodeId).map(toNodeSummary);
    const totalNodeCount = 1 + Number(neighborCountRow.count ?? 0);
    const totalEdgeCount = Number(totalEdgeRow.count ?? 0);

    return {
      centerNodeId: nodeId,
      centerNode,
      generatedAt,
      totalNodeCount,
      totalEdgeCount,
      hiddenNodeCount: Math.max(0, totalNodeCount - nodes.length),
      hiddenEdgeCount: Math.max(0, totalEdgeCount - edges.length),
      nodes,
      edges: edges.map(toEdgeSummary)
    };
  }

  getGraphPathTrace(nodeId: string, maxDepth = 3, pathLimit = 6): GraphPathTrace {
    if (!this.authorizationService.getActivePolicy()) {
      throw new Error("Grant authorization before tracing graph relationships.");
    }

    const centerRows = selectGraphNodeRows(this.database, [nodeId], nodeId);
    const centerNode = centerRows[0] ? toNodeSummary(centerRows[0]) : null;
    const generatedAt = getGraphGeneratedAt(this.database);

    if (!centerNode) {
      return {
        centerNodeId: nodeId,
        centerNode: null,
        generatedAt,
        maxDepth,
        pathLimit,
        totalCandidateCount: 0,
        truncated: false,
        targetTypeCounts: [],
        paths: []
      };
    }

    const bestPaths = new Map<
      string,
      {
        prevNodeId: string;
        edge: EdgeRow;
        depth: number;
        aggregateWeight: number;
      }
    >();
    let frontierNodeIds = [nodeId];
    const expandedNodeIds = new Set<string>();

    for (let depth = 0; depth < maxDepth && frontierNodeIds.length > 0; depth += 1) {
      const nextFrontierNodeIds = new Set<string>();
      const expandableNodeIds = frontierNodeIds.filter((entry) => !expandedNodeIds.has(entry));
      if (expandableNodeIds.length === 0) {
        break;
      }

      expandableNodeIds.forEach((entry) => expandedNodeIds.add(entry));
      const incidentEdges = selectIncidentEdgeRows(this.database, expandableNodeIds);
      const adjacencyByNodeId = new Map<string, EdgeRow[]>();
      const expandableNodeIdSet = new Set(expandableNodeIds);

      for (const edge of incidentEdges) {
        for (const endpointNodeId of [edge.from_node_id, edge.to_node_id]) {
          if (!expandableNodeIdSet.has(endpointNodeId)) {
            continue;
          }

          const existing = adjacencyByNodeId.get(endpointNodeId) ?? [];
          existing.push(edge);
          adjacencyByNodeId.set(endpointNodeId, existing);
        }
      }

      for (const sourceNodeId of expandableNodeIds) {
        const sourceState = bestPaths.get(sourceNodeId);
        const sourceAggregateWeight = sourceState?.aggregateWeight ?? 0;

        for (const edge of adjacencyByNodeId.get(sourceNodeId) ?? []) {
          const targetNodeId =
            edge.from_node_id === sourceNodeId ? edge.to_node_id : edge.from_node_id;
          if (targetNodeId === nodeId) {
            continue;
          }

          const nextDepth = depth + 1;
          const nextAggregateWeight = sourceAggregateWeight + Number(edge.weight ?? 0);
          const existingTargetState = bestPaths.get(targetNodeId);

          if (
            existingTargetState &&
            (existingTargetState.depth < nextDepth ||
              (existingTargetState.depth === nextDepth &&
                existingTargetState.aggregateWeight >= nextAggregateWeight))
          ) {
            continue;
          }

          bestPaths.set(targetNodeId, {
            prevNodeId: sourceNodeId,
            edge,
            depth: nextDepth,
            aggregateWeight: nextAggregateWeight
          });

          if (nextDepth < maxDepth) {
            nextFrontierNodeIds.add(targetNodeId);
          }
        }
      }

      frontierNodeIds = [...nextFrontierNodeIds];
    }

    const nodeRows = selectGraphNodeRows(
      this.database,
      [nodeId, ...bestPaths.keys()],
      nodeId
    );
    const nodeById = new Map(nodeRows.map((row) => [row.id, toNodeSummary(row)] as const));
    const allCandidatePaths: GraphTracePath[] = [];

    for (const [targetNodeId, traceState] of bestPaths.entries()) {
      const targetNode = nodeById.get(targetNodeId);
      if (!targetNode) {
        continue;
      }

      const reversedNodes: GraphNodeSummary[] = [targetNode];
      const reversedEdges: GraphEdgeSummary[] = [];
      let cursorNodeId = targetNodeId;
      let cursorState: typeof traceState | null = traceState;
      let isValidPath = true;

      while (cursorState) {
        const previousNode = nodeById.get(cursorState.prevNodeId);
        if (!previousNode) {
          isValidPath = false;
          break;
        }

        reversedNodes.push(previousNode);
        reversedEdges.push(toEdgeSummary(cursorState.edge));
        cursorNodeId = cursorState.prevNodeId;
        cursorState = bestPaths.get(cursorNodeId) ?? null;
      }

      if (!isValidPath || reversedNodes[reversedNodes.length - 1]?.id !== nodeId) {
        continue;
      }

      allCandidatePaths.push({
        targetNode,
        nodes: reversedNodes.reverse(),
        edges: reversedEdges.reverse(),
        hopCount: traceState.depth,
        aggregateWeight: traceState.aggregateWeight
      });
    }

    allCandidatePaths.sort((left, right) => {
      if (left.hopCount !== right.hopCount) {
        return left.hopCount - right.hopCount;
      }
      if (left.aggregateWeight !== right.aggregateWeight) {
        return right.aggregateWeight - left.aggregateWeight;
      }
      const typeComparison = compareGraphTraceType(
        left.targetNode.nodeType,
        right.targetNode.nodeType
      );
      if (typeComparison !== 0) {
        return typeComparison;
      }
      return left.targetNode.displayName.localeCompare(right.targetNode.displayName);
    });

    const targetTypeCountMap = new Map<string, number>();
    const groupedByType = new Map<string, GraphTracePath[]>();

    for (const path of allCandidatePaths) {
      targetTypeCountMap.set(
        path.targetNode.nodeType,
        (targetTypeCountMap.get(path.targetNode.nodeType) ?? 0) + 1
      );
      const existing = groupedByType.get(path.targetNode.nodeType) ?? [];
      existing.push(path);
      groupedByType.set(path.targetNode.nodeType, existing);
    }

    const selectedPaths: GraphTracePath[] = [];
    const orderedTypeKeys = [...groupedByType.keys()].sort(compareGraphTraceType);
    let roundIndex = 0;

    while (selectedPaths.length < pathLimit) {
      let added = false;
      for (const typeKey of orderedTypeKeys) {
        const candidate = groupedByType.get(typeKey)?.[roundIndex];
        if (!candidate) {
          continue;
        }

        selectedPaths.push(candidate);
        added = true;
        if (selectedPaths.length >= pathLimit) {
          break;
        }
      }

      if (!added) {
        break;
      }

      roundIndex += 1;
    }

    return {
      centerNodeId: nodeId,
      centerNode,
      generatedAt,
      maxDepth,
      pathLimit,
      totalCandidateCount: allCandidatePaths.length,
      truncated: allCandidatePaths.length > selectedPaths.length,
      targetTypeCounts: [...targetTypeCountMap.entries()]
        .map(([key, count]) => ({ key, count }))
        .sort((left, right) => {
          const typeComparison = compareGraphTraceType(left.key, right.key);
          if (typeComparison !== 0) {
            return typeComparison;
          }
          return right.count - left.count;
        }),
      paths: selectedPaths
    };
  }
}
