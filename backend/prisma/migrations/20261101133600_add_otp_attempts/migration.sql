-- Migration: Add attempts column to otp_codes table
ALTER TABLE "otp_codes" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;
