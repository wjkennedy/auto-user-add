import api, { route } from "@forge/api";
import Resolver from "@forge/resolver";

const resolver = new Resolver();

// Calculates a simple Jaccard similarity between two text strings
function textSimilarity(a, b) {
  const wordsA = new Set(a.toLowerCase().split(/\W+/));
  const wordsB = new Set(b.toLowerCase().split(/\W+/));
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// Computes a composite Q-factor score using meta-state factors
function calculateQFactor(target, candidate) {
  const now = Date.now();
  const created = Date.parse(candidate.fields.created);
  const creationDays = (now - created) / (1000 * 60 * 60 * 24);
  const creationFactor = 1 / (1 + creationDays);

  const activity = candidate.fields.comment?.total || 0;
  const activityFactor = Math.min(activity, 10) / 10; // cap to keep 0-1

  const componentIds = candidate.fields.components?.map((c) => c.id) || [];
  const targetComponents = target.fields.components?.map((c) => c.id) || [];
  const componentFactor = targetComponents.some((id) => componentIds.includes(id))
    ? 1
    : 0;

  const textFactor = textSimilarity(
    target.fields.summary,
    candidate.fields.summary
  );

  return (creationFactor + activityFactor + componentFactor + textFactor) / 4;
}

// Fetches recent issues in the project that share similar components
async function findSimilarIssues(issue) {
  const projectKey = issue.fields.project.key;
  const componentIds = issue.fields.components?.map((c) => c.id) || [];
  let jql = `project = ${projectKey}`;
  if (componentIds.length) {
    jql += ` AND component in (${componentIds.join(",")})`;
  }
  jql += " order by created desc";

  const res = await api
    .asApp()
    .requestJira(
      route`/rest/api/3/search?jql=${encodeURIComponent(
        jql
      )}&maxResults=10&fields=summary,comment,created,reporter,components`
    );
  const data = await res.json();
  return data.issues.filter((i) => i.id !== issue.id);
}

// Adds a user to the project role
async function addUserToProject(projectId, roleId, accountId) {
  await api
    .asApp()
    .requestJira(route`/rest/api/3/project/${projectId}/role/${roleId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ user: [accountId] }),
    });
}

// Auto-assigns a user with the highest Q-factor derived from similar issues
resolver.define("autoAssign", async ({ payload }) => {
  const issue = payload.issue;
  const projectId = issue.fields.project.id;
  const roleId = "10002"; // Replace with your target role ID (e.g., Developer)

  try {
    const similar = await findSimilarIssues(issue);
    let targetAccount = issue.fields.reporter.accountId;

    if (similar.length) {
      const scored = similar.map((i) => ({
        accountId: i.fields.reporter.accountId,
        score: calculateQFactor(issue, i),
      }));
      scored.sort((a, b) => b.score - a.score);
      targetAccount = scored[0].accountId;
    }

    await addUserToProject(projectId, roleId, targetAccount);
    console.log(
      `Assigned ${targetAccount} to role ${roleId} in project ${projectId}`
    );
    return { success: true, accountId: targetAccount };
  } catch (error) {
    console.error("Assignment failed:", error);
    return { success: false, error: error.message };
  }
});

export const handler = resolver.getDefinitions();
