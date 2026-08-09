import "server-only";

const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const REF_PATTERN = /^[A-Za-z0-9._/-]+$/;

export type GitHubIngestionConfig = {
  repository: string;
  ref: string;
  token: string;
  workflowUrl: string;
};

export function getGitHubIngestionConfig():
  | { ok: true; config: GitHubIngestionConfig }
  | { ok: false; workflowUrl: string | null } {
  const repository =
    process.env.GITHUB_REPOSITORY ||
    (process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG
      ? `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`
      : "");
  const ref = process.env.GITHUB_ACTIONS_REF || "dev";
  const token = process.env.GITHUB_ACTIONS_TOKEN || "";
  const workflowUrl = REPOSITORY_PATTERN.test(repository)
    ? `https://github.com/${repository}/actions/workflows/ingest.yml`
    : null;

  if (
    !token ||
    !REPOSITORY_PATTERN.test(repository) ||
    !REF_PATTERN.test(ref) ||
    ref.includes("..")
  ) {
    return { ok: false, workflowUrl };
  }

  return {
    ok: true,
    config: {
      repository,
      ref,
      token,
      workflowUrl: workflowUrl!,
    },
  };
}
