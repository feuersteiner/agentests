import { randomBytes } from "node:crypto";

let counter = 0;

// Short ids that sort in creation order within a process, such as "prj_1".
export function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}_${counter}`;
}

export function newSecret(): string {
  return `trl_${randomBytes(18).toString("hex")}`;
}
