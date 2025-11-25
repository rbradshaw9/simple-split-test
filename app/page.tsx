'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TestForm } from '@/components/TestForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileCode, Copy, CheckCircle, Settings } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export default function HomePage() {
  const router = useRouter();
  const [showResults, setShowResults] = useState(false);
  const [testData, setTestData] = useState<any>(null);
  const [copiedWorker, setCopiedWorker] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const handleTestCreated = async (testId: string) => {
    // Fetch the created test data
    const response = await fetch(`/api/stats/${testId}`);
    const data = await response.json();
    setTestData(data);
    setShowResults(true);
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
            onClick={() => {
              setShowResults(false);
              setTestData(null);
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
          <h2 className="text-3xl font-bold mb-2">Create A/B Test</h2>
          <p className="text-muted-foreground">
            Generate a server-side split test with Cloudflare Workers and GA4 tracking
          </p>
        </div>
        <Link href="/settings">
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </Link>
      </div>

      <TestForm onSuccess={handleTestCreated} />

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
