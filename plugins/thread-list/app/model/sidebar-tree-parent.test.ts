import { describe, expect, it } from "vitest";
import { makeSidebarThread } from "./fixtures.js";
import { createSidebarTreeParentResolver } from "./sidebar-tree-parent.js";

describe("createSidebarTreeParentResolver", () => {
  it("resolves a fork to its source", () => {
    const source = makeSidebarThread({ id: "source" });
    const fork = makeSidebarThread({
      id: "fork",
      sourceThreadId: "source",
      originKind: "fork",
    });

    const resolve = createSidebarTreeParentResolver([source, fork]);

    expect(resolve(fork)).toBe("source");
    expect(resolve(source)).toBeNull();
  });

  it("ignores a source on a thread that is not a fork", () => {
    const source = makeSidebarThread({ id: "source" });
    const sideChat = makeSidebarThread({
      id: "side-chat",
      sourceThreadId: "source",
      originKind: null,
    });

    const resolve = createSidebarTreeParentResolver([source, sideChat]);

    expect(resolve(sideChat)).toBeNull();
  });

  it("keeps the explicit parent when a fork's source was reparented under it", () => {
    const fork = makeSidebarThread({
      id: "fork",
      sourceThreadId: "source",
      originKind: "fork",
    });
    const source = makeSidebarThread({
      id: "source",
      parentThreadId: "fork",
    });

    const resolve = createSidebarTreeParentResolver([fork, source]);

    expect(resolve(source)).toBe("fork");
    expect(resolve(fork)).toBeNull();
  });

  it("breaks a cycle that runs through two fork links", () => {
    const forkA = makeSidebarThread({
      id: "fork-a",
      sourceThreadId: "middle",
      originKind: "fork",
    });
    const middle = makeSidebarThread({
      id: "middle",
      parentThreadId: "fork-b",
    });
    const forkB = makeSidebarThread({
      id: "fork-b",
      sourceThreadId: "fork-a",
      originKind: "fork",
    });
    const threads = [forkA, middle, forkB];

    const resolve = createSidebarTreeParentResolver(threads);
    const parentById = new Map(threads.map((t) => [t.id, resolve(t)]));

    const reachesRoot = (id: string): boolean => {
      const seen = new Set<string>();
      let current: string | null = id;
      while (current !== null) {
        if (seen.has(current)) return false;
        seen.add(current);
        current = parentById.get(current) ?? null;
      }
      return true;
    };
    for (const thread of threads) {
      expect(reachesRoot(thread.id)).toBe(true);
    }
  });
});
