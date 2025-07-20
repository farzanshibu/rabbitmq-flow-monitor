# Real-Time RabbitMQ Monitoring Implementation

## Overview

This implementation provides real-time monitoring of RabbitMQ topology and message flows using both Server-Sent Events (SSE) and WebSocket connections for maximum reliability and performance.

## Key Features

### 🔄 Real-Time Connectivity
- **Dual Transport Support**: Automatic failover between WebSocket and SSE
- **Auto-Reconnection**: Intelligent reconnection with exponential backoff
- **Connection Health Monitoring**: Heartbeat mechanism to ensure connection integrity

### 📊 Live Data Streams
- **Topology Updates**: Real-time notifications when queues, exchanges, or bindings change
- **Message Flow Visualization**: Live animation of messages flowing through the system
- **Node Metrics**: Real-time metrics for queues, exchanges, and consumers
- **Performance Monitoring**: Live throughput and latency measurements

### 🎛️ Enhanced User Experience
- **Transport Selection**: Choose between WebSocket, SSE, or auto-detection
- **Real-Time Toggle**: Switch between real-time and periodic refresh modes
- **Connection Status**: Visual indicators for connection health
- **Error Handling**: Graceful degradation when real-time features are unavailable

## Implementation Details

### Services

#### `realTimeRabbitMQService.ts`
Unified service that manages both SSE and WebSocket connections:
- Handles transport selection and failover
- Provides event-driven architecture for real-time updates
- Manages connection lifecycle and error recovery

#### `enhancedRabbitMQAPI.ts`
Enhanced API wrapper with retry logic and error handling:
- Automatic retry for failed requests
- Comprehensive error logging
- Fallback mechanisms for API failures

### Hooks

#### `useRealTimeData.ts`
Main hook for real-time data management:
- Manages metrics and message flow state
- Handles connection status and lifecycle
- Provides real-time data to components

#### `useRealTimeTopology.ts`
Specialized hook for topology data:
- Integrates with real-time service for topology updates
- Manages topology state and refresh logic
- Provides fallback to periodic refresh when needed

### Components

#### `RealTimeStatusPanel.tsx`
Comprehensive status and control panel:
- Connection status monitoring
- Transport selection controls
- Real-time metrics display
- Live message flow activity

#### `TopologyVisualization.tsx`
Enhanced topology visualization:
- Real-time node updates
- Live message flow animations
- Interactive node management
- Performance optimizations

## Usage Examples

### Basic Real-Time Data
```typescript
import { useRealTimeData } from '@/hooks/useRealTimeData';

const MyComponent = () => {
  const { 
    metrics, 
    messageFlows, 
    isConnected, 
    connectionStatus 
  } = useRealTimeData();

  return (
    <div>
      <p>Connection: {connectionStatus}</p>
      <p>Active Flows: {messageFlows.length}</p>
      <p>Node Metrics: {metrics.size}</p>
    </div>
  );
};
```

### Topology Management
```typescript
import { useRealTimeTopology } from '@/hooks/useRealTimeTopology';

const TopologyManager = () => {
  const {
    nodes,
    edges,
    isRealTimeEnabled,
    enableRealTime,
    disableRealTime
  } = useRealTimeTopology();

  return (
    <div>
      <button onClick={isRealTimeEnabled ? disableRealTime : enableRealTime}>
        {isRealTimeEnabled ? 'Disable' : 'Enable'} Real-Time
      </button>
      <p>Nodes: {nodes.length}, Edges: {edges.length}</p>
    </div>
  );
};
```

### Transport Configuration
```typescript
const { setTransportPreference } = useRealTimeData();

// Force WebSocket
setTransportPreference('websocket');

// Force SSE
setTransportPreference('sse');

// Auto-detect best transport
setTransportPreference('auto');
```

## Benefits Over Periodic Polling

### ⚡ Performance
- **Immediate Updates**: No waiting for next poll cycle
- **Reduced Latency**: Sub-second response to changes
- **Lower CPU Usage**: Event-driven instead of constant polling
- **Bandwidth Efficiency**: Only send data when changes occur

### 🔄 Reliability
- **Connection Recovery**: Automatic reconnection on failures
- **Graceful Degradation**: Falls back to polling if real-time fails
- **Transport Redundancy**: Multiple connection methods available
- **Error Resilience**: Comprehensive error handling and logging

### 👥 User Experience
- **Live Feedback**: Immediate visual updates
- **Real-Time Insights**: See system behavior as it happens
- **Interactive Controls**: Adjust real-time behavior on demand
- **Status Transparency**: Clear connection and health indicators

## Configuration

### Environment Variables
```bash
# WebSocket and SSE server configuration
VITE_RABBITMQ_HOST=localhost
VITE_WS_PORT=8080
VITE_SSE_PORT=8080
```

### Backend Requirements
The real-time features require a backend service that provides:
1. WebSocket endpoint at `/ws`
2. SSE endpoint at `/events`
3. Health check endpoint at `/health`
4. Topology API endpoints

## Monitoring and Debugging

### Connection Status
- Monitor connection health in the Real-Time tab
- Check browser developer console for detailed logs
- Use the RealTimeStatusPanel for live diagnostics

### Performance Monitoring
- Track message flow rates and patterns
- Monitor connection stability and reconnection attempts
- Observe resource usage and optimization effectiveness

### Error Handling
- All errors are logged with context for debugging
- Graceful fallbacks ensure system remains functional
- User notifications provide clear status updates

## Future Enhancements

### Planned Features
- Message content inspection in real-time
- Advanced filtering and routing visualization
- Historical playback of message flows
- Performance analytics and alerting
- Multi-cluster monitoring support

### Optimization Opportunities
- Message batching for high-throughput scenarios
- Selective subscription to specific topology changes
- Compression for large topology updates
- Client-side caching and state management improvements
