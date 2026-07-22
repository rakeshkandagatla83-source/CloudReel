// Per-deploy values that differ per environment instance (OIDC, S3, app URL).
// API service base URLs live in apiConfig.ts instead.
export const env = {
  appBaseUrl: import.meta.env.VITE_APP_BASE_URL as string,
  envLabel: import.meta.env.VITE_ENV_LABEL as string,
  oidcAuthority: import.meta.env.VITE_OIDC_AUTHORITY as string,
  oidcClientId: import.meta.env.VITE_OIDC_CLIENT_ID as string,
}
