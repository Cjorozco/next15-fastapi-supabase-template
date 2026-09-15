import { describe, it, expect } from "vitest";
import {
  AiProjectSchema,
  validateAiProjectResponse,
} from "../../domains/projects/schemas/ai-project.schema";

describe("AiProjectSchema & Client Validation Boundary", () => {
  const validAiPayload = {
    projectName: "SaaS Analytics Dashboard",
    description: "Build an MVP dashboard for user metrics",
    tasks: [
      { title: "Define KPI metrics", position: 0 },
      { title: "Connect database", position: 1 },
      { title: "Implement charts", position: 2 },
    ],
  };

  it("successfully parses a valid AI project response", () => {
    const result = AiProjectSchema.safeParse(validAiPayload);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.projectName).toBe("SaaS Analytics Dashboard");
      expect(result.data.description).toBe("Build an MVP dashboard for user metrics");
      expect(result.data.tasks).toHaveLength(3);
      expect(result.data.tasks[0].position).toBe(0);
    }
  });

  it("intercepts and parses response wrapped in markdown code blocks", () => {
    const rawMarkdown = `Here is the generated project plan:
\`\`\`json
{
  "projectName": "AI Task Manager",
  "description": "Smart productivity tool",
  "tasks": [
    { "title": "Setup repository", "position": 0 },
    { "title": "Implement Zod schemas", "position": 1 }
  ]
}
\`\`\`
Let me know if you need more tasks!`;

    const result = validateAiProjectResponse(rawMarkdown);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.projectName).toBe("AI Task Manager");
      expect(result.data.tasks).toHaveLength(2);
    }
  });

  it("rejects project with projectName less than 3 characters", () => {
    const invalidPayload = {
      ...validAiPayload,
      projectName: "AB",
    };

    const result = AiProjectSchema.safeParse(invalidPayload);

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("projectName"));
      expect(issue?.message).toContain("al menos 3 caracteres");
    }
  });

  it("rejects project with empty tasks array (min 1 required)", () => {
    const invalidPayload = {
      ...validAiPayload,
      tasks: [],
    };

    const result = AiProjectSchema.safeParse(invalidPayload);

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("tasks"));
      expect(issue?.message).toContain("al menos 1 tarea");
    }
  });

  it("rejects project with more than 10 tasks (max 10 constraint)", () => {
    const invalidPayload = {
      ...validAiPayload,
      tasks: Array.from({ length: 11 }, (_, i) => ({
        title: `Task #${i + 1}`,
        position: i,
      })),
    };

    const result = AiProjectSchema.safeParse(invalidPayload);

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("tasks"));
      expect(issue?.message).toContain("más de 10 tareas");
    }
  });

  it("coerces string positions to integers safely", () => {
    const payloadWithStrings = {
      projectName: "Mobile App Redesign",
      description: "UX overhaul",
      tasks: [
        { title: "Wireframes", position: "0" },
        { title: "Figma prototypes", position: "1" },
      ],
    };

    const result = AiProjectSchema.safeParse(payloadWithStrings);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tasks[0].position).toBe(0);
      expect(typeof result.data.tasks[0].position).toBe("number");
      expect(result.data.tasks[1].position).toBe(1);
    }
  });

  it("strips unexpected hallucinated properties preventing injection into Convex", () => {
    const payloadWithInjections = {
      ...validAiPayload,
      ownerId: "fake_user_id_from_ai",
      _id: "fake_doc_id",
      maliciousScript: "<script>alert(1)</script>",
      tasks: [
        {
          title: "Setup API",
          position: 0,
          isAdmin: true,
          internalToken: "secret_leak",
        },
      ],
    };

    const result = AiProjectSchema.safeParse(payloadWithInjections);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("ownerId");
      expect(result.data).not.toHaveProperty("_id");
      expect(result.data).not.toHaveProperty("maliciousScript");
      expect(result.data.tasks[0]).not.toHaveProperty("isAdmin");
      expect(result.data.tasks[0]).not.toHaveProperty("internalToken");
    }
  });
});
