FROM node:22-bookworm-slim AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /app
COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM build AS api
ENV NODE_ENV=production
CMD ["node", "apps/api/dist/main.js"]

FROM build AS runner
ENV NODE_ENV=production
CMD ["node", "apps/runner/dist/main.js"]

FROM build AS dashboard
ENV NODE_ENV=production
CMD ["pnpm", "--filter", "@soroslo/dashboard", "start", "--hostname", "0.0.0.0", "--port", "3000"]
