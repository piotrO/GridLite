# Use the Playwright image for all stages to ensure binary compatibility (glibc, etc.)
FROM mcr.microsoft.com/playwright:v1.52.0-noble AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/docs/advanced-features/telemetry
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN addgroup --system --gid 1002 nodejs
RUN adduser --system --uid 1002 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Install externalized dependencies explicitly in the runner
# We externalized these in next.config.mjs, so they are not in the standalone build
# Skip browser download because we are using the playwright base image which already has them
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm install playwright @ghostery/adblocker-playwright sharp --legacy-peer-deps

USER nextjs

EXPOSE 3000

ENV PORT=3000
# set hostname to localhost
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
