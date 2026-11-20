import 'server-only';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

function numberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export const serverConfig = {
  get appBaseUrl() {
    return required('APP_BASE_URL').replace(/\/+$/, '');
  },
  get portalIssuer() {
    return required('PORTAL_OIDC_ISSUER').replace(/\/+$/, '');
  },
  get clientId() {
    return required('PORTAL_OIDC_CLIENT_ID');
  },
  get clientSecret() {
    return required('PORTAL_OIDC_CLIENT_SECRET');
  },
  get sessionSecret() {
    return required('SESSION_SECRET');
  },
  get musicAgentUrl() {
    return required('MUSIC_AGENT_URL').replace(/\/+$/, '');
  },
  get musicAgentToken() {
    return process.env.MUSIC_AGENT_TOKEN?.trim() || undefined;
  },
  get printAgentUrl() {
    return required('PRINT_AGENT_URL').replace(/\/+$/, '');
  },
  get printAgentToken() {
    return process.env.PRINT_AGENT_TOKEN?.trim() || undefined;
  },
  get printMaxFileBytes() {
    return numberFromEnv('PRINT_MAX_FILE_MB', 10) * 1024 * 1024;
  },
  get printCooldownSeconds() {
    return numberFromEnv('PRINT_COOLDOWN_SECONDS', 5);
  },
  get bambuAgentUrl() {
    return required('BAMBU_AGENT_URL').replace(/\/+$/, '');
  },
  get bambuAgentToken() {
    return process.env.BAMBU_AGENT_TOKEN?.trim() || undefined;
  },
  get bambuMaxFileBytes() {
    return numberFromEnv('BAMBU_MAX_FILE_MB', 25) * 1024 * 1024;
  },
  get bambuCooldownSeconds() {
    return numberFromEnv('BAMBU_COOLDOWN_SECONDS', 10);
  },
  get cooldownSeconds() {
    return numberFromEnv('PLAYER_COOLDOWN_SECONDS', 3);
  },
  get sessionMaxAgeSeconds() {
    return numberFromEnv('SESSION_MAX_AGE_SECONDS', 8 * 60 * 60);
  },
  get redirectUri() {
    return `${this.appBaseUrl}/api/auth/callback`;
  },
  get secureCookies() {
    return this.appBaseUrl.startsWith('https://');
  },
};
