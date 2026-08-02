import { DefaultMemoryManager, type MemoryManager } from "./manager";
import { LocalMemoryStore } from "./local-store";
import { LOCAL_USER_ID } from "./types";

/**
 * Composition root — the ONLY module that binds MemoryManager → LocalMemoryStore.
 * Swap LocalMemoryStore here later (Postgres / Redis / vector) without touching pipeline.
 */
let singleton: MemoryManager | null = null;

export function createMemoryManager(
  store = new LocalMemoryStore(),
  userId = LOCAL_USER_ID,
): MemoryManager {
  return new DefaultMemoryManager(store, userId);
}

export function getMemoryManager(): MemoryManager {
  if (!singleton) {
    singleton = createMemoryManager();
  }
  return singleton;
}

/** Test helper — inject a fake MemoryManager or clear the singleton. */
export function setMemoryManager(manager: MemoryManager | null): void {
  singleton = manager;
}
