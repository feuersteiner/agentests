# Events

Every user action is stored in the `Event` table:

```sql
CREATE TABLE "Event" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "User"("id"),
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL
);
```
