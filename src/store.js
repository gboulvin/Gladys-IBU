// -----------------------------------------------------------------------------
// Tiny persistent memory, so a restart never fires the same scene event twice
// (a race reminder, a race result, a leader change).
//
// The container rootfs is read-only: the file lives under /data, the one
// writable volume (DATA_DIR overrides it for local runs). Losing it is not
// fatal: the integration simply re-learns the past without firing anything.
// -----------------------------------------------------------------------------

import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { createLogger } from '@gladysassistant/integration-sdk';

const logger = createLogger({ name: 'store' });

export const EMPTY_MEMORY = Object.freeze({
  version: 1,
  // Races already handled (results announced), and reminders already sent.
  finished: [],
  reminded: [],
  // Leader of each overall standing, keyed `<level>:<gender>`.
  leaders: {},
  // False until the first successful refresh: that one only learns the past.
  initialized: false,
});

// Bounded lists: a season has ~100 races per level.
const MAX_IDS = 500;

export function createMemory(raw = {}) {
  return {
    ...EMPTY_MEMORY,
    ...raw,
    finished: Array.isArray(raw.finished) ? raw.finished.slice(-MAX_IDS) : [],
    reminded: Array.isArray(raw.reminded) ? raw.reminded.slice(-MAX_IDS) : [],
    leaders: raw.leaders && typeof raw.leaders === 'object' ? { ...raw.leaders } : {},
    initialized: raw.initialized === true,
  };
}

export function rememberId(list, id) {
  if (!list.includes(id)) {
    list.push(id);
    if (list.length > MAX_IDS) {
      list.splice(0, list.length - MAX_IDS);
    }
  }
}

/** File-backed store. `load()` never throws; `save()` logs and moves on. */
export class FileStore {
  constructor(file = path.join(process.env.DATA_DIR ?? '/data', 'biathlon-ibu.json')) {
    this.file = file;
  }

  async load() {
    try {
      return createMemory(JSON.parse(await readFile(this.file, 'utf8')));
    } catch (err) {
      if (err.code !== 'ENOENT') {
        logger.warn(`Cannot read ${this.file}, starting from scratch: ${err.message}`);
      }
      return createMemory();
    }
  }

  async save(memory) {
    try {
      await mkdir(path.dirname(this.file), { recursive: true });
      // Write then rename: a crash mid-write never leaves a truncated file.
      const tmp = `${this.file}.tmp`;
      await writeFile(tmp, JSON.stringify(memory));
      await rename(tmp, this.file);
    } catch (err) {
      logger.warn(`Cannot write ${this.file}: ${err.message}`);
    }
  }
}

/** In-memory store, for the tests. */
export class MemoryStore {
  constructor(initial = {}) {
    this.memory = createMemory(initial);
    this.saves = 0;
  }

  async load() {
    return createMemory(structuredClone(this.memory));
  }

  async save(memory) {
    this.memory = structuredClone(memory);
    this.saves += 1;
  }
}
