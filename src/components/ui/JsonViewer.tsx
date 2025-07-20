import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { Button } from './button';
import { useToast } from '@/hooks/use-toast';

type JsonValue = string | number | boolean | null | JsonObject | JsonArray | unknown;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];

interface JsonViewerProps {
  data: JsonValue | unknown;
  name?: string;
  defaultExpanded?: boolean;
  maxDepth?: number;
  currentDepth?: number;
}

interface JsonNodeProps {
  data: JsonValue;
  name?: string;
  isLast?: boolean;
  depth: number;
  maxDepth: number;
  path: string[];
}

const JsonNode: React.FC<JsonNodeProps> = ({ 
  data, 
  name, 
  isLast = false, 
  depth, 
  maxDepth,
  path 
}) => {
  const [isExpanded, setIsExpanded] = useState(depth < 2); // Auto-expand first 2 levels
  const { toast } = useToast();

  const getDataType = (value: JsonValue): string => {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  };

  const getValueColor = (type: string): string => {
    switch (type) {
      case 'string': return 'text-green-600';
      case 'number': return 'text-blue-600';
      case 'boolean': return 'text-purple-600';
      case 'null': return 'text-gray-500';
      default: return 'text-gray-800';
    }
  };

  const copyPath = () => {
    const pathString = path.join('.');
    navigator.clipboard.writeText(pathString);
    toast({
      title: "Copied",
      description: `Path copied: ${pathString}`,
    });
  };

  const copyValue = () => {
    const value = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(value);
    toast({
      title: "Copied",
      description: "Value copied to clipboard",
    });
  };

  const renderValue = (value: JsonValue, type: string): React.ReactNode => {
    switch (type) {
      case 'string':
        return <span className={getValueColor(type)}>"{String(value)}"</span>;
      case 'number':
      case 'boolean':
        return <span className={getValueColor(type)}>{String(value)}</span>;
      case 'null':
        return <span className={getValueColor(type)}>null</span>;
      default:
        return null;
    }
  };

  const dataType = getDataType(data);
  const isExpandable = dataType === 'object' || dataType === 'array';
  const hasChildren = isExpandable && 
    ((dataType === 'object' && Object.keys(data as JsonObject).length > 0) ||
     (dataType === 'array' && (data as JsonArray).length > 0));

  const getCollectionInfo = (): string => {
    if (dataType === 'array') {
      return `Array(${(data as JsonArray).length})`;
    }
    if (dataType === 'object') {
      const keys = Object.keys(data as JsonObject);
      return `Object(${keys.length})`;
    }
    return '';
  };

  const renderChildren = (): React.ReactNode => {
    if (!isExpanded || !hasChildren) return null;

    if (dataType === 'array') {
      return (data as JsonArray).map((item: JsonValue, index: number) => (
        <JsonNode
          key={index}
          data={item}
          name={String(index)}
          isLast={index === (data as JsonArray).length - 1}
          depth={depth + 1}
          maxDepth={maxDepth}
          path={[...path, String(index)]}
        />
      ));
    }

    if (dataType === 'object') {
      const entries = Object.entries(data as JsonObject);
      return entries.map(([key, value], index) => (
        <JsonNode
          key={key}
          data={value}
          name={key}
          isLast={index === entries.length - 1}
          depth={depth + 1}
          maxDepth={maxDepth}
          path={[...path, key]}
        />
      ));
    }

    return null;
  };

  // Dynamic padding class generation for indentation
  const paddingClass = depth === 0 ? '' : 
    depth === 1 ? 'pl-4' :
    depth === 2 ? 'pl-8' :
    depth === 3 ? 'pl-12' :
    depth === 4 ? 'pl-16' :
    'pl-20'; // Cap at pl-20 for very deep nesting

  return (
    <div className="font-mono text-sm">
      <div className="flex items-center group hover:bg-muted/50 rounded px-1">
        <div className={`flex items-center flex-1 min-w-0 ${paddingClass}`}>
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 mr-1 hover:bg-muted"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          ) : (
            <div className="w-5" />
          )}

          {name && (
            <span className="text-blue-800 mr-1">
              "{name}":
            </span>
          )}

          {isExpandable ? (
            <span className="text-gray-600">
              {isExpanded ? (
                dataType === 'array' ? '[' : '{'
              ) : (
                `${dataType === 'array' ? '[...]' : '{...}'} ${getCollectionInfo()}`
              )}
            </span>
          ) : (
            renderValue(data, dataType)
          )}

          {!isExpanded && !isLast && <span className="text-gray-600">,</span>}
        </div>

        {/* Action buttons - show on hover */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ml-2">
          {path.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={copyPath}
              title="Copy path"
            >
              <span className="text-xs">📍</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={copyValue}
            title="Copy value"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Children */}
      {renderChildren()}

      {/* Closing bracket */}
      {isExpandable && isExpanded && hasChildren && (
        <div className={`text-gray-600 ${paddingClass}`}>
          {dataType === 'array' ? ']' : '}'}
          {!isLast && <span>,</span>}
        </div>
      )}
    </div>
  );
};

export const JsonViewer: React.FC<JsonViewerProps> = ({ 
  data, 
  name = 'root',
  defaultExpanded = true,
  maxDepth = 10,
  currentDepth = 0 
}) => {
  const { toast } = useToast();

  const copyAllJson = () => {
    const jsonString = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(jsonString);
    toast({
      title: "Copied",
      description: "Full JSON copied to clipboard",
    });
  };

  let parsedData: JsonValue = data;
  
  // If data is a string, try to parse it as JSON
  if (typeof data === 'string') {
    try {
      parsedData = JSON.parse(data);
    } catch {
      // If parsing fails, treat as plain string
      return (
        <div className="font-mono text-sm bg-muted p-3 rounded">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs text-muted-foreground">Plain Text</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => {
                navigator.clipboard.writeText(data);
                toast({
                  title: "Copied",
                  description: "Text copied to clipboard",
                });
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <div className="whitespace-pre-wrap break-words text-green-600">
            "{data}"
          </div>
        </div>
      );
    }
  }

  return (
    <div className="bg-muted p-3 rounded border">
      <div className="flex justify-between items-center mb-3 pb-2 border-b">
        <span className="text-xs font-medium text-muted-foreground">JSON Viewer</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyAllJson}
          className="h-6 text-xs gap-1"
        >
          <Copy className="h-3 w-3" />
          Copy All
        </Button>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        <JsonNode
          data={parsedData}
          depth={0}
          maxDepth={maxDepth}
          path={[]}
        />
      </div>
    </div>
  );
};

export default JsonViewer;
