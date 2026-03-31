import { evaluateCondition, evaluateAllConditions } from "@/lib/workflows/engine";

// ── evaluateCondition ──

describe("evaluateCondition", () => {
  describe("equals operator", () => {
    it("matches case-insensitively", () => {
      const result = evaluateCondition(
        { field: "priority", operator: "equals", value: "critical" },
        { priority: "CRITICAL" }
      );
      expect(result).toBe(true);
    });

    it("returns false on mismatch", () => {
      const result = evaluateCondition(
        { field: "priority", operator: "equals", value: "HIGH" },
        { priority: "LOW" }
      );
      expect(result).toBe(false);
    });
  });

  describe("not_equals operator", () => {
    it("returns true when values differ", () => {
      const result = evaluateCondition(
        { field: "status", operator: "not_equals", value: "CLOSED" },
        { status: "OPEN" }
      );
      expect(result).toBe(true);
    });

    it("returns false when values match (case-insensitive)", () => {
      const result = evaluateCondition(
        { field: "status", operator: "not_equals", value: "open" },
        { status: "OPEN" }
      );
      expect(result).toBe(false);
    });
  });

  describe("contains operator", () => {
    it("matches substring case-insensitively", () => {
      const result = evaluateCondition(
        { field: "description", operator: "contains", value: "urgent" },
        { description: "This is an URGENT matter" }
      );
      expect(result).toBe(true);
    });

    it("returns false when substring not found", () => {
      const result = evaluateCondition(
        { field: "description", operator: "contains", value: "critical" },
        { description: "This is fine" }
      );
      expect(result).toBe(false);
    });
  });

  describe("greater_than operator", () => {
    it("returns true when field > expected", () => {
      const result = evaluateCondition(
        { field: "score", operator: "greater_than", value: 5 },
        { score: 10 }
      );
      expect(result).toBe(true);
    });

    it("returns false when field <= expected", () => {
      const result = evaluateCondition(
        { field: "score", operator: "greater_than", value: 5 },
        { score: 3 }
      );
      expect(result).toBe(false);
    });

    it("returns false when field equals expected", () => {
      const result = evaluateCondition(
        { field: "score", operator: "greater_than", value: 5 },
        { score: 5 }
      );
      expect(result).toBe(false);
    });
  });

  describe("less_than operator", () => {
    it("returns true when field < expected", () => {
      const result = evaluateCondition(
        { field: "count", operator: "less_than", value: 10 },
        { count: 3 }
      );
      expect(result).toBe(true);
    });

    it("returns false when field >= expected", () => {
      const result = evaluateCondition(
        { field: "count", operator: "less_than", value: 10 },
        { count: 15 }
      );
      expect(result).toBe(false);
    });
  });

  describe("in operator", () => {
    it("matches when fieldValue is in an array", () => {
      const result = evaluateCondition(
        { field: "priority", operator: "in", value: ["HIGH", "CRITICAL"] },
        { priority: "CRITICAL" }
      );
      expect(result).toBe(true);
    });

    it("matches from comma-separated string", () => {
      const result = evaluateCondition(
        { field: "priority", operator: "in", value: "HIGH,CRITICAL" },
        { priority: "HIGH" }
      );
      expect(result).toBe(true);
    });

    it("matches case-insensitively in array", () => {
      const result = evaluateCondition(
        { field: "priority", operator: "in", value: ["high", "critical"] },
        { priority: "HIGH" }
      );
      expect(result).toBe(true);
    });

    it("returns false when value is not in the list", () => {
      const result = evaluateCondition(
        { field: "priority", operator: "in", value: ["HIGH", "CRITICAL"] },
        { priority: "LOW" }
      );
      expect(result).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("returns false for unknown operator", () => {
      const result = evaluateCondition(
        { field: "x", operator: "starts_with" as any, value: "a" },
        { x: "abc" }
      );
      expect(result).toBe(false);
    });

    it("handles undefined field value (missing field in data)", () => {
      const result = evaluateCondition(
        { field: "missing", operator: "equals", value: "something" },
        { other: "value" }
      );
      // String(undefined) = "undefined" !== "something"
      expect(result).toBe(false);
    });

    it("handles undefined field value with contains", () => {
      const result = evaluateCondition(
        { field: "missing", operator: "contains", value: "test" },
        {}
      );
      expect(result).toBe(false);
    });
  });
});

// ── evaluateAllConditions ──

describe("evaluateAllConditions", () => {
  it("returns true when conditions array is empty", () => {
    expect(evaluateAllConditions([], {})).toBe(true);
  });

  it("returns true when all conditions pass", () => {
    const conditions = [
      { field: "priority", operator: "equals" as const, value: "HIGH" },
      { field: "score", operator: "greater_than" as const, value: 5 },
    ];
    const data = { priority: "HIGH", score: 10 };
    expect(evaluateAllConditions(conditions, data)).toBe(true);
  });

  it("returns false when one condition fails", () => {
    const conditions = [
      { field: "priority", operator: "equals" as const, value: "HIGH" },
      { field: "score", operator: "greater_than" as const, value: 50 },
    ];
    const data = { priority: "HIGH", score: 10 };
    expect(evaluateAllConditions(conditions, data)).toBe(false);
  });

  it("returns false when all conditions fail", () => {
    const conditions = [
      { field: "priority", operator: "equals" as const, value: "HIGH" },
      { field: "status", operator: "equals" as const, value: "CLOSED" },
    ];
    const data = { priority: "LOW", status: "OPEN" };
    expect(evaluateAllConditions(conditions, data)).toBe(false);
  });

  it("returns true for null/undefined conditions (treated as empty)", () => {
    expect(evaluateAllConditions(null as any, {})).toBe(true);
    expect(evaluateAllConditions(undefined as any, {})).toBe(true);
  });
});
