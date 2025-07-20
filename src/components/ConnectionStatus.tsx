import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Activity, AlertCircle, Database, Cloud, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ConnectionStatusProps {
  isConnected: boolean;
  connectionAttempts: number;
  lastUpdateTime?: number;
}

interface ServerStatus {
  status: 'healthy' | 'demo' | 'degraded';
  dataSource: 'rabbitmq' | 'none';
  rabbitMQConnection: 'connected' | 'disconnected';
  message: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  connectionAttempts,
  lastUpdateTime
}) => {
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch server status
  const fetchServerStatus = async () => {
    try {
      const response = await fetch('http://localhost:8081/health');
      if (response.ok) {
        const status = await response.json();
        setServerStatus(status);
      }
    } catch (error) {
      console.error('Failed to fetch server status:', error);
    }
  };

  // Manual reconnection
  const handleReconnect = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8081/reconnect', {
        method: 'POST'
      });
      if (response.ok) {
        const result = await response.json();
        console.log('Reconnection result:', result);
        // Refresh status after reconnection attempt
        setTimeout(fetchServerStatus, 1000);
      }
    } catch (error) {
      console.error('Reconnection failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch status on mount and periodically
  useEffect(() => {
    fetchServerStatus();
    const interval = setInterval(fetchServerStatus, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    if (!serverStatus) {
      return <Activity size={16} className="text-gray-400" />;
    }

    switch (serverStatus.dataSource) {
      case 'rabbitmq':
        return <Database size={16} className="text-green-500" />;
      default:
        return <WifiOff size={16} className="text-red-500" />;
    }
  };

  const getStatusText = () => {
    if (!serverStatus) {
      return 'Checking server status...';
    }

    const baseText = serverStatus.message;
    if (isConnected && lastUpdateTime) {
      return `${baseText} • Last update: ${new Date(lastUpdateTime).toLocaleTimeString()}`;
    }
    
    if (connectionAttempts > 0 && serverStatus.dataSource === 'none') {
      return `${baseText} • ${connectionAttempts} reconnection attempts`;
    }
    
    return baseText;
  };

  const getStatusVariant = () => {
    if (!serverStatus) return 'default';
    
    switch (serverStatus.status) {
      case 'healthy': return 'default';
      case 'demo': return 'default';
      case 'degraded': return 'destructive';
      default: return 'destructive';
    }
  };

  const getDataSourceBadge = () => {
    if (!serverStatus) return null;

    switch (serverStatus.dataSource) {
      case 'rabbitmq':
        return (
          <span className="inline-flex items-center rounded-full border border-green-200 bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
            Live Data
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full border border-red-200 bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
            No Data
          </span>
        );
    }
  };

  return (
    <Alert variant={getStatusVariant()} className="mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <Activity size={16} className={isConnected ? 'text-green-500 animate-pulse' : 'text-gray-400'} />
          {!isConnected && serverStatus?.dataSource === 'none' && <AlertCircle size={16} />}
        </div>
        <div className="flex items-center gap-2">
          {getDataSourceBadge()}
          {serverStatus?.dataSource === 'none' && (
            <button
              onClick={handleReconnect}
              disabled={loading}
              className="inline-flex items-center justify-center h-6 px-2 text-xs border border-gray-300 bg-white hover:bg-gray-50 rounded disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <RefreshCw className="w-3 h-3 mr-1" />
              )}
              Retry
            </button>
          )}
        </div>
      </div>
      <AlertDescription className="mt-2">
        {getStatusText()}
      </AlertDescription>
    </Alert>
  );
};
