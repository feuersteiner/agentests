import { db } from "./db";
import { normalizeEmail } from "./lib/email";

export async function signUp(email: string, displayName: string) {
  return db.user.create({
    data: { email: normalizeEmail(email), displayName: displayName.trim() },
  });
}

export async function findUserByEmail(email: string) {
  return db.user.findUnique({ where: { email: normalizeEmail(email) } });
}

export async function updateBio(userId: bigint, bio: string) {
  return db.user.update({ where: { id: userId }, data: { bio } });
}
