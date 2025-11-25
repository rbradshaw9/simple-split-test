// Type definitions for A/B test configuration

export interface TestVariant {
  id: string;
  url: string;
  percentage: number;
}

export interface GA4Config {
  measurementId: string;
  propertyId: string;
  apiSecret?: string;
}

export interface EventNames {
  view: string;
  conversion: string;
}

export interface Test {
  id: string;
  name: string;
  entryPath: string; // URL path only (e.g., /income-stacking-webclass)
  entryUrl?: string; // Full entry URL (e.g., https://go.example.com/income-stacking-webclass)
  entryDomain?: string; // Domain from entry URL (e.g., go.example.com)
  controlUrl: string;
  variants: TestVariant[];
  controlPercentage: number;
  ga4: GA4Config;
  eventNames: EventNames;
  autoOptimize?: boolean; // Enable Thompson Sampling for adaptive traffic allocation
  createdAt: number;
  updatedAt?: number;
}

export interface TestStats {
  testId: string;
  controlViews: number;
  controlConversions: number;
  controlRate: number;
  variantStats: {
    [variantId: string]: {
      views: number;
      conversions: number;
      rate: number;
    };
  };
  winner: string | null;
  lift: number;
  lastUpdated: number;
}

export interface CreateTestRequest {
  name: string;
  entryPath: string;
  controlUrl: string;
  variants: {
    url: string;
    percentage: number;
  }[];
  controlPercentage: number;
  autoOptimize?: boolean; // Enable Thompson Sampling
}

export interface CreateTestResponse {
  success: boolean;
  testId: string;
  test: Test;
  workerCode: string;
  trackingSnippet: string;
  setupInstructions: string;
  dashboardUrl: string;
}

export interface GA4ReportRow {
  dimensionValues: Array<{ value: string }>;
  metricValues: Array<{ value: string }>;
}

export interface GA4ReportResponse {
  rows?: GA4ReportRow[];
}
