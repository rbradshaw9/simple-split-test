'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StatCard } from '@/components/StatCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { 
  RefreshCw, ArrowLeft, TrendingUp, Eye, Target, 
  Edit, Trash2, Code, Copy, CheckCircle, FileCode, AlertCircle, CheckCircle2
} from 'lucide-react';
import { formatPercentage, formatRelativeTime, calculateLift } from '@/lib/utils';
import type { Test, TestStats } from '@/types/Test';

export default function TestDashboard() {
  const params = useParams();
  const router = useRouter();
  const testId = params.testId as string;

  const [test, setTest] = useState<Test | null>(null);
  const [stats, setStats] = useState<TestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCodes, setShowCodes] = useState(false);
  const [workerCode, setWorkerCode] = useState('');
  const [trackingSnippet, setTrackingSnippet] = useState('');
  const [setupInstructions, setSetupInstructions] = useState('');
  const [copiedWorker, setCopiedWorker] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      
      const response = await fetch(`/api/stats/${testId}?refresh=${refresh}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch data');
      }

      setTest(data.test);
      setStats(data.stats);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  const loadCodes = async () => {
    try {
      const response = await fetch(`/api/tests/${testId}/codes`);
      const data = await response.json();
      
      if (response.ok) {
        setWorkerCode(data.workerCode);
        setTrackingSnippet(data.trackingSnippet);
        setSetupInstructions(data.setupInstructions);
        setShowCodes(true);
      }
    } catch (err) {
      console.error('Error loading codes:', err);
    }
  };

  const copyToClipboard = (text: string, type: 'worker' | 'snippet') => {
    navigator.clipboard.writeText(text);
    if (type === 'worker') {
      setCopiedWorker(true);
      setTimeout(() => setCopiedWorker(false), 2000);
    } else {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    }
  };

  const verifyInstallation = async () => {
    setVerifying(true);
    try {
      const response = await fetch(`/api/tests/${testId}/verify`);
      const data = await response.json();
      
      if (response.ok) {
        setVerificationResult(data);
      }
    } catch (err) {
      console.error('Error verifying installation:', err);
    } finally {
      setVerifying(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this test? This cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/tests/${testId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/');
      } else {
        alert('Failed to delete test');
      }
    } catch (err) {
      console.error('Error deleting test:', err);
      alert('Failed to delete test');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  if (error || !test || !stats) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Error Loading Test</h2>
        <p className="text-muted-foreground mb-6">{error || 'Test not found'}</p>
        <Button onClick={() => router.push('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">{test.name}</h1>
          <p className="text-muted-foreground mt-1">
            Entry Path: {test.entryPath}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-xs text-muted-foreground">
              Last updated: {formatRelativeTime(stats.lastUpdated)}
            </p>
            {test.autoOptimize && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Thompson Sampling Active
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadCodes}
          >
            <Code className="w-4 h-4 mr-2" />
            View Codes
          </Button>
          <Button
            variant="outline"
            onClick={verifyInstallation}
            disabled={verifying}
          >
            <CheckCircle2 className={`w-4 h-4 mr-2 ${verifying ? 'animate-spin' : ''}`} />
            {verifying ? 'Verifying...' : 'Verify Installation'}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/tests/${testId}/edit`)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
          <Button
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Deployment Checklist */}
      <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="text-lg">🚀 Deployment Checklist</CardTitle>
          <CardDescription>Follow these steps to activate your test</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <p className="font-medium text-sm">1. Click &quot;View Codes&quot; button above</p>
            <p className="font-medium text-sm">2. Copy Worker code and deploy to Cloudflare Workers</p>
            <p className="font-medium text-sm">3. Configure Worker route (e.g., yourdomain.com{test.entryPath}*)</p>
            <p className="font-medium text-sm">4. Add KV binding: Variable name <code className="bg-white px-1 rounded">AB_TESTS</code></p>
            <p className="font-medium text-sm">5. Copy tracking snippet to your conversion/thank-you page</p>
            <p className="font-medium text-sm">6. Test with: <code className="bg-white px-1 rounded">?__edgesplit_force=control</code></p>
            <p className="font-medium text-sm">7. Click &quot;Verify Installation&quot; to confirm everything works</p>
          </div>
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              💡 <strong>Tip:</strong> Use <code className="bg-white px-1 rounded">?__edgesplit_force=variant_a</code> to test each variant
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Optimization Mode Info */}
      {test.autoOptimize && (
        <Card className="border-purple-500 bg-purple-50 dark:bg-purple-950">
          <CardHeader>
            <CardTitle className="text-lg">⚡ Adaptive Traffic Allocation</CardTitle>
            <CardDescription>
              This test uses Thompson Sampling to automatically send more traffic to better-performing variants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The configured percentages are ignored. Traffic is dynamically allocated based on conversion performance using Bayesian optimization.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Verification Results */}
      {verificationResult && (
        <Card className={verificationResult.overall ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {verificationResult.overall ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Installation Verified
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  Installation Issues Detected
                </>
              )}
            </CardTitle>
            <CardDescription>
              {!verificationResult.overall && (
                <>⚠️ This checks your deployed worker. Click &quot;View Codes&quot; below to deploy first.</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              {verificationResult.checks.workerInstalled ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-medium">Worker Code</p>
                <p className="text-sm text-muted-foreground">{verificationResult.checks.workerMessage}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              {verificationResult.checks.trackingInstalled ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-medium">Tracking Snippet</p>
                <p className="text-sm text-muted-foreground">{verificationResult.checks.trackingMessage}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              {verificationResult.checks.recentActivity ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-medium">Recent Activity</p>
                <p className="text-sm text-muted-foreground">{verificationResult.checks.activityMessage}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Code Display */}
      {showCodes && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileCode className="w-5 h-5" />
                    Cloudflare Worker Code
                  </CardTitle>
                  <CardDescription>
                    Deploy this code to your Cloudflare Worker
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(workerCode, 'worker')}
                >
                  {copiedWorker ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={workerCode}
                readOnly
                rows={20}
                className="font-mono text-xs"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="w-5 h-5" />
                    Tracking Snippet
                  </CardTitle>
                  <CardDescription>
                    Add this to your conversion/thank you page
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(trackingSnippet, 'snippet')}
                >
                  {copiedSnippet ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={trackingSnippet}
                readOnly
                rows={12}
                className="font-mono text-xs"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Setup Instructions</CardTitle>
              <CardDescription>Follow these steps to deploy your test</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-lg overflow-x-auto">
                {setupInstructions}
              </pre>
            </CardContent>
          </Card>
        </>
      )}

      {/* Winner Card */}
      {stats.winner && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Current Winner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">
                {stats.winner === 'control' ? 'Control' : stats.winner.toUpperCase()}
              </p>
              <p className="text-muted-foreground">
                {stats.lift > 0 ? '+' : ''}{formatPercentage(stats.lift)} lift vs{' '}
                {stats.winner === 'control' ? 'variants' : 'control'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Control Stats */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Control ({test.controlPercentage}%)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Views"
            value={stats.controlViews}
            subtitle="Total impressions"
          />
          <StatCard
            title="Conversions"
            value={stats.controlConversions}
            subtitle="Total completions"
          />
          <StatCard
            title="Conversion Rate"
            value={formatPercentage(stats.controlRate)}
            subtitle="Conversions / Views"
            variant={stats.winner === 'control' ? 'success' : 'default'}
          />
        </div>
      </div>

      {/* Variant Stats */}
      {test.variants.map((variant) => {
        const variantStats = stats.variantStats[variant.id];
        if (!variantStats) return null;

        const lift = calculateLift(stats.controlRate, variantStats.rate);

        return (
          <div key={variant.id}>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              {variant.id.charAt(0).toUpperCase() + variant.id.slice(1)} ({variant.percentage}%)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard
                title="Views"
                value={variantStats.views}
                subtitle="Total impressions"
              />
              <StatCard
                title="Conversions"
                value={variantStats.conversions}
                subtitle="Total completions"
              />
              <StatCard
                title="Conversion Rate"
                value={formatPercentage(variantStats.rate)}
                subtitle="Conversions / Views"
                variant={stats.winner === variant.id ? 'success' : 'default'}
              />
              <StatCard
                title="Lift vs Control"
                value={formatPercentage(lift)}
                subtitle="Relative performance"
                trend={lift > 0 ? 'up' : lift < 0 ? 'down' : 'neutral'}
                trendValue={formatPercentage(Math.abs(lift))}
                variant={lift > 5 ? 'success' : lift < -5 ? 'warning' : 'default'}
              />
            </div>
          </div>
        );
      })}

      {/* Test Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>View your test setup details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <span className="font-medium">Test ID:</span>
              <span className="ml-2 text-muted-foreground font-mono text-sm">{test.id}</span>
            </div>
            <div>
              <span className="font-medium">Control URL:</span>
              <span className="ml-2 text-muted-foreground text-sm">{test.controlUrl}</span>
            </div>
            {test.variants.map((variant) => (
              <div key={variant.id}>
                <span className="font-medium">
                  {variant.id.charAt(0).toUpperCase() + variant.id.slice(1)} URL:
                </span>
                <span className="ml-2 text-muted-foreground text-sm">{variant.url}</span>
              </div>
            ))}
            <div>
              <span className="font-medium">GA4 Measurement ID:</span>
              <span className="ml-2 text-muted-foreground text-sm">{test.ga4.measurementId}</span>
            </div>
            <div>
              <span className="font-medium">View Event:</span>
              <span className="ml-2 text-muted-foreground font-mono text-sm">
                {test.eventNames.view}
              </span>
            </div>
            <div>
              <span className="font-medium">Conversion Event:</span>
              <span className="ml-2 text-muted-foreground font-mono text-sm">
                {test.eventNames.conversion}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
