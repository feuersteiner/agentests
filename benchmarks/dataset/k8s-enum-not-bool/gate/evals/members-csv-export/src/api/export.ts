import { store } from "../store";
import type { ApiResponse } from "./types";

const HEADER = ["name", "email", "role", "verified", "added"];

function cell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function yesNo(value: boolean): string {
  return value ? "yes" : "no";
}

/** The members of a project as CSV, one row per member, for the export button. */
export function exportMembers(projectId: string): ApiResponse<string> {
  const project = store.projects.get(projectId);
  if (!project) {
    return { status: 404, body: { error: "project not found" } };
  }
  const rows = project.members.map((member) => {
    const user = store.users.get(member.userId);
    return [
      user?.name ?? "",
      user?.email ?? "",
      member.role,
      yesNo(user?.emailVerified ?? false),
      member.addedAt,
    ];
  });
  const lines = [HEADER, ...rows].map((row) => row.map(cell).join(","));
  return { status: 200, body: `${lines.join("\n")}\n` };
}
