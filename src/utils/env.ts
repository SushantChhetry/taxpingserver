const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'ANTHROPIC_API_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'PORT',
  'BASE_URL',
] as const;

type RequiredEnvVar = (typeof REQUIRED_ENV_VARS)[number];

export type Env = Record<RequiredEnvVar, string>;

export function validateEnv(): Env {
  const missing: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return Object.fromEntries(
    REQUIRED_ENV_VARS.map((key) => [key, process.env[key] as string])
  ) as Env;
}
