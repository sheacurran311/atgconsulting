#!/bin/bash
set -e
pnpm install --frozen-lockfile
# Prisma is the application's schema source. Do not push the unused, empty
# Drizzle schema or mutate a database automatically on merge.
pnpm --filter @workspace/api-server exec prisma generate
