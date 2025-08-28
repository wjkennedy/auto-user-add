import api, { route } from "@forge/api";
import Resolver from "@forge/resolver";

const resolver = new Resolver();

// Auto-assigns the reporter of the issue to a specific project role
resolver.define("autoAssign", async ({ payload }) => {
  const projectId = payload.issue.fields.project.id;
  const accountId = payload.issue.fields.reporter.accountId;
  const roleId = "10002"; // Replace with your target role ID (e.g., Developer)

  try {
    const res = await api.asApp().requestJira(
      route\`/rest/api/3/project/\${projectId}/role/\${roleId}\`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({ user: [accountId] })
      }
    );
    console.log(\`Assigned \${accountId} to role \${roleId} in project \${projectId}\`);
    return { success: true };
  } catch (error) {
    console.error("Assignment failed:", error);
    return { success: false, error: error.message };
  }
});

export const handler = resolver.getDefinitions();
