import type {
  RemoteMarketplaceCatalog,
  RemoteMarketplaceCollection,
  RemoteMarketplaceSkill
} from "../shared/types";

const collections: RemoteMarketplaceCollection[] = [
  { key: "featured", label: "Featured", labelZh: "精选", count: 18, tone: "marketplace" },
  { key: "trending", label: "Trending", labelZh: "趋势", count: 42, tone: "workflow" },
  { key: "verified", label: "Verified", labelZh: "已验证", count: 27, tone: "agent" },
  { key: "enterprise", label: "Enterprise", labelZh: "企业", count: 11, tone: "project" },
  { key: "recent", label: "Recently Updated", labelZh: "最近更新", count: 33, tone: "skill" },
  { key: "installed", label: "Most Installed", labelZh: "安装最多", count: 64, tone: "bundle" }
];

const catalog: RemoteMarketplaceSkill[] = [
  {
    id: "repo-skill-import",
    name: "Repo Skill Import",
    description: "Detect manifests and Skill files from a GitHub repository.",
    descriptionZh: "从 GitHub 仓库检测清单和 Skill 文件。",
    author: "open-source",
    source: "GitHub",
    sourceUrl: "https://github.com/example/repo-skill-import",
    tags: ["import", "manifest", "risk"],
    downloadsLabel: "12.4k",
    ratingLabel: "4.7",
    healthScore: 84,
    trustScore: 72,
    riskLabel: "Medium",
    riskLabelZh: "中",
    dependencyCount: 3,
    updatedLabel: "2 days ago",
    updatedLabelZh: "2 天前",
    verificationStatus: "review_required",
    statusLabel: "Risk check required",
    statusLabelZh: "需要风险检查",
    collectionKeys: ["featured", "recent"]
  },
  {
    id: "marketplace-verified",
    name: "Marketplace Verified",
    description: "Curated Skill package with verification metadata.",
    descriptionZh: "带验证元数据的精选 Skill 包。",
    author: "Skill Market",
    source: "Marketplace",
    sourceUrl: "skill-market://verified/marketplace-verified",
    tags: ["verified", "starter", "safe"],
    downloadsLabel: "8.9k",
    ratingLabel: "4.9",
    healthScore: 94,
    trustScore: 91,
    riskLabel: "Low",
    riskLabelZh: "低",
    dependencyCount: 1,
    updatedLabel: "Today",
    updatedLabelZh: "今天",
    verificationStatus: "verified",
    statusLabel: "Activation required",
    statusLabelZh: "需要激活",
    collectionKeys: ["featured", "verified", "installed"]
  },
  {
    id: "trending-automation",
    name: "Trending Automation",
    description: "Popular automation Skill ready for preview and analysis.",
    descriptionZh: "热门自动化 Skill，可预览和分析。",
    author: "community",
    source: "Marketplace",
    sourceUrl: "skill-market://trending/trending-automation",
    tags: ["workflow", "agent", "popular"],
    downloadsLabel: "5.1k",
    ratingLabel: "4.6",
    healthScore: 76,
    trustScore: 68,
    riskLabel: "Review",
    riskLabelZh: "需审查",
    dependencyCount: 5,
    updatedLabel: "6 days ago",
    updatedLabelZh: "6 天前",
    verificationStatus: "review_required",
    statusLabel: "Preview only",
    statusLabelZh: "仅预览",
    collectionKeys: ["trending"]
  }
];

function nowIso() {
  return new Date().toISOString();
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function skillMatchesQuery(skill: RemoteMarketplaceSkill, query: string) {
  if (!query) {
    return true;
  }

  const searchable = [
    skill.name,
    skill.description,
    skill.descriptionZh,
    skill.author,
    skill.source,
    skill.riskLabel,
    skill.riskLabelZh,
    skill.statusLabel,
    skill.statusLabelZh,
    ...skill.tags
  ]
    .join(" ")
    .toLowerCase();

  return normalize(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => searchable.includes(term));
}

export class MarketplaceService {
  listCatalog(query = ""): RemoteMarketplaceCatalog {
    const normalizedQuery = query.trim();
    return {
      generatedAt: nowIso(),
      query: normalizedQuery,
      sourceMode: "bundled_local_catalog",
      collections,
      skills: catalog.filter((skill) => skillMatchesQuery(skill, normalizedQuery))
    };
  }

  getSkill(skillId: string) {
    return catalog.find((skill) => skill.id === skillId) ?? null;
  }
}
