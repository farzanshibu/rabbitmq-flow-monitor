import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { VirtualizedTopology } from '../VirtualizedTopology';
import { useOptimizedRabbitMQTopology } from '../../hooks/useOptimizedRabbitMQTopology';
import { usePerformanceMonitor } from '../../hooks/usePerformanceCache';

// Generate test data for different topology sizes
const generateTestTopology = (scale: 'small' | 'medium' | 'large' | 'enterprise') => {
  const configs = {
    small: { queues: 10, exchanges: 5, bindings: 20 },
    medium: { queues: 50, exchanges: 20, bindings: 100 },
    large: { queues: 200, exchanges: 50, bindings: 500 },
    enterprise: { queues: 1000, exchanges: 100, bindings: 2000 }
  };

  const config = configs[scale];
  
  // Generate exchanges
  const exchanges = Array.from({ length: config.exchanges }, (_, i) => ({
    name: `exchange-${i}`,
    vhost: '/',
    type: ['direct', 'fanout', 'topic', 'headers'][Math.floor(Math.random() * 4)] as 'direct' | 'fanout' | 'topic' | 'headers',
    durable: Math.random() > 0.3,
    internal: Math.random() > 0.8
  }));

  // Generate queues
  const queues = Array.from({ length: config.queues }, (_, i) => ({
    name: `queue-${i}`,
    vhost: '/',
    messages: Math.floor(Math.random() * 10000),
    consumers: Math.floor(Math.random() * 10),
    memory: Math.floor(Math.random() * 1000000),
    state: Math.random() > 0.1 ? 'running' : 'idle'
  }));

  // Generate bindings
  const bindings = Array.from({ length: config.bindings }, (_, i) => {
    const sourceExchange = exchanges[Math.floor(Math.random() * exchanges.length)];
    const targetQueue = queues[Math.floor(Math.random() * queues.length)];
    
    return {
      source: sourceExchange.name,
      destination: targetQueue.name,
      destination_type: 'queue' as const,
      routing_key: `route.${i}`,
      vhost: '/'
    };
  });

  return {
    queues,
    exchanges,
    bindings,
    connections: [] // Empty for test data
  };
};

interface PerformanceTestResult {
  scale: string;
  renderTime: number;
  frameRate: number;
  memoryUsage: number;
  nodeCount: number;
  edgeCount: number;
  success: boolean;
  error?: string;
}

