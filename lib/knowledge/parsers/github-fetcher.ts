import {
  GITHUB_IGNORE_PATTERNS,
  GITHUB_TEXT_EXTENSIONS,
  KNOWLEDGE_LIMITS,
} from "../types";

export type GithubFile = {
  path: string;
  content: string;
};

const GITHUB_REPO_RE =
  /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/;

export function parseGithubUrl(url: string): {
  owner: string;
  repo: string;
} | null {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:") return null;
    if (parsed.hostname !== "github.com") return null;
    // SSRF: reject credentials / weird hosts
    if (parsed.username || parsed.password) return null;
    const match = url.trim().match(GITHUB_REPO_RE);
    if (!match) return null;
    return { owner: match[1]!, repo: match[2]! };
  } catch {
    return null;
  }
}

export function shouldIngestGithubPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  if (GITHUB_IGNORE_PATTERNS.some((p) => normalized.includes(p))) {
    return false;
  }
  const lower = normalized.toLowerCase();
  return GITHUB_TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

type TreeItem = { path: string; type: string; size?: number };

/**
 * Fetch text files from a public GitHub repo via Contents/Git Trees API.
 * Does not execute repository code.
 */
export async function fetchPublicGithubFiles(
  repoUrl: string,
  options: { maxFiles?: number } = {},
): Promise<{ owner: string; repo: string; defaultBranch: string; files: GithubFile[] }> {
  const parsed = parseGithubUrl(repoUrl);
  if (!parsed) {
    throw new Error("Only public https://github.com/{owner}/{repo} URLs are supported");
  }

  const maxFiles = options.maxFiles ?? KNOWLEDGE_LIMITS.maxGithubFiles;
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "content-engine-knowledge",
  };

  const repoRes = await fetch(
    `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
    { headers },
  );
  if (repoRes.status === 404) {
    throw new Error("GitHub repository not found or not public");
  }
  if (!repoRes.ok) {
    throw new Error(`GitHub API error (${repoRes.status})`);
  }
  const repoJson = (await repoRes.json()) as {
    default_branch?: string;
    private?: boolean;
  };
  if (repoJson.private) {
    throw new Error("Private repositories are not supported yet");
  }
  const branch = repoJson.default_branch ?? "main";

  const treeRes = await fetch(
    `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${branch}?recursive=1`,
    { headers },
  );
  if (!treeRes.ok) {
    throw new Error(`Failed to list repository tree (${treeRes.status})`);
  }
  const treeJson = (await treeRes.json()) as { tree?: TreeItem[] };
  const candidates = (treeJson.tree ?? [])
    .filter((item) => item.type === "blob" && shouldIngestGithubPath(item.path))
    .filter((item) => (item.size ?? 0) < 400_000)
    .slice(0, maxFiles);

  const files: GithubFile[] = [];
  for (const item of candidates) {
    const rawUrl = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${branch}/${item.path}`;
    const fileRes = await fetch(rawUrl, { headers: { "User-Agent": "content-engine-knowledge" } });
    if (!fileRes.ok) continue;
    let content = await fileRes.text();
    if (content.length > KNOWLEDGE_LIMITS.maxFileChars) {
      content = content.slice(0, KNOWLEDGE_LIMITS.maxFileChars);
    }
    if (content.trim()) {
      files.push({ path: item.path, content });
    }
  }

  if (files.length === 0) {
    throw new Error("No ingestible text/code files found in repository");
  }

  return {
    owner: parsed.owner,
    repo: parsed.repo,
    defaultBranch: branch,
    files,
  };
}
