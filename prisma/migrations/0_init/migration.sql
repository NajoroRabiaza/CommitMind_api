CREATE TABLE "User" (
  "id"          SERIAL PRIMARY KEY,
  "githubId"    TEXT NOT NULL UNIQUE,
  "username"    TEXT NOT NULL,
  "email"       TEXT,
  "avatarUrl"   TEXT,
  "accessToken" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Repository" (
  "id"           SERIAL PRIMARY KEY,
  "githubId"     INTEGER NOT NULL UNIQUE,
  "name"         TEXT NOT NULL,
  "fullName"     TEXT NOT NULL,
  "description"  TEXT,
  "private"      BOOLEAN NOT NULL DEFAULT false,
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId"       INTEGER NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User"("id")
);

CREATE TABLE "Commit" (
  "id"           SERIAL PRIMARY KEY,
  "sha"          TEXT NOT NULL UNIQUE,
  "message"      TEXT NOT NULL,
  "authorName"   TEXT NOT NULL,
  "authorEmail"  TEXT NOT NULL,
  "committedAt"  TIMESTAMP(3) NOT NULL,
  "url"          TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "repositoryId" INTEGER NOT NULL,
  FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id")
);

CREATE TABLE "CommitFile" (
  "id"        SERIAL PRIMARY KEY,
  "filename"  TEXT NOT NULL,
  "status"    TEXT NOT NULL,
  "additions" INTEGER NOT NULL DEFAULT 0,
  "deletions" INTEGER NOT NULL DEFAULT 0,
  "patch"     TEXT,
  "commitId"  INTEGER NOT NULL,
  FOREIGN KEY ("commitId") REFERENCES "Commit"("id")
);

CREATE TABLE "Concept" (
  "id"          SERIAL PRIMARY KEY,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId"      INTEGER NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User"("id")
);

CREATE TABLE "CommitConcept" (
  "id"        SERIAL PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "commitId"  INTEGER NOT NULL,
  "conceptId" INTEGER NOT NULL,
  FOREIGN KEY ("commitId") REFERENCES "Commit"("id"),
  FOREIGN KEY ("conceptId") REFERENCES "Concept"("id"),
  UNIQUE ("commitId", "conceptId")
);