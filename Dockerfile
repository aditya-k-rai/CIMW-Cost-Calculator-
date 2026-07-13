# Step 1: Base builder image
FROM node:22-alpine AS builder
WORKDIR /app

# Install build dependencies for compiling native node C++ modules (like better-sqlite3)
RUN apk add --no-cache python3 make g++

# Copy monorepo configuration and package dependency maps
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install complete dependencies including devDependencies (needed for tsc build compile)
RUN npm ci

# Copy source code
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared/
COPY apps/api ./apps/api/

# Compile package builds and generate Prisma clients
RUN npm run build --workspace @cost-calculator/shared
RUN npm run build --workspace @cost-calculator/api

# Step 2: Production runner image
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install C++ runtime libraries for better-sqlite3
RUN apk add --no-cache libstdc++

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install only production workspace dependencies
RUN npm ci --omit=dev

# Copy build output from the builder stage
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Cloud Run binds to port 8080 by default
EXPOSE 8080
ENV PORT=8080

# Auto-apply database schema migrations and launch NestJS API
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node apps/api/dist/main.js"]
