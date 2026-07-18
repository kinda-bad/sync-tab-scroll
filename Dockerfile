# syntax=docker/dockerfile:1

# Deployment target for Railway (infrastructure.md "Deployment (Railway +
# Terraform)"): one process serves the built client SPA, the song catalog,
# and the WebSocket upgrade on one port (server.ts already combines all
# three). packages/shared now has real runtime exports (e.g. walkSyllables,
# imported by pipeline's compiled dist), so its built dist/ is carried into
# the runtime stage automatically by `pnpm --filter server deploy`, which
# resolves transitive workspace deps into /app/server-deploy/node_modules.

FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Install first, from just the manifests, so dependency layers cache
# independently of source changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/pipeline/package.json packages/pipeline/package.json
# --ignore-scripts: the root package.json's `prepare` script
# (`git config core.hooksPath .githooks`) is a local-dev-only convenience
# with no meaning in a container build (no git binary, no .git present at
# this layer) — not a build requirement, so skipping lifecycle scripts
# entirely here is correct, not a workaround.
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .
RUN pnpm build

# pnpm's own idiomatic mechanism for a self-contained, deployable package
# directory (constitution Principle V) — resolves server's workspace
# dependency (packages/shared) and its real npm dependency (ws) into a
# standalone node_modules with no symlinks back to the monorepo's virtual
# store, unlike a plain `cp -r server/node_modules`. --legacy: this
# workspace hasn't opted into pnpm 10's injected-workspace-packages mode,
# and doing so repo-wide is a bigger change than this Dockerfile should
# make on its own.
# pnpm deploy has no --ignore-scripts flag of its own (unlike `pnpm
# install`) — it runs its own internal install in the target directory,
# which hits the same irrelevant root `prepare` script, so the same fix
# applies via the env var pnpm reads instead.
RUN npm_config_ignore_scripts=true pnpm --filter server deploy --legacy --prod /app/server-deploy

FROM node:22-slim AS runtime
WORKDIR /app/server
COPY --from=build /app/server-deploy ./
# server/src/config.ts's CLIENT_ROOT default ('../client/dist', relative to
# its own cwd) already matches this layout — no env var override needed
# for the Dockerfile's own default topology.
COPY --from=build /app/client/dist ../client/dist

ENV NODE_ENV=production
# server/src/config.ts's PORT default — Railway (and `docker run -e PORT=`)
# override this at runtime; EXPOSE here is documentation, not a binding.
EXPOSE 6080
CMD ["node", "dist/index.js"]
