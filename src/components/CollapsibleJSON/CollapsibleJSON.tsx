import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';
import './CollapsibleJSON.css';

interface CollapsibleJSONProps {
  data: unknown;
  defaultExpanded?: boolean;
  maxInitialDepth?: number;
  searchTerm?: string;
}

interface JSONNodeProps {
  keyName: string;
  value: unknown;
  depth: number;
  defaultExpanded: boolean;
  maxInitialDepth: number;
  searchTerm?: string;
  path: string;
  forceExpanded?: boolean;
}

function JSONNode({ keyName, value, depth, defaultExpanded, maxInitialDepth, searchTerm, path, forceExpanded }: JSONNodeProps) {
  const [isExpanded, setIsExpanded] = useState(
    defaultExpanded || depth < maxInitialDepth
  );
  const [copied, setCopied] = useState(false);

  // Update expansion state when forceExpanded changes
  useEffect(() => {
    if (forceExpanded !== undefined) {
      setIsExpanded(forceExpanded);
    }
  }, [forceExpanded]);

  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);
  const isEmpty = isObject && Object.keys(value).length === 0;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(JSON.stringify(value, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const toggleExpand = () => {
    if (isObject && !isEmpty) {
      setIsExpanded(!isExpanded);
    }
  };

  const renderValue = () => {
    if (value === null) return <span className="json-null">null</span>;
    if (value === undefined) return <span className="json-undefined">undefined</span>;
    if (typeof value === 'boolean') return <span className="json-boolean">{value.toString()}</span>;
    if (typeof value === 'number') return <span className="json-number">{value}</span>;
    if (typeof value === 'string') {
      const isHighlighted = searchTerm && value.toLowerCase().includes(searchTerm.toLowerCase());
      return <span className={`json-string ${isHighlighted ? 'highlighted' : ''}`}>"{value}"</span>;
    }
    
    if (isEmpty) {
      return <span className="json-empty">{isArray ? '[]' : '{}'}</span>;
    }

    if (!isExpanded) {
      const count = Object.keys(value).length;
      return (
        <span className="json-collapsed">
          {isArray ? '[' : '{'} {count} {count === 1 ? 'item' : 'items'} {isArray ? ']' : '}'}
        </span>
      );
    }

    return null;
  };

  const nodeClass = `json-node ${isObject && !isEmpty ? 'expandable' : ''}`;

  return (
    <div className={nodeClass} data-depth={depth}>
      <div className="json-node-header" onClick={toggleExpand}>
        {isObject && !isEmpty && (
          <span className="json-toggle">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
        <span className="json-key">{keyName}:</span>
        {renderValue()}
        {isObject && !isEmpty && (
          <button 
            className="json-copy-btn" 
            onClick={handleCopy}
            title="Copy value"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        )}
      </div>
      
      {isObject && !isEmpty && isExpanded && (
        <div className="json-children">
          {Object.entries(value as Record<string, unknown>).map(([key, val]) => (
            <JSONNode
              key={`${path}.${key}`}
              keyName={key}
              value={val}
              depth={depth + 1}
              defaultExpanded={defaultExpanded}
              maxInitialDepth={maxInitialDepth}
              searchTerm={searchTerm}
              path={`${path}.${key}`}
              forceExpanded={forceExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CollapsibleJSON({ 
  data, 
  defaultExpanded = false, 
  maxInitialDepth = 2,
  searchTerm 
}: CollapsibleJSONProps) {
  const [globalExpanded, setGlobalExpanded] = useState<boolean | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  const handleExpandAll = () => {
    setGlobalExpanded(current => current === true ? false : true);
  };

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const isEmpty = data === null || data === undefined || 
    (typeof data === 'object' && Object.keys(data).length === 0);

  if (isEmpty) {
    return (
      <div className="collapsible-json empty">
        <pre className="json-empty">{JSON.stringify(data, null, 2)}</pre>
      </div>
    );
  }

  return (
    <div className="collapsible-json">
      <div className="json-controls">
        <button 
          className="json-control-btn"
          onClick={handleExpandAll}
          title={globalExpanded === true ? "Collapse all" : "Expand all"}
        >
          {globalExpanded === true ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          {globalExpanded === true ? "Collapse All" : "Expand All"}
        </button>
        <button 
          className="json-control-btn"
          onClick={handleCopyAll}
          title="Copy JSON"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          Copy JSON
        </button>
      </div>
      
      <div className="json-tree">
        {typeof data === 'object' ? (
          Object.entries(data as Record<string, unknown>).map(([key, value]) => (
            <JSONNode
              key={key}
              keyName={key}
              value={value}
              depth={0}
              defaultExpanded={defaultExpanded}
              maxInitialDepth={maxInitialDepth}
              searchTerm={searchTerm}
              path={key}
              forceExpanded={globalExpanded}
            />
          ))
        ) : (
          <JSONNode
            keyName="value"
            value={data}
            depth={0}
            defaultExpanded={defaultExpanded}
            maxInitialDepth={maxInitialDepth}
            searchTerm={searchTerm}
            path="value"
            forceExpanded={globalExpanded}
          />
        )}
      </div>
    </div>
  );
}