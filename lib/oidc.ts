import 'server-only';

import { discovery, type Configuration } from 'openid-client';

import { serverConfig } from '@/lib/config';

let configPromise: Promise<Configuration> | null = null;

/**
 * Discover the portal OIDC metadata and build a cached client configuration.
 * The configuration is safe to cache because it only changes when the portal
 * deployment changes.
 */
export async function getOidcConfig(): Promise<Configuration> {
  if (!configPromise) {
    configPromise = discovery(
      new URL(serverConfig.portalIssuer),
      serverConfig.clientId,
      serverConfig.clientSecret,
    ).catch((error) => {
      configPromise = null;
      throw error;
    });
  }

  return configPromise;
}
