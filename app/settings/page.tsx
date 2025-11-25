'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, AlertCircle, Lock, Loader2 } from 'lucide-react';

interface AppConfig {
  gaMeasurementId: string;
  gaPropertyId: string;
  gaApiSecret: string;
  googleServiceAccount: {
    email: string;
    privateKey: string;
  };
  cfAccountId: string;
  cfNamespaceId: string;
  cfApiToken: string;
}

export default function SettingsPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [editedConfig, setEditedConfig] = useState<AppConfig | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ga4TestResult, setGa4TestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [cfTestResult, setCfTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  const loadConfig = async (pwd: string) => {
    setLoading(true);
    setAuthError('');
    try {
      const response = await fetch('/api/settings', {
        headers: {
          'Authorization': `Bearer ${pwd}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        setAuthError('Invalid password');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to load settings');
      }

      const data = await response.json();
      setConfig(data.config);
      setEditedConfig(data.config);
      setAuthenticated(true);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    await loadConfig(password);
  };

  const handleSave = async () => {
    if (!editedConfig) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`,
        },
        body: JSON.stringify({ config: editedConfig }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setSuccess('Settings saved successfully! Changes are now active.');
      setConfig(editedConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const testGA4 = async () => {
    if (!editedConfig) return;
    setGa4TestResult(null);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`,
        },
        body: JSON.stringify({ config: editedConfig, action: 'test-ga4' }),
      });
      const result = await response.json();
      setGa4TestResult(result);
    } catch (err) {
      setGa4TestResult({ success: false, error: 'Failed to test connection' });
    }
  };

  const testCloudflare = async () => {
    if (!editedConfig) return;
    setCfTestResult(null);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`,
        },
        body: JSON.stringify({ config: editedConfig, action: 'test-cloudflare' }),
      });
      const result = await response.json();
      setCfTestResult(result);
    } catch (err) {
      setCfTestResult({ success: false, error: 'Failed to test connection' });
    }
  };

  if (!authenticated) {
    return (
      <div className="container mx-auto p-6 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Settings Password
            </CardTitle>
            <CardDescription>
              Enter your settings password to manage configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter settings password"
                  required
                />
                {authError && (
                  <p className="text-sm text-destructive mt-2">{authError}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  'Unlock Settings'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!editedConfig) return null;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your EdgeSplit configuration
        </p>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* GA4 Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>GA4 Configuration</CardTitle>
            <CardDescription>
              Google Analytics 4 integration settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="gaMeasurementId">Measurement ID</Label>
              <Input
                id="gaMeasurementId"
                value={editedConfig.gaMeasurementId}
                onChange={(e) => setEditedConfig({ ...editedConfig, gaMeasurementId: e.target.value })}
                placeholder="G-XXXXXXXXXX"
              />
            </div>
            <div>
              <Label htmlFor="gaPropertyId">Property ID</Label>
              <Input
                id="gaPropertyId"
                value={editedConfig.gaPropertyId}
                onChange={(e) => setEditedConfig({ ...editedConfig, gaPropertyId: e.target.value })}
                placeholder="123456789"
              />
            </div>
            <div>
              <Label htmlFor="gaApiSecret">API Secret</Label>
              <Input
                id="gaApiSecret"
                type="password"
                value={editedConfig.gaApiSecret}
                onChange={(e) => setEditedConfig({ ...editedConfig, gaApiSecret: e.target.value })}
                placeholder="Enter GA4 API Secret"
              />
            </div>
            <div>
              <Label htmlFor="serviceAccountEmail">Service Account Email</Label>
              <Input
                id="serviceAccountEmail"
                value={editedConfig.googleServiceAccount.email}
                onChange={(e) => setEditedConfig({
                  ...editedConfig,
                  googleServiceAccount: { ...editedConfig.googleServiceAccount, email: e.target.value }
                })}
                placeholder="service-account@project.iam.gserviceaccount.com"
              />
            </div>
            <div>
              <Label htmlFor="privateKey">Service Account Private Key</Label>
              <Textarea
                id="privateKey"
                value={editedConfig.googleServiceAccount.privateKey}
                onChange={(e) => setEditedConfig({
                  ...editedConfig,
                  googleServiceAccount: { ...editedConfig.googleServiceAccount, privateKey: e.target.value }
                })}
                placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
                rows={6}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={testGA4}>
                Test GA4 Connection
              </Button>
              {ga4TestResult && (
                <div className="flex items-center gap-2">
                  {ga4TestResult.success ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-green-600">Connected</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <span className="text-sm text-red-600">{ga4TestResult.error}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cloudflare Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Cloudflare Configuration</CardTitle>
            <CardDescription>
              Cloudflare KV storage settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="cfAccountId">Account ID</Label>
              <Input
                id="cfAccountId"
                value={editedConfig.cfAccountId}
                onChange={(e) => setEditedConfig({ ...editedConfig, cfAccountId: e.target.value })}
                placeholder="32-character account ID"
              />
            </div>
            <div>
              <Label htmlFor="cfNamespaceId">KV Namespace ID</Label>
              <Input
                id="cfNamespaceId"
                value={editedConfig.cfNamespaceId}
                onChange={(e) => setEditedConfig({ ...editedConfig, cfNamespaceId: e.target.value })}
                placeholder="32-character namespace ID"
              />
            </div>
            <div>
              <Label htmlFor="cfApiToken">API Token</Label>
              <Input
                id="cfApiToken"
                type="password"
                value={editedConfig.cfApiToken}
                onChange={(e) => setEditedConfig({ ...editedConfig, cfApiToken: e.target.value })}
                placeholder="Enter Cloudflare API Token"
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={testCloudflare}>
                Test Cloudflare Connection
              </Button>
              {cfTestResult && (
                <div className="flex items-center gap-2">
                  {cfTestResult.success ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-green-600">Connected</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <span className="text-sm text-red-600">{cfTestResult.error}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setEditedConfig(config)}
            disabled={saving}
          >
            Reset
          </Button>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm">
            <strong>Note:</strong> Changes are saved to Cloudflare KV and take effect immediately.
            No redeployment required. Environment variables serve as fallback if KV storage fails.
          </p>
        </div>
      </div>
    </div>
  );
}