export const PerformanceTestSuite: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<PerformanceTestResult[]>([]);
  const [selectedScale, setSelectedScale] = useState<'small' | 'medium' | 'large' | 'enterprise'>('small');
  const [testData, setTestData] = useState(() => generateTestTopology('small'));
  
  const performance = usePerformanceMonitor();

  // Generate new test data when scale changes
  const handleScaleChange = useCallback((scale: 'small' | 'medium' | 'large' | 'enterprise') => {
    setSelectedScale(scale);
    setTestData(generateTestTopology(scale));
  }, []);

  // Run performance test for a specific scale
  const runSingleTest = useCallback(async (scale: 'small' | 'medium' | 'large' | 'enterprise') => {
    return new Promise<PerformanceTestResult>((resolve) => {
      const testTopology = generateTestTopology(scale);
      
      // Simulate component mounting and rendering
      const startTime = performance.now();
      performance.startRender();
      
      // Simulate heavy operations
      setTimeout(() => {
        const endTime = performance.now();
        const renderTime = performance.endRender(`${scale}-test`);
        
        // Calculate performance metrics
        const result: PerformanceTestResult = {
          scale,
          renderTime: endTime - startTime,
          frameRate: renderTime > 0 ? Math.round(1000 / renderTime) : 60,
          memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
          nodeCount: testTopology.queues.length + testTopology.exchanges.length,
          edgeCount: testTopology.bindings.length,
          success: renderTime < 100, // Consider successful if under 100ms
          error: renderTime > 100 ? 'Render time exceeded threshold' : undefined
        };
        
        resolve(result);
      }, 100);
    });
  }, [performance]);

  // Run complete performance test suite
  const runTestSuite = useCallback(async () => {
    setIsRunning(true);
    setProgress(0);
    setResults([]);
    
    const scales: Array<'small' | 'medium' | 'large' | 'enterprise'> = ['small', 'medium', 'large', 'enterprise'];
    const newResults: PerformanceTestResult[] = [];
    
    for (let i = 0; i < scales.length; i++) {
      const scale = scales[i];
      setCurrentTest(`Testing ${scale} topology...`);
      setProgress((i / scales.length) * 100);
      
      try {
        const result = await runSingleTest(scale);
        newResults.push(result);
      } catch (error) {
        newResults.push({
          scale,
          renderTime: 0,
          frameRate: 0,
          memoryUsage: 0,
          nodeCount: 0,
          edgeCount: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setResults(newResults);
    setProgress(100);
    setCurrentTest('Tests completed');
    setIsRunning(false);
  }, [runSingleTest]);

  // Current stats from the performance monitor
  const currentStats = performance.getStats();

  // Memoized test data for the current scale
  const currentTestData = useMemo(() => testData, [testData]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Performance Test Suite</CardTitle>
          <p className="text-sm text-gray-600">
            Test the topology visualization performance with different data scales.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Button 
              onClick={runTestSuite} 
              disabled={isRunning}
              className="flex-1"
            >
              {isRunning ? 'Running Tests...' : 'Run Full Test Suite'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setResults([])}
              disabled={isRunning}
            >
              Clear Results
            </Button>
          </div>

          {isRunning && (
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span>{currentTest}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="live-test" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="live-test">Live Test</TabsTrigger>
          <TabsTrigger value="results">Test Results</TabsTrigger>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="live-test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Live Performance Test</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  {(['small', 'medium', 'large', 'enterprise'] as const).map((scale) => (
                    <Button
                      key={scale}
                      variant={selectedScale === scale ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleScaleChange(scale)}
                      disabled={isRunning}
                    >
                      {scale.charAt(0).toUpperCase() + scale.slice(1)}
                    </Button>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Queues:</span>
                    <div className="font-medium">{currentTestData.queues.length}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Exchanges:</span>
                    <div className="font-medium">{currentTestData.exchanges.length}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Bindings:</span>
                    <div className="font-medium">{currentTestData.bindings.length}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Render Time:</span>
                    <div className="font-medium">{currentStats.avg.toFixed(1)}ms</div>
                  </div>
                </div>

                <VirtualizedTopology
                  data={currentTestData}
                  height={400}
                  performanceMode={selectedScale === 'large' || selectedScale === 'enterprise'}
                  className="border rounded"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {results.length > 0 ? (
            <div className="grid gap-4">
              {results.map((result, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold capitalize">{result.scale} Topology</h3>
                      <Badge variant={result.success ? 'default' : 'destructive'}>
                        {result.success ? 'Pass' : 'Fail'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Render Time:</span>
                        <div className="font-medium">{result.renderTime.toFixed(1)}ms</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Frame Rate:</span>
                        <div className="font-medium">{result.frameRate} FPS</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Nodes/Edges:</span>
                        <div className="font-medium">{result.nodeCount}/{result.edgeCount}</div>
                      </div>
                    </div>

                    {result.error && (
                      <Alert className="mt-4">
                        <AlertDescription>{result.error}</AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500">No test results yet. Run the test suite to see performance metrics.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-600">Average Render Time:</span>
                  <div className="font-medium text-lg">{currentStats.avg}ms</div>
                </div>
                <div>
                  <span className="text-gray-600">Max Render Time:</span>
                  <div className="font-medium text-lg">{currentStats.max}ms</div>
                </div>
                <div>
                  <span className="text-gray-600">Min Render Time:</span>
                  <div className="font-medium text-lg">{currentStats.min}ms</div>
                </div>
                <div>
                  <span className="text-gray-600">Sample Count:</span>
                  <div className="font-medium text-lg">{currentStats.count}</div>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <h4 className="font-medium">Performance Guidelines</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Excellent (&lt; 16ms):</span>
                    <Badge variant="default">60+ FPS</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Good (16-33ms):</span>
                    <Badge variant="secondary">30-60 FPS</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Poor (&gt; 33ms):</span>
                    <Badge variant="destructive">&lt; 30 FPS</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
