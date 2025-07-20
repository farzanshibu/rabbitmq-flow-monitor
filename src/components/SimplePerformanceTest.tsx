import React, { useState, useCallback, useMemo } from 'react';
import { VirtualizedTopology } from './VirtualizedTopology';
import { useOptimizedRabbitMQTopology } from '../hooks/useOptimizedRabbitMQTopology';
import { usePerformanceMonitor } from '../hooks/usePerformanceCache';

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
  nodeCount: number;
  edgeCount: number;
  success: boolean;
  error?: string;
}

export const SimplePerformanceTest: React.FC = () => {
  const [selectedScale, setSelectedScale] = useState<'small' | 'medium' | 'large' | 'enterprise'>('small');
  const [testResults, setTestResults] = useState<PerformanceTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testData, setTestData] = useState(() => generateTestTopology('small'));
  
  const performance = usePerformanceMonitor();

  // Generate new test data when scale changes
  const handleScaleChange = useCallback((scale: 'small' | 'medium' | 'large' | 'enterprise') => {
    setSelectedScale(scale);
    setTestData(generateTestTopology(scale));
  }, []);

  // Run a simple performance test
  const runPerformanceTest = useCallback(() => {
    setIsRunning(true);
    performance.startRender();
    
    // Simulate test execution
    setTimeout(() => {
      const renderTime = performance.endRender('performance-test');
      const stats = performance.getStats();
      
      const result: PerformanceTestResult = {
        scale: selectedScale,
        renderTime: stats.avg,
        frameRate: stats.avg > 0 ? Math.round(1000 / stats.avg) : 60,
        nodeCount: testData.queues.length + testData.exchanges.length,
        edgeCount: testData.bindings.length,
        success: stats.avg < 100,
        error: stats.avg > 100 ? 'Render time exceeded 100ms threshold' : undefined
      };
      
      setTestResults(prev => [result, ...prev.slice(0, 4)]); // Keep last 5 results
      setIsRunning(false);
    }, 1000);
  }, [performance, selectedScale, testData]);

  // Current stats from the performance monitor
  const currentStats = performance.getStats();

  return (
    <div className="space-y-6">
      {/* Test Controls */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Performance Test Suite</h3>
        <p className="text-sm text-gray-600 mb-4">
          Test the topology visualization performance with different data scales.
        </p>
        
        <div className="flex gap-4 mb-4">
          <button 
            onClick={runPerformanceTest} 
            disabled={isRunning}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isRunning ? 'Running Test...' : 'Run Performance Test'}
          </button>
          <button 
            onClick={() => setTestResults([])}
            disabled={isRunning}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
          >
            Clear Results
          </button>
        </div>

        {/* Scale Selection */}
        <div className="flex gap-2 mb-4">
          {(['small', 'medium', 'large', 'enterprise'] as const).map((scale) => (
            <button
              key={scale}
              onClick={() => handleScaleChange(scale)}
              disabled={isRunning}
              className={`px-3 py-1 rounded text-sm ${
                selectedScale === scale 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {scale.charAt(0).toUpperCase() + scale.slice(1)}
            </button>
          ))}
        </div>

        {/* Current Test Data Stats */}
        <div className="grid grid-cols-4 gap-4 text-sm mb-4">
          <div>
            <span className="text-gray-600">Queues:</span>
            <div className="font-medium">{testData.queues.length}</div>
          </div>
          <div>
            <span className="text-gray-600">Exchanges:</span>
            <div className="font-medium">{testData.exchanges.length}</div>
          </div>
          <div>
            <span className="text-gray-600">Bindings:</span>
            <div className="font-medium">{testData.bindings.length}</div>
          </div>
          <div>
            <span className="text-gray-600">Avg Render:</span>
            <div className="font-medium">{currentStats.avg.toFixed(1)}ms</div>
          </div>
        </div>
      </div>

      {/* Test Topology View */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <h4 className="text-md font-semibold mb-4">Test Topology ({selectedScale})</h4>
        <VirtualizedTopology
          data={testData}
          height={400}
          performanceMode={selectedScale === 'large' || selectedScale === 'enterprise'}
          className="border rounded"
        />
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h4 className="text-md font-semibold mb-4">Test Results</h4>
          <div className="space-y-3">
            {testResults.map((result, index) => (
              <div key={index} className="p-3 border rounded">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium capitalize">{result.scale} Topology</h5>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    result.success 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {result.success ? 'Pass' : 'Fail'}
                  </span>
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
                  <div className="mt-2 p-2 bg-red-50 text-red-700 text-sm rounded">
                    {result.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Performance Metrics */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <h4 className="text-md font-semibold mb-4">Performance Metrics</h4>
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

        <div className="mt-4 space-y-2">
          <h5 className="font-medium">Performance Guidelines</h5>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>Excellent (&lt; 16ms):</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">60+ FPS</span>
            </div>
            <div className="flex justify-between">
              <span>Good (16-33ms):</span>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">30-60 FPS</span>
            </div>
            <div className="flex justify-between">
              <span>Poor (&gt; 33ms):</span>
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">&lt; 30 FPS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
