-- Chat: messages and the reactions members leave on them.
create table "Message" (
  "id" bigserial primary key,
  "senderId" bigint not null references "User"("id"),
  "body" text not null,
  "editCount" integer not null default 0,
  "createdAt" timestamp(3) not null default current_timestamp
);

create index "Message_senderId_createdAt_idx" on "Message"("senderId", "createdAt");

create table "Reaction" (
  "id" bigserial primary key,
  "messageId" bigint not null references "Message"("id") on delete cascade,
  "userId" bigint not null references "User"("id"),
  "emoji" text not null,
  "createdAt" timestamp(3) not null default current_timestamp,
  unique ("messageId", "userId", "emoji")
);
