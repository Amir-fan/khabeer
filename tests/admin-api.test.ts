import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

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

describe("Admin Router", () => {
  it("should return dashboard stats", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.stats();

    expect(result).toHaveProperty("usersCount");
    expect(result).toHaveProperty("conversationsCount");
    expect(result).toHaveProperty("contractsCount");
    expect(result).toHaveProperty("stocksScreened");
    expect(typeof result.usersCount).toBe("number");
  });

  it("should return users list", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.users();

    expect(Array.isArray(result)).toBe(true);
  });

  it("should update system prompt", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.updateSystemPrompt({
      prompt: "Test system prompt",
    });

    expect(result).toHaveProperty("success");
    expect(result.success).toBe(true);
  });

  it("should return knowledge base documents", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.knowledgeBase();

    expect(Array.isArray(result)).toBe(true);
  });

  it("should return API keys list", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.apiKeys();

    expect(Array.isArray(result)).toBe(true);
  });

  it("should send notification", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.sendNotification({
      title: "Test Notification",
      body: "This is a test notification",
      target: "all",
    });

    expect(result).toHaveProperty("success");
    expect(result.success).toBe(true);
    expect(result).toHaveProperty("sentCount");
  });
});
