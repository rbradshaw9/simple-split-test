import type { Test, TestStats, GA4ReportResponse, GA4ReportRow } from '@/types/Test';
import { loadConfig, type AppConfig } from './config';

/**
 * GA4 Data API integration
 * Uses Google Analytics Data API v1 to fetch event data
 */

interface GA4Credentials {
  propertyId: string;
  accessToken?: string;
  serviceAccountKey?: string;
}

export async function fetchGA4Stats(test: Test): Promise<TestStats> {
  const propertyId = test.ga4.propertyId;
  const viewEvent = test.eventNames.view;
  const conversionEvent = test.eventNames.conversion;

  try {
    const accessToken = await getAccessToken();
    
    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          dimensions: [
            { name: 'eventName' },
            { name: 'customEvent:bucket' }
          ],
          metrics: [{ name: 'eventCount' }],
          dimensionFilter: {
            orGroup: {
              expressions: [
                {
                  filter: {
                    fieldName: 'eventName',
                    stringFilter: { value: viewEvent }
                  }
                },
                {
                  filter: {
                    fieldName: 'eventName',
                    stringFilter: { value: conversionEvent }
                  }
                }
              ]
            }
          }
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`GA4 API error: ${response.status} ${response.statusText}`);
    }

    const data: GA4ReportResponse = await response.json();
    return parseGA4Data(data, test);
  } catch (error) {
    console.error('Error fetching GA4 stats:', error);
    // Return empty stats on error
    return createEmptyStats(test);
  }
}

function parseGA4Data(data: GA4ReportResponse, test: Test): TestStats {
  const stats: TestStats = {
    testId: test.id,
    controlViews: 0,
    controlConversions: 0,
    controlRate: 0,
    variantStats: {},
    winner: null,
    lift: 0,
    lastUpdated: Date.now(),
  };

  // Initialize variant stats
  test.variants.forEach(variant => {
    stats.variantStats[variant.id] = {
      views: 0,
      conversions: 0,
      rate: 0,
    };
  });

  if (!data.rows || data.rows.length === 0) {
    return stats;
  }

  // Parse rows
  data.rows.forEach((row: GA4ReportRow) => {
    const eventName = row.dimensionValues[0]?.value;
    const bucket = row.dimensionValues[1]?.value;
    const count = parseInt(row.metricValues[0]?.value || '0', 10);

    if (!bucket) return;

    const isView = eventName === test.eventNames.view;
    const isConversion = eventName === test.eventNames.conversion;

    if (bucket === 'control') {
      if (isView) stats.controlViews += count;
      if (isConversion) stats.controlConversions += count;
    } else if (stats.variantStats[bucket]) {
      if (isView) stats.variantStats[bucket].views += count;
      if (isConversion) stats.variantStats[bucket].conversions += count;
    }
  });

  // Calculate rates
  stats.controlRate = calculateRate(stats.controlConversions, stats.controlViews);

  Object.keys(stats.variantStats).forEach(variantId => {
    const variant = stats.variantStats[variantId];
    variant.rate = calculateRate(variant.conversions, variant.views);
  });

  // Determine winner and lift
  const { winner, lift } = determineWinner(stats);
  stats.winner = winner;
  stats.lift = lift;

  return stats;
}

function calculateRate(conversions: number, views: number): number {
  if (views === 0) return 0;
  return (conversions / views) * 100;
}

function determineWinner(stats: TestStats): { winner: string | null; lift: number } {
  let bestRate = stats.controlRate;
  let winner: string | null = 'control';
  let lift = 0;

  Object.keys(stats.variantStats).forEach(variantId => {
    const rate = stats.variantStats[variantId].rate;
    if (rate > bestRate) {
      bestRate = rate;
      winner = variantId;
    }
  });

  if (winner === 'control') {
    // Find highest variant to calculate lift
    const maxVariantRate = Math.max(
      ...Object.values(stats.variantStats).map(v => v.rate)
    );
    lift = stats.controlRate > 0 ? ((stats.controlRate - maxVariantRate) / stats.controlRate) * 100 : 0;
  } else {
    lift = stats.controlRate > 0 ? ((bestRate - stats.controlRate) / stats.controlRate) * 100 : 0;
  }

  // Only declare winner if there's meaningful data
  const hasMinimumData = stats.controlViews >= 100 || 
    Object.values(stats.variantStats).some(v => v.views >= 100);
  
  if (!hasMinimumData) {
    winner = null;
    lift = 0;
  }

  return { winner, lift };
}

function createEmptyStats(test: Test): TestStats {
  const variantStats: TestStats['variantStats'] = {};
  
  test.variants.forEach(variant => {
    variantStats[variant.id] = {
      views: 0,
      conversions: 0,
      rate: 0,
    };
  });

  return {
    testId: test.id,
    controlViews: 0,
    controlConversions: 0,
    controlRate: 0,
    variantStats,
    winner: null,
    lift: 0,
    lastUpdated: Date.now(),
  };
}

export async function getAccessToken(serviceAccount?: any): Promise<string> {
  // Use validated service account credentials from config or passed credentials
  const config = await loadConfig();
  const credentials = serviceAccount || config.googleServiceAccount;
  
  try {
    // Create JWT
    const jwt = await createJWT(credentials);
    
    // Exchange JWT for access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to get access token: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

async function createJWT(credentials: AppConfig['googleServiceAccount']): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: credentials.private_key_id,
  };
  
  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: credentials.token_uri,
    exp: now + 3600,
    iat: now,
  };

  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  // Sign with private key
  const signature = await signWithPrivateKey(signatureInput, credentials.private_key);
  
  return `${signatureInput}.${signature}`;
}

function base64UrlEncode(str: string): string {
  const base64 = Buffer.from(str).toString('base64');
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function signWithPrivateKey(data: string, privateKey: string): Promise<string> {
  const crypto = await import('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(data);
  sign.end();
  
  const signature = sign.sign(privateKey);
  return base64UrlEncode(signature.toString('base64'));
}

export async function validateGA4Access(propertyId: string): Promise<boolean> {
  try {
    const accessToken = await getAccessToken();
    
    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}/metadata`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    return response.ok;
  } catch {
    return false;
  }
}
