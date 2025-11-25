'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';
import type { CreateTestRequest } from '@/types/Test';

interface TestFormProps {
  onSuccess?: (testId: string) => void;
  onSubmit?: (data: CreateTestRequest) => Promise<void>;
  initialData?: CreateTestRequest;
  submitLabel?: string;
}

interface Variant {
  url: string;
  percentage: number;
}

export function TestForm({ onSuccess, onSubmit, initialData, submitLabel = 'Create Test' }: TestFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [name, setName] = useState(initialData?.name || '');
  const [entryPath, setEntryPath] = useState(initialData?.entryPath || '');
  const [controlUrl, setControlUrl] = useState(initialData?.controlUrl || '');
  const [controlPercentage, setControlPercentage] = useState(initialData?.controlPercentage || 50);
  const [variants, setVariants] = useState<Variant[]>(
    initialData?.variants || [{ url: '', percentage: 50 }]
  );
  const [autoOptimize, setAutoOptimize] = useState(initialData?.autoOptimize || false);

  const addVariant = () => {
    setVariants([...variants, { url: '', percentage: 0 }]);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof Variant, value: string | number) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data: CreateTestRequest = {
        name,
        entryPath,
        controlUrl,
        controlPercentage,
        variants: variants.filter(v => v.url.trim() !== ''),
        autoOptimize,
      };

      // Use custom onSubmit handler if provided (for edit mode)
      if (onSubmit) {
        await onSubmit(data);
        return;
      }

      // Default behavior: create new test
      const response = await fetch('/api/tests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create test');
      }

      if (onSuccess) {
        onSuccess(result.testId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const totalPercentage = controlPercentage + variants.reduce((sum, v) => sum + v.percentage, 0);

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>{initialData ? 'Edit A/B Test' : 'Create New A/B Test'}</CardTitle>
        <CardDescription>
          {initialData 
            ? 'Update your test configuration'
            : 'Set up a server-side split test with Cloudflare Workers and GA4 tracking'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Test Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Test Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Income Stacking Webclass Test"
              required
            />
          </div>

          {/* Entry URL */}
          <div className="space-y-2">
            <Label htmlFor="entryPath">Entry URL</Label>
            <Input
              id="entryPath"
              value={entryPath}
              onChange={(e) => setEntryPath(e.target.value)}
              placeholder="https://go.thecashflowacademy.com/income-stacking-webclass"
              required
            />
            <p className="text-sm text-muted-foreground">
              The full URL that triggers the A/B test (domain + path)
            </p>
          </div>

          {/* Control URL */}
          <div className="space-y-2">
            <Label htmlFor="controlUrl">Control URL</Label>
            <Input
              id="controlUrl"
              value={controlUrl}
              onChange={(e) => setControlUrl(e.target.value)}
              placeholder="https://go.example.com/pageA"
              required
            />
            <div className="flex items-center gap-4">
              <Label htmlFor="controlPercentage" className="text-sm">
                Traffic %
              </Label>
              <Input
                id="controlPercentage"
                type="number"
                min="0"
                max="100"
                value={controlPercentage}
                onChange={(e) => setControlPercentage(Number(e.target.value))}
                className="w-24"
              />
            </div>
          </div>

          {/* Variants */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Variants</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addVariant}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Variant
              </Button>
            </div>

            {variants.map((variant, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1 space-y-2">
                  <Input
                    value={variant.url}
                    onChange={(e) => updateVariant(index, 'url', e.target.value)}
                    placeholder="https://training.example.com/"
                    required
                  />
                </div>
                <div className="w-24 space-y-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={variant.percentage}
                    onChange={(e) => updateVariant(index, 'percentage', Number(e.target.value))}
                  />
                </div>
                {variants.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeVariant(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}

            <div className="text-sm">
              Total: {totalPercentage}%
              {totalPercentage !== 100 && (
                <span className="text-destructive ml-2">
                  (must equal 100%)
                </span>
              )}
            </div>
          </div>

          {/* Optimization Settings */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold">Optimization Settings</h3>
            
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="autoOptimize"
                checked={autoOptimize}
                onChange={(e) => setAutoOptimize(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300"
              />
              <div className="flex-1">
                <Label htmlFor="autoOptimize" className="cursor-pointer">
                  Enable Thompson Sampling (Auto-Optimization)
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Automatically allocate traffic to the best-performing variant using Bayesian optimization.
                  {autoOptimize && (
                    <span className="block mt-1 text-primary font-medium">
                      Traffic percentages will be ignored - allocation is dynamic based on performance.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading || totalPercentage !== 100}>
            {loading ? (initialData ? 'Updating...' : 'Creating...') : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
