import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  extractJsonFromAIResponse,
  safeParseAIResponse,
  parseAIWithFallback,
  formatZodIssuesForPrompt,
} from "../../shared/lib/ai/safe-ai-parser";

describe("Safe AI Response Parser & Zod Validation", () => {
  const TaskSuggestionSchema = z.object({
    title: z.string().min(1).max(100),
    description: z.string().optional(),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
    estimatedHours: z.coerce.number().min(0).max(100).default(1),
    tags: z.array(z.string()).default([]),
  });

  describe("extractJsonFromAIResponse", () => {
    it("handles direct parsed objects or non-string values", () => {
      const obj = { title: "Test task" };
      expect(extractJsonFromAIResponse(obj)).toEqual(obj);
    });

    it("extracts pure JSON string", () => {
      const jsonStr = '{"title": "Implement auth", "priority": "high"}';
      expect(extractJsonFromAIResponse(jsonStr)).toEqual({
        title: "Implement auth",
        priority: "high",
      });
    });

    it("extracts JSON wrapped in markdown code fence (```json ... ```)", () => {
      const raw = `Here is the suggestion:
\`\`\`json
{
  "title": "Refactor database",
  "priority": "medium",
  "estimatedHours": 4
}
\`\`\`
Hope this helps!`;
      expect(extractJsonFromAIResponse(raw)).toEqual({
        title: "Refactor database",
        priority: "medium",
        estimatedHours: 4,
      });
    });

    it("extracts JSON embedded inside conversational text without markdown tags", () => {
      const raw = `Sure! I have generated the following task: {"title": "Setup CI/CD", "priority": "high"} - let me know if you need more.`;
      expect(extractJsonFromAIResponse(raw)).toEqual({
        title: "Setup CI/CD",
        priority: "high",
      });
    });

    it("returns raw input safely if it is completely unparseable text", () => {
      const raw = "I am unable to fulfill this request.";
      expect(extractJsonFromAIResponse(raw)).toBe("I am unable to fulfill this request.");
    });
  });

  describe("safeParseAIResponse", () => {
    it("safely validates well-formed AI response and applies defaults", () => {
      const raw = JSON.stringify({
        title: "Design Landing Page",
      });

      const result = safeParseAIResponse(TaskSuggestionSchema, raw);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          title: "Design Landing Page",
          priority: "medium",
          estimatedHours: 1,
          tags: [],
        });
      }
    });

    it("strips hallucinated or unexpected properties preventing DB pollution", () => {
      const raw = JSON.stringify({
        title: "Clean database",
        hallucinatedField: "Dangerous value",
        adminPrivileges: true,
        nestedGarbage: { foo: "bar" },
      });

      const result = safeParseAIResponse(TaskSuggestionSchema, raw);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty("hallucinatedField");
        expect(result.data).not.toHaveProperty("adminPrivileges");
        expect(result.data).not.toHaveProperty("nestedGarbage");
        expect(result.data.title).toBe("Clean database");
      }
    });

    it("coerces string numbers to actual numbers safely", () => {
      const raw = `\`\`\`json
{
  "title": "Fix memory leak",
  "estimatedHours": "3.5"
}
\`\`\``;

      const result = safeParseAIResponse(TaskSuggestionSchema, raw);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.estimatedHours).toBe(3.5);
      }
    });

    it("safely catches invalid types without throwing runtime exceptions", () => {
      const raw = `\`\`\`json
{
  "title": "",
  "priority": "ultra-urgent"
}
\`\`\``;

      const result = safeParseAIResponse(TaskSuggestionSchema, raw);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.length).toBeGreaterThan(0);
        expect(result.formattedError).toContain('Field "title"');
        expect(result.formattedError).toContain('Field "priority"');
      }
    });

    it("safely catches catastrophic unparseable outputs", () => {
      const raw = "500 Internal Server Error from LLM gateway";

      const result = safeParseAIResponse(TaskSuggestionSchema, raw);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe("parseAIWithFallback", () => {
    const fallbackTask = {
      title: "Default Task",
      priority: "medium" as const,
      estimatedHours: 1,
      tags: [],
    };

    it("returns parsed data when valid", () => {
      const raw = JSON.stringify({ title: "Custom Task" });
      const result = parseAIWithFallback(TaskSuggestionSchema, raw, fallbackTask);

      expect(result.isFallback).toBe(false);
      expect(result.data.title).toBe("Custom Task");
    });

    it("returns fallback data gracefully without crashing when invalid", () => {
      const raw = "Invalid corrupted AI output";
      const result = parseAIWithFallback(TaskSuggestionSchema, raw, fallbackTask);

      expect(result.isFallback).toBe(true);
      expect(result.data).toEqual(fallbackTask);
      expect(result.error).toBeDefined();
    });
  });

  describe("formatZodIssuesForPrompt", () => {
    it("formats issues clearly for an LLM self-repair prompt", () => {
      const result = TaskSuggestionSchema.safeParse({
        title: "",
        priority: "invalid_priority",
        estimatedHours: -5,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const formatted = formatZodIssuesForPrompt(result.error);
        expect(formatted).toContain('Field "title"');
        expect(formatted).toContain('Field "priority"');
        expect(formatted).toContain('Field "estimatedHours"');
      }
    });
  });
});
