import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Loading skeleton for topology nodes
export const NodeSkeleton: React.FC<{ type?: 'queue' | 'exchange' | 'consumer' | 'producer' }> = ({ 
  type = 'queue' 
}) => {
  return (
    <div className="min-w-[120px] min-h-[60px] border-2 border-dashed border-gray-300 rounded-lg p-3 bg-gray-50">
      <Skeleton className="h-4 w-16 mb-2" />
      <Skeleton className="h-3 w-full mb-1" />
      <Skeleton className="h-3 w-3/4" />
      {type === 'queue' && (
        <div className="mt-2 flex gap-1">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-8" />
        </div>
      )}
    </div>
  );
};

// Loading skeleton for topology overview
export const TopologySkeleton: React.FC = () => {
  return (
    <div className="w-full h-[600px] bg-gray-50 rounded-lg p-4">
      <div className="mb-4 flex justify-between items-center">
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      
      {/* Simulated topology layout */}
      <div className="relative h-[500px]">
        {/* Producer nodes */}
        <div className="absolute top-4 left-4">
          <NodeSkeleton type="producer" />
        </div>
        <div className="absolute top-24 left-4">
          <NodeSkeleton type="producer" />
        </div>
        
        {/* Exchange nodes */}
        <div className="absolute top-4 left-48">
          <NodeSkeleton type="exchange" />
        </div>
        <div className="absolute top-24 left-48">
          <NodeSkeleton type="exchange" />
        </div>
        
        {/* Queue nodes */}
        <div className="absolute top-4 left-96">
          <NodeSkeleton type="queue" />
        </div>
        <div className="absolute top-24 left-96">
          <NodeSkeleton type="queue" />
        </div>
        <div className="absolute top-44 left-96">
          <NodeSkeleton type="queue" />
        </div>
        
        {/* Consumer nodes */}
        <div className="absolute top-4 right-4">
          <NodeSkeleton type="consumer" />
        </div>
        <div className="absolute top-24 right-4">
          <NodeSkeleton type="consumer" />
        </div>
        
        {/* Connection lines */}
        <Skeleton className="absolute top-8 left-32 h-0.5 w-16" />
        <Skeleton className="absolute top-28 left-32 h-0.5 w-16" />
        <Skeleton className="absolute top-8 left-64 h-0.5 w-32" />
        <Skeleton className="absolute top-28 left-64 h-0.5 w-32" />
      </div>
    </div>
  );
};

// Loading skeleton for metric cards
export const MetricCardSkeleton: React.FC = () => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
};

// Loading skeleton for dashboard
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Loading skeleton for management interfaces
export const ManagementSkeleton: React.FC<{ type: 'exchange' | 'queue' | 'binding' }> = ({ type }) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-24" />
      </div>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div>
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
          
          {type === 'queue' && (
            <div className="space-y-4">
              <div>
                <Skeleton className="h-4 w-20 mb-2" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-9 w-32" />
              </div>
            </div>
          )}
          
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Loading skeleton for data tables
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => {
  return (
    <div className="space-y-3">
      {/* Table header */}
      <div className="flex gap-4 p-3 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-24" />
        ))}
      </div>
      
      {/* Table rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-4 w-24" />
          ))}
        </div>
      ))}
    </div>
  );
};

// Loading skeleton for message list
export const MessageListSkeleton: React.FC = () => {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <Skeleton className="h-4 w-32" />
              <div className="flex gap-2">
                <Badge>
                  <Skeleton className="h-3 w-12" />
                </Badge>
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-3/4 mb-2" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Loading state wrapper component
interface LoadingWrapperProps {
  isLoading: boolean;
  children: React.ReactNode;
  skeleton: React.ReactNode;
  error?: string | null;
  retry?: () => void;
}

export const LoadingWrapper: React.FC<LoadingWrapperProps> = ({
  isLoading,
  children,
  skeleton,
  error,
  retry
}) => {
  if (error) {
    return (
      <Card className="p-8 text-center">
        <div className="space-y-4">
          <div className="text-destructive font-medium">Error loading data</div>
          <div className="text-sm text-muted-foreground">{error}</div>
          {retry && (
            <button
              onClick={retry}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              Try Again
            </button>
          )}
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return <>{skeleton}</>;
  }

  return <>{children}</>;
};
