import type { SidebarThread } from "./sidebar-thread.js";

export type SidebarTreeParentResolver = (
  thread: SidebarThread,
) => string | null;

function getForkSourceId(thread: SidebarThread): string | null {
  return thread.originKind === "fork" ? thread.sourceThreadId : null;
}

function getCandidateParentId(thread: SidebarThread): string | null {
  return thread.parentThreadId ?? getForkSourceId(thread);
}

export function createSidebarTreeParentResolver(
  threads: readonly SidebarThread[],
): SidebarTreeParentResolver {
  const threadById = new Map(threads.map((thread) => [thread.id, thread]));
  const forkParentIdByThreadId = new Map<string, string | null>();

  const closesCycle = (thread: SidebarThread, sourceId: string): boolean => {
    let currentId: string | null = sourceId;
    let remainingHops = threadById.size;
    while (currentId !== null && remainingHops > 0) {
      if (currentId === thread.id) return true;
      const current = threadById.get(currentId);
      if (current === undefined) return false;
      currentId = getCandidateParentId(current);
      remainingHops -= 1;
    }
    return false;
  };

  const isPlacedAwayFromSource = (
    thread: SidebarThread,
    sourceId: string,
  ): boolean => {
    if (thread.sectionId === null) return false;
    const source = threadById.get(sourceId);
    return source !== undefined && source.sectionId !== thread.sectionId;
  };

  return (thread) => {
    if (thread.parentThreadId !== null) return thread.parentThreadId;
    const sourceId = getForkSourceId(thread);
    if (sourceId === null) return null;
    const cached = forkParentIdByThreadId.get(thread.id);
    if (cached !== undefined) return cached;
    const resolved =
      isPlacedAwayFromSource(thread, sourceId) || closesCycle(thread, sourceId)
        ? null
        : sourceId;
    forkParentIdByThreadId.set(thread.id, resolved);
    return resolved;
  };
}
