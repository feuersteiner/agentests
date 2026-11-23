import { db } from "./db";

export type EventType = "post.created" | "post.published" | "user.signed_up";

export async function recordEvent(userId: number, type: EventType, payload: object) {
  return db.event.create({ data: { userId, type, payload } });
}
