'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Calendar } from 'lucide-react';
import type { Test } from '@/types/Test';
import { formatDate } from '@/lib/utils';

interface TestCardProps {
  test: Test;
}

export function TestCard({ test }: TestCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{test.name}</CardTitle>
            <CardDescription className="mt-1">
              Path: {test.entryPath}
            </CardDescription>
          </div>
          <Link href={`/tests/${test.id}`}>
            <Button variant="outline" size="sm">
              View Dashboard
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Control */}
          <div className="text-sm">
            <span className="font-medium">Control ({test.controlPercentage}%):</span>
            <span className="text-muted-foreground ml-2">{test.controlUrl}</span>
          </div>

          {/* Variants */}
          {test.variants.map((variant) => (
            <div key={variant.id} className="text-sm">
              <span className="font-medium">
                {variant.id.charAt(0).toUpperCase() + variant.id.slice(1)} ({variant.percentage}%):
              </span>
              <span className="text-muted-foreground ml-2">{variant.url}</span>
            </div>
          ))}

          {/* Metadata */}
          <div className="flex items-center gap-4 pt-2 mt-2 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(test.createdAt)}</span>
            </div>
            <div>
              GA4: {test.ga4.measurementId}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
