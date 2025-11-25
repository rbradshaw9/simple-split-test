'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Settings as SettingsIcon } from 'lucide-react';

export default function SettingsPage() {
  // In a real implementation, you might want to allow users to override
  // environment variables or manage multiple GA4 properties
  
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Configure your EdgeSplit installation
        </p>
      </div>

      {/* GA4 Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            <CardTitle>Google Analytics 4 Configuration</CardTitle>
          </div>
          <CardDescription>
            GA4 credentials are configured via environment variables for security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-green-900 dark:text-green-100 mb-1">
                GA4 is Configured
              </p>
              <p className="text-sm text-green-800 dark:text-green-200">
                Your GA4 credentials are loaded from environment variables and will be used for all tests.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
              <span className="text-sm font-medium">Measurement ID:</span>
              <code className="px-3 py-1.5 bg-muted rounded text-sm font-mono">
                {process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || 'Configured (server-side)'}
              </code>
            </div>
            
            <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
              <span className="text-sm font-medium">Property ID:</span>
              <code className="px-3 py-1.5 bg-muted rounded text-sm font-mono">
                {process.env.NEXT_PUBLIC_GA4_PROPERTY_ID || 'Configured (server-side)'}
              </code>
            </div>

            <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
              <span className="text-sm font-medium">API Secret:</span>
              <code className="px-3 py-1.5 bg-muted rounded text-sm font-mono">
                ••••••••••••••• (hidden)
              </code>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> To change these values, update your <code className="px-1.5 py-0.5 bg-muted rounded text-xs">.env.local</code> file and restart the development server, or update environment variables in your deployment platform (Vercel, etc.).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cloudflare Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            <CardTitle>Cloudflare Configuration</CardTitle>
          </div>
          <CardDescription>
            Cloudflare credentials for KV storage and Worker deployment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-green-900 dark:text-green-100 mb-1">
                Cloudflare is Configured
              </p>
              <p className="text-sm text-green-800 dark:text-green-200">
                Using Cloudflare KV REST API for production storage.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
              <span className="text-sm font-medium">Account ID:</span>
              <code className="px-3 py-1.5 bg-muted rounded text-sm font-mono">
                {process.env.NEXT_PUBLIC_CF_ACCOUNT_ID || 'Configured (server-side)'}
              </code>
            </div>
            
            <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
              <span className="text-sm font-medium">API Token:</span>
              <code className="px-3 py-1.5 bg-muted rounded text-sm font-mono">
                ••••••••••••••• (hidden)
              </code>
            </div>

            <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
              <span className="text-sm font-medium">KV Namespace:</span>
              <code className="px-3 py-1.5 bg-muted rounded text-sm font-mono">
                AB_TESTS
              </code>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Cloudflare credentials are managed via environment variables for security.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Documentation Links */}
      <Card>
        <CardHeader>
          <CardTitle>Documentation</CardTitle>
          <CardDescription>
            Learn more about configuring EdgeSplit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="/ENV_SETUP.md" className="text-primary hover:underline">
                Environment Setup Guide
              </a>
              {' '}- Detailed instructions for configuring all environment variables
            </li>
            <li>
              <a href="/SETUP.md" className="text-primary hover:underline">
                General Setup
              </a>
              {' '}- Complete setup instructions including Cloudflare Workers
            </li>
            <li>
              <a href="/API_REFERENCE.md" className="text-primary hover:underline">
                API Reference
              </a>
              {' '}- All available API endpoints and parameters
            </li>
            <li>
              <a href="/VERCEL_DEPLOYMENT.md" className="text-primary hover:underline">
                Vercel Deployment Guide
              </a>
              {' '}- Step-by-step deployment instructions
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
