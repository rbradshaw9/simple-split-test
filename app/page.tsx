'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TestForm } from '@/components/TestForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileCode, Copy, CheckCircle, Settings, ExternalLink, Calendar, Edit, RefreshCw } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export default function HomePage() {
  const router = useRouter();
  const [showResults, setShowResults] = useState(false);
  const [testData, setTestData] = useState<any>(null);
  const [copiedWorker, setCopiedWorker] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [existingTests, setExistingTests] = useState<any[]>([]);
  const [loadingTests, setLoadingTests] = useState(true);

  useEffect(() => {
    loadExistingTests();
    
    // Reload tests when page becomes visible (e.g., back button navigation)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadExistingTests();
      }
    };
    
    const handleFocus = () => {
      loadExistingTests();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const loadExistingTests = async () => {
    try {
      // Add cache busting to prevent stale data
      const response = await fetch(`/api/tests/list?t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded tests:', data.tests);
        setExistingTests(data.tests || []);
      }
    } catch (error) {
      console.error('Error loading tests:', error);
    } finally {
      setLoadingTests(false);
    }
  };

  const handleTestCreated = async (testId: string, fullResponse?: any) => {
    console.log('Test created with ID:', testId, fullResponse);
    
    if (fullResponse) {
      // Use the data from the create response
      setTestData({
        test: {
          ...fullResponse.test,
          workerCode: fullResponse.workerCode,
          trackingSnippet: fullResponse.trackingSnippet,
          setupInstructions: fullResponse.setupInstructions,
        },
        stats: null, // No stats yet for new test
      });
      setShowResults(true);
    } else {
      // Fallback: navigate to test page
      router.push(`/tests/${testId}`);
    }
    
    // Reload test list to reflect the new test
    await loadExistingTests();
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

  if (showResults && testData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Test Created Successfully!</h2>
          <Button onClick={() => router.push(`/tests/${testData.test.id}`)}>
            Go to Dashboard
          </Button>
        </div>

        {/* Worker Code */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileCode className="w-5 h-5" />
                  Cloudflare Worker Code
                </CardTitle>
                <CardDescription>
                  Paste this into your Cloudflare Worker
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(testData.test.workerCode || '', 'worker')}
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
              value={testData.test.workerCode || 'Loading...'}
              readOnly
              className="font-mono text-xs h-64"
            />
          </CardContent>
        </Card>

        {/* Tracking Snippet */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Conversion Tracking Snippet</CardTitle>
                <CardDescription>
                  Add this to your thank-you/confirmation page
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(testData.test.trackingSnippet || '', 'snippet')}
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
              value={testData.test.trackingSnippet || 'Loading...'}
              readOnly
              className="font-mono text-xs h-32"
            />
          </CardContent>
        </Card>

        {/* Setup Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={testData.test.setupInstructions || 'Loading...'}
              readOnly
              className="font-mono text-xs h-96"
            />
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button onClick={() => router.push(`/tests/${testData.test.id}`)}>
            View Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              setShowResults(false);
              setTestData(null);
              await loadExistingTests();
            }}
          >
            Create Another Test
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">EdgeSplit A/B Tests</h2>
          <p className="text-muted-foreground">
            Server-side split testing with Cloudflare Workers and GA4 tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              loadExistingTests();
            }}
            title="Refresh test list"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Existing Tests */}
      {existingTests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Tests</CardTitle>
            <CardDescription>
              {existingTests.length} test{existingTests.length !== 1 ? 's' : ''} configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {existingTests.map((test) => (
                <div
                  key={test.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{test.name}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        {test.entryUrl || test.entryPath}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(test.createdAt).toLocaleDateString()}
                      </span>
                      {test.autoOptimize && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                          Auto-Optimize
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/tests/${test.id}/edit`)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/tests/${test.id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loadingTests && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading tests...
          </CardContent>
        </Card>
      )}

      {/* Create New Test */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Test</CardTitle>
          <CardDescription>
            Set up a new A/B test with Cloudflare Workers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TestForm onSuccess={handleTestCreated} />
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>How it Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-1">1. Create Test Configuration</h4>
            <p className="text-sm text-muted-foreground">
              Define your control and variant URLs, traffic split percentages, and GA4 credentials.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">2. Deploy Worker Code</h4>
            <p className="text-sm text-muted-foreground">
              Copy the generated Cloudflare Worker code and deploy it to your Cloudflare account.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">3. Add Tracking Snippet</h4>
            <p className="text-sm text-muted-foreground">
              Place the conversion tracking snippet on your confirmation/thank-you page.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">4. Monitor Dashboard</h4>
            <p className="text-sm text-muted-foreground">
              View real-time stats powered by GA4, including views, conversions, and lift percentages.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
