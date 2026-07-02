-- RefreshToken: allow multiple concurrent sessions per user. Drop the unique
-- constraint on userId and replace it with a plain index (token stays the unique
-- lookup key; rotation/logout delete a single row by token).
DROP INDEX "RefreshToken_userId_key";
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- OtpCode: track failed verification attempts so a reset code is invalidated once
-- the attempt budget is spent — a 6-digit code can't be brute-forced within its TTL.
ALTER TABLE "OtpCode" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
