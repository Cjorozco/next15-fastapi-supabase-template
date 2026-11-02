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
      { title: "Define KPI metrics", position: 0, noDeadline: true },
      { title: "Connect database", position: 1, noDeadline: true },
      { title: "Implement charts", position: 2, noDeadline: true },
      { title: "Deploy preview", position: 3, noDeadline: true },
    ],
  };

  it("successfully parses a valid AI project response", () => {
    const result = AiProjectSchema.safeParse(validAiPayload);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.projectName).toBe("SaaS Analytics Dashboard");
      expect(result.data.description).toBe("Build an MVP dashboard for user metrics");
      expect(result.data.tasks).toHaveLength(4);
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
    { "title": "Setup repository", "position": 0, "noDeadline": true },
    { "title": "Implement Zod schemas", "position": 1, "noDeadline": true },
    { "title": "Write tests", "position": 2, "noDeadline": true },
    { "title": "Ship", "position": 3, "noDeadline": true }
  ]
}
\`\`\`
Let me know if you need more tasks!`;

    const result = validateAiProjectResponse(rawMarkdown);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.projectName).toBe("AI Task Manager");
      expect(result.data.tasks).toHaveLength(4);
    }
  });

  it("rejects project with projectName less than 3 characters", () => {
    const result = AiProjectSchema.safeParse({ ...validAiPayload, projectName: "AB" });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("projectName"));
      expect(issue?.message).toContain("al menos 3 caracteres");
    }
  });

  it("rejects a project with no tasks", () => {
    const result = AiProjectSchema.safeParse({ ...validAiPayload, tasks: [] });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("tasks"));
      expect(issue?.message).toContain("al menos 1 tarea");
    }
  });

  it("accepts a single task: one recurring habit does not need padding", () => {
    const result = AiProjectSchema.safeParse({
      projectName: "Inglés diario",
      tasks: [
        {
          title: "Practicar inglés",
          estimatedHours: 0.17,
          noDeadline: true,
          recurrence: "diaria",
          subtasks: ["Vocabulario", "Pronunciación", "Podcast corto"],
          notes: "Rota el foco cada día",
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tasks).toHaveLength(1);
      expect(result.data.tasks[0]).toMatchObject({
        estimatedHours: 0.1667,
        recurrence: "diaria",
        subtasks: ["Vocabulario", "Pronunciación", "Podcast corto"],
        notes: "Rota el foco cada día",
      });
    }
  });

  it("cleans subtasks and notes instead of failing on them", () => {
    const result = AiProjectSchema.safeParse({
      projectName: "Inglés diario",
      tasks: [
        {
          title: "Practicar",
          noDeadline: true,
          subtasks: ["  A  ", "", 5, ...Array.from({ length: 12 }, (_, i) => `S${i}`)],
          notes: 42,
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const [task] = result.data.tasks;
      expect(task.subtasks).toHaveLength(8);
      expect(task.subtasks![0]).toBe("A");
      expect(task.notes).toBeUndefined();
    }
  });

  it("rejects project with more than 8 tasks", () => {
    const result = AiProjectSchema.safeParse({
      ...validAiPayload,
      tasks: Array.from({ length: 9 }, (_, i) => ({ title: `Task #${i + 1}`, position: i, noDeadline: true })),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("tasks"));
      expect(issue?.message).toContain("más de 8 tareas");
    }
  });

  it("coerces string positions to integers safely", () => {
    const result = AiProjectSchema.safeParse({
      projectName: "Mobile App Redesign",
      description: "UX overhaul",
      tasks: [
        { title: "Wireframes", position: "0", noDeadline: true },
        { title: "Figma prototypes", position: "1", noDeadline: true },
        { title: "User testing", position: "2", noDeadline: true },
        { title: "Handoff", position: "3", noDeadline: true },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data.tasks[0].position).toBe("number");
      expect(result.data.tasks[1].position).toBe(1);
    }
  });

  it("strips unexpected hallucinated properties preventing injection into Convex", () => {
    const result = AiProjectSchema.safeParse({
      ...validAiPayload,
      ownerId: "fake_user_id_from_ai",
      _id: "fake_doc_id",
      maliciousScript: "<script>alert(1)</script>",
      tasks: [
        { title: "Setup API", position: 0, noDeadline: true, isAdmin: true, internalToken: "secret_leak" },
        ...validAiPayload.tasks.slice(1),
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("ownerId");
      expect(result.data).not.toHaveProperty("_id");
      expect(result.data).not.toHaveProperty("maliciousScript");
      expect(result.data.tasks[0]).not.toHaveProperty("isAdmin");
      expect(result.data.tasks[0]).not.toHaveProperty("internalToken");
    }
  });

  describe("task planning fields", () => {
    const withFirstTask = (task: Record<string, unknown>) => ({
      ...validAiPayload,
      tasks: [{ title: "Primera", noDeadline: true, ...task }, ...validAiPayload.tasks.slice(1)],
    });

    it("keeps valid priority, hours and date", () => {
      const result = AiProjectSchema.safeParse(
        withFirstTask({ priority: "alta", estimatedHours: 1.5, dueDate: "2026-03-15" })
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tasks[0]).toMatchObject({
          priority: "alta",
          estimatedHours: 1.5,
          dueDate: "2026-03-15",
        });
      }
    });

    it("maps priority aliases and coerces numeric strings", () => {
      const result = AiProjectSchema.safeParse(
        withFirstTask({ priority: "High", estimatedHours: "2" })
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tasks[0].priority).toBe("alta");
        expect(result.data.tasks[0].estimatedHours).toBe(2);
      }
    });

    it("drops invalid planning values instead of failing the whole response", () => {
      const result = AiProjectSchema.safeParse(
        withFirstTask({ priority: "urgentísima", estimatedHours: -3, dueDate: "2026-02-31" })
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tasks[0].priority).toBeUndefined();
        expect(result.data.tasks[0].estimatedHours).toBeUndefined();
        expect(result.data.tasks[0].dueDate).toBeUndefined();
      }
    });

    it("assigns positions from the array order", () => {
      const result = AiProjectSchema.safeParse(withFirstTask({ position: 9 }));
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tasks.map((t) => t.position)).toEqual([0, 1, 2, 3]);
      }
    });
  });

  describe("date or no deadline", () => {
    const only = (task: Record<string, unknown>) => ({
      ...validAiPayload,
      tasks: [{ title: "Primera", ...task }, ...validAiPayload.tasks.slice(1)],
    });

    it("rejects a task with neither a date nor noDeadline and names the field", () => {
      const result = AiProjectSchema.safeParse(only({}));
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.join(".") === "tasks.0.dueDate");
        expect(issue?.message).toContain("dueDate");
        expect(issue?.message).toContain("noDeadline");
      }
    });

    it("rejects a task whose only date is invalid", () => {
      expect(AiProjectSchema.safeParse(only({ dueDate: "2026-02-31" })).success).toBe(false);
    });

    it("accepts a task with only a date or only the flag", () => {
      expect(AiProjectSchema.safeParse(only({ dueDate: "2030-03-15" })).success).toBe(true);
      const flagged = AiProjectSchema.safeParse(only({ noDeadline: true }));
      expect(flagged.success).toBe(true);
      if (flagged.success) expect(flagged.data.tasks[0].noDeadline).toBe(true);
    });

    it("keeps the date and drops the flag when the model sends both", () => {
      const result = AiProjectSchema.safeParse(only({ dueDate: "2030-03-15", noDeadline: true }));
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tasks[0].dueDate).toBe("2030-03-15");
        expect(result.data.tasks[0].noDeadline).toBeUndefined();
      }
    });

    it("only accepts a real true as the flag", () => {
      expect(AiProjectSchema.safeParse(only({ noDeadline: "yes" })).success).toBe(false);
      expect(AiProjectSchema.safeParse(only({ noDeadline: "true" })).success).toBe(true);
    });
  });

  it("limits the description to two sentences", () => {
    const result = AiProjectSchema.safeParse({
      ...validAiPayload,
      description: "Primera frase. Segunda frase! Tercera frase que sobra. Cuarta.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe("Primera frase. Segunda frase!");
    }
  });
});
