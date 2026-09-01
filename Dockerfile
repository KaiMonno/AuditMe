# AuditMe — single container running the Express API + built React frontend.
#
# Playwright needs its browser binary and OS-level system libraries present
# at runtime, which rules out typical buildpack-based static/Node hosting —
# hence a real Dockerfile rather than a platform's auto-detected build.
FROM node:22-slim

WORKDIR /app

# --- Root (API/CLI/engine) deps -----------------------------------------
# Copy just the manifests first so this layer (and the slow Playwright
# browser download) is cached across builds that only change source files.
COPY package.json package-lock.json ./
RUN npm ci

# Downloads the Chromium binary AND the OS-level packages it needs
# (fonts, codecs, etc.) — both are required at runtime, not just to build.
RUN npx playwright install --with-deps chromium

# --- Frontend deps + build -----------------------------------------------
COPY web/package.json web/package-lock.json ./web/
RUN npm --prefix web ci

COPY . .

# Builds web/dist — server/app.js serves it via express.static when
# present. Get this right rather than relying on the API-only fallback.
RUN npm run build

ENV NODE_ENV=production

# Documentation only — the platform tells the container which port to bind
# via $PORT at runtime (server/index.js already reads process.env.PORT).
EXPOSE 3001

CMD ["node", "server/index.js"]
