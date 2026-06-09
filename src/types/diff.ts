export type DiffGranularity = 'semantic' | 'word' | 'char';

export type DiffTuple = [number, string] & { groupId?: string };

export type DiffSummary = {
  total: number;
  inserted: number;
  deleted: number;
  modified: number;
};
