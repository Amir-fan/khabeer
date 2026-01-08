import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

// Mock the LLM module
vi.mock("../server/_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    id: "test-id",
    created: Date.now(),
    model: "gemini-2.5-flash",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "هذا رد تجريبي من المستشار الذكي",
        },
        finish_reason: "stop",
      },
    ],
  }),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("AI Chat Router", () => {
  it("should return a reply for a valid chat message", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.chat({
      message: "ما حكم التأمين التجاري؟",
      context: "islamic_finance",
    });

    expect(result).toHaveProperty("reply");
    expect(result).toHaveProperty("sources");
    expect(typeof result.reply).toBe("string");
    expect(Array.isArray(result.sources)).toBe(true);
  });

  it("should handle empty message gracefully", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Empty message should fail validation
    await expect(
      caller.ai.chat({
        message: "",
        context: "general",
      })
    ).rejects.toThrow();
  });

  it("should use default context when not provided", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.chat({
      message: "سؤال عام",
    });

    expect(result).toHaveProperty("reply");
  });
});

describe("Stock Screening Router", () => {
  it("should screen a stock by symbol", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.screenStock({
      symbol: "AAPL",
      name: "Apple Inc.",
    });

    expect(result).toHaveProperty("complianceStatus");
    expect(result).toHaveProperty("complianceScore");
    expect(result).toHaveProperty("analysis");
  });

  it("should handle stock without name", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.screenStock({
      symbol: "2222",
    });

    expect(result).toHaveProperty("complianceStatus");
  });
});

describe("Contract Analysis Router", () => {
  it("should analyze a contract", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.analyzeContract({
      fileUrl: "https://example.com/contract.pdf",
      fileName: "contract.pdf",
    });

    expect(result).toHaveProperty("analysis");
    expect(result).toHaveProperty("complianceScore");
    expect(typeof result.complianceScore).toBe("number");
  });
});
