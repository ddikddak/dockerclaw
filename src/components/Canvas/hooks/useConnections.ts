// ============================================
// Hook: Connection Management
// Manages connection state and rendering calculations
// ============================================

import { useState, useCallback, useMemo } from 'react';
import type { Block, Connection, ConnectionType } from '@/types';

export const CONNECTION_COLORS: Record<ConnectionType, string> = {
  notify: '#ef4444',    // red
  explains: '#22c55e',  // green
  displays: '#3b82f6',  // blue
  links: '#6b7280',     // gray
};

export const CONNECTION_LABELS: Record<ConnectionType, string> = {
  notify: 'Notifies',
  explains: 'Explains',
  displays: 'Displays',
  links: 'Links',
};

interface UseConnectionsOptions {
  initialConnections?: Connection[];
  onConnectionsChange?: (connections: Connection[]) => void;
}

interface ConnectionValidation {
  valid: boolean;
  type?: ConnectionType;
  reason?: string;
}

export interface UseConnectionsReturn {
  connections: Connection[];
  setConnections: (updater: Connection[] | ((prev: Connection[]) => Connection[])) => void;
  connectionsByBlockId: Map<string, string[]>;
  addConnection: (fromBlockId: string, toBlockId: string, fromType: Block['type'], toType: Block['type'], type: ConnectionType, label?: string) => void;
  removeConnection: (connectionId: string) => void;
  validateConnection: (fromType: Block['type'], toType: Block['type']) => ConnectionValidation;
  getConnectionColor: (type: ConnectionType) => string;
  getConnectionLabel: (type: ConnectionType) => string;
}

// Valid connection types between block pairs
const VALID_CONNECTIONS: Record<string, ConnectionType[]> = {
  'inbox:kanban': ['notify'],
  'inbox:table': ['notify'],
  'kanban:table': ['notify'],
  'table:kanban': ['notify'],
  'doc:kanban': ['explains'],
  'doc:table': ['explains'],
  'folder:doc': ['links'],
  'folder:kanban': ['links'],
  'heading:doc': ['displays'],
  'heading:kanban': ['displays'],
};

export function useConnections(options: UseConnectionsOptions = {}): UseConnectionsReturn {
  const { initialConnections = [], onConnectionsChange } = options;
  
  const [localConnections, setLocalConnections] = useState<Connection[]>(initialConnections);
  
  // Use external or local state
  const connections = onConnectionsChange ? initialConnections : localConnections;
  
  const setConnections = useCallback((
    updater: Connection[] | ((prev: Connection[]) => Connection[])
  ) => {
    const next = typeof updater === 'function' ? updater(connections) : updater;
    if (onConnectionsChange) {
      onConnectionsChange(next);
    } else {
      setLocalConnections(next);
    }
  }, [connections, onConnectionsChange]);

  // Pre-compute connection map for O(1) lookup
  const connectionsByBlockId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of connections) {
      const fromList = map.get(c.fromBlockId) || [];
      fromList.push(c.toBlockId);
      map.set(c.fromBlockId, fromList);
      
      const toList = map.get(c.toBlockId) || [];
      toList.push(c.fromBlockId);
      map.set(c.toBlockId, toList);
    }
    return map;
  }, [connections]);

  const addConnection = useCallback((
    fromBlockId: string,
    toBlockId: string,
    fromType: Block['type'],
    toType: Block['type'],
    type: ConnectionType,
    label?: string
  ) => {
    const newConnection: Connection = {
      id: crypto.randomUUID(),
      fromBlockId,
      toBlockId,
      fromType,
      toType,
      type,
      label,
      createdAt: new Date().toISOString(),
    };
    setConnections(prev => [...prev, newConnection]);
  }, [setConnections]);

  const removeConnection = useCallback((connectionId: string) => {
    setConnections(prev => prev.filter(c => c.id !== connectionId));
  }, [setConnections]);

  const validateConnection = useCallback((
    fromType: Block['type'],
    toType: Block['type']
  ): ConnectionValidation => {
    if (fromType === toType) {
      return { valid: false, reason: 'Cannot connect blocks of the same type' };
    }
    
    const key = `${fromType}:${toType}`;
    const validTypes = VALID_CONNECTIONS[key];
    
    if (!validTypes || validTypes.length === 0) {
      return { valid: false, reason: 'These block types cannot be connected' };
    }
    
    return { valid: true, type: validTypes[0] };
  }, []);

  const getConnectionColor = useCallback((type: ConnectionType): string => {
    return CONNECTION_COLORS[type] || '#6b7280';
  }, []);

  const getConnectionLabel = useCallback((type: ConnectionType): string => {
    return CONNECTION_LABELS[type] || type;
  }, []);

  return {
    connections,
    setConnections,
    connectionsByBlockId,
    addConnection,
    removeConnection,
    validateConnection,
    getConnectionColor,
    getConnectionLabel,
  };
}
