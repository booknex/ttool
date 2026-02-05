import Stripe from 'stripe';

let connectionSettings: any;
let cachedCredentials: { publishableKey: string; secretKey: string } | null = null;

async function fetchCredentialsForEnvironment(environment: string): Promise<{ publishableKey: string; secretKey: string } | null> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken || !hostname) {
    console.error('Stripe: Missing REPL_IDENTITY/WEB_REPL_RENEWAL or REPLIT_CONNECTORS_HOSTNAME');
    return null;
  }

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', 'stripe');
  url.searchParams.set('environment', environment);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    });

    if (!response.ok) {
      console.error(`Stripe: Failed to fetch ${environment} credentials, status: ${response.status}`);
      return null;
    }

    const data = await response.json();
    connectionSettings = data.items?.[0];

    if (connectionSettings?.settings?.publishable && connectionSettings?.settings?.secret) {
      console.log(`Stripe: Using ${environment} credentials`);
      return {
        publishableKey: connectionSettings.settings.publishable,
        secretKey: connectionSettings.settings.secret,
      };
    }
    
    console.log(`Stripe: No valid ${environment} credentials found`);
    return null;
  } catch (error: any) {
    console.error(`Stripe: Error fetching ${environment} credentials:`, error.message);
    return null;
  }
}

async function getCredentials() {
  // Return cached credentials if available
  if (cachedCredentials) {
    return cachedCredentials;
  }

  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
  
  // Try production first if in production mode
  if (isProduction) {
    const prodCreds = await fetchCredentialsForEnvironment('production');
    if (prodCreds) {
      cachedCredentials = prodCreds;
      return prodCreds;
    }
    console.log('Stripe: Production credentials not found, falling back to development');
  }
  
  // Try development credentials
  const devCreds = await fetchCredentialsForEnvironment('development');
  if (devCreds) {
    cachedCredentials = devCreds;
    return devCreds;
  }

  throw new Error('Stripe credentials not configured. Please set up the Stripe integration in your Replit project.');
}

export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();

  return new Stripe(secretKey);
}

export async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}

let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import('stripe-replit-sync');
    const secretKey = await getStripeSecretKey();

    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
