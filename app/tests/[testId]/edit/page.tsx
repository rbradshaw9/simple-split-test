'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TestForm } from '@/components/TestForm';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { Test, CreateTestRequest } from '@/types/Test';

export default function EditTestPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.testId as string;

  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const response = await fetch(`/api/tests/${testId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch test');
        }

        setTest(data.test);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
  }, [testId]);

  const handleUpdate = async (data: CreateTestRequest) => {
    try {
      const response = await fetch(`/api/tests/${testId}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update test');
      }

      // Redirect back to test detail page
      router.push(`/tests/${testId}`);
    } catch (err) {
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading test..." />
      </div>
    );
  }

  if (error || !test) {
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

  // Convert test to CreateTestRequest format
  const initialData: CreateTestRequest = {
    name: test.name,
    entryPath: test.entryUrl || test.entryPath,
    controlUrl: test.controlUrl,
    controlPercentage: test.controlPercentage,
    variants: test.variants.map(v => ({
      url: v.url,
      percentage: v.percentage,
    })),
    autoOptimize: test.autoOptimize,
  };

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/tests/${testId}`)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Test
        </Button>
        <h1 className="text-3xl font-bold">Edit Test</h1>
        <p className="text-muted-foreground mt-1">
          Update your test configuration
        </p>
      </div>

      <TestForm
        onSubmit={handleUpdate}
        initialData={initialData}
        submitLabel="Update Test"
      />
    </div>
  );
}
