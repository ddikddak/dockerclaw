// ============================================
// Offline Detection - Network status monitoring
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { logger } from './logger';

// ============================================
// Offline State Management
// ============================================

interface OfflineState {
  isOnline: boolean;
  wasOffline: boolean;
  offlineSince: number | null;
  lastOnlineAt: number | null;
}

let globalState: OfflineState = {
  isOnline: navigator.onLine,
  wasOffline: false,
  offlineSince: navigator.onLine ? null : Date.now(),
  lastOnlineAt: navigator.onLine ? Date.now() : null,
};

const listeners = new Set<(state: OfflineState) => void>();

function updateState(newState: Partial<OfflineState>) {
  globalState = { ...globalState, ...newState };
  listeners.forEach(listener => listener(globalState));
}

function notifyListeners() {
  listeners.forEach(listener => listener(globalState));
}

// ============================================
// Event Listeners
// ============================================

function handleOnline() {
  const now = Date.now();
  const offlineDuration = globalState.offlineSince ? now - globalState.offlineSince : 0;
  
  logger.info('Offline', 'Connection restored', {
    offlineDuration,
    offlineSince: globalState.offlineSince,
  });
  
  updateState({
    isOnline: true,
    wasOffline: true,
    offlineSince: null,
    lastOnlineAt: now,
  });
}

function handleOffline() {
  const now = Date.now();
  
  logger.warn('Offline', 'Connection lost', {
    wasOffline: globalState.wasOffline,
  });
  
  updateState({
    isOnline: false,
    offlineSince: now,
  });
}

// Initialize listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
}

// ============================================
// Public API
// ============================================

export function isOnline(): boolean {
  return globalState.isOnline;
}

export function isOffline(): boolean {
  return !globalState.isOnline;
}

export function getOfflineState(): OfflineState {
  return { ...globalState };
}

export function subscribe(callback: (state: OfflineState) => void): () => void {
  listeners.add(callback);
  // Immediately notify with current state
  callback(globalState);
  
  return () => {
    listeners.delete(callback);
  };
}

// ============================================
// React Hook
// ============================================

export function useOffline(): OfflineState {
  const [state, setState] = useState<OfflineState>(globalState);

  useEffect(() => {
    return subscribe(newState => {
      setState(newState);
    });
  }, []);

  return state;
}

// ============================================
// Queue for Offline Operations
// ============================================

interface QueuedOperation<T> {
  id: string;
  operation: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
  retries: number;
}

const operationQueue: QueuedOperation<unknown>[] = [];
let isProcessingQueue = false;

export function queueOperation<T>(operation: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const queuedOp: QueuedOperation<T> = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      operation,
      resolve,
      reject,
      timestamp: Date.now(),
      retries: 0,
    };

    if (isOffline()) {
      logger.info('Offline', 'Operation queued for when online', { operationId: queuedOp.id });
      operationQueue.push(queuedOp as QueuedOperation<unknown>);
    } else {
      // Execute immediately if online
      executeOperation(queuedOp);
    }
  });
}

async function executeOperation<T>(op: QueuedOperation<T>): Promise<void> {
  try {
    const result = await op.operation();
    op.resolve(result);
    logger.debug('Offline', 'Queued operation completed', { operationId: op.id });
  } catch (error) {
    op.retries++;
    
    if (op.retries < 3) {
      // Retry later
      logger.warn('Offline', 'Operation failed, will retry', {
        operationId: op.id,
        retries: op.retries,
        error: error instanceof Error ? error.message : error,
      });
      setTimeout(() => executeOperation(op), 1000 * op.retries);
    } else {
      op.reject(error instanceof Error ? error : new Error(String(error)));
      logger.error('Offline', 'Operation failed after retries', {
        operationId: op.id,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
}

async function processQueue() {
  if (isProcessingQueue || operationQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;
  logger.info('Offline', `Processing ${operationQueue.length} queued operations`);

  // Process operations in order
  while (operationQueue.length > 0 && isOnline()) {
    const op = operationQueue.shift();
    if (op) {
      await executeOperation(op as QueuedOperation<unknown>);
    }
  }

  isProcessingQueue = false;

  if (operationQueue.length > 0) {
    logger.warn('Offline', `${operationQueue.length} operations still queued (went offline again)`);
  }
}

// Process queue when coming back online
subscribe(state => {
  if (state.isOnline && state.wasOffline) {
    processQueue();
  }
});

// ============================================
// Sync Status
// ============================================

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncAt: number | null;
  pendingChanges: number;
  error: Error | null;
}

let syncStatus: SyncStatus = {
  isSyncing: false,
  lastSyncAt: null,
  pendingChanges: 0,
  error: null,
};

const syncListeners = new Set<(status: SyncStatus) => void>();

export function updateSyncStatus(update: Partial<SyncStatus>): void {
  syncStatus = { ...syncStatus, ...update };
  syncListeners.forEach(listener => listener(syncStatus));
}

export function getSyncStatus(): SyncStatus {
  return { ...syncStatus };
}

export function subscribeToSync(callback: (status: SyncStatus) => void): () => void {
  syncListeners.add(callback);
  callback(syncStatus);
  return () => syncListeners.delete(callback);
}

// ============================================
// Connectivity Test
// ============================================

export async function testConnectivity(url?: string): Promise<boolean> {
  const testUrl = url || '/api/health';
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(testUrl, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

// ============================================
// Background Sync (Service Worker)
// ============================================

export async function registerBackgroundSync(tag: string): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if ('sync' in registration) {
      await (registration as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register(tag);
      logger.debug('Offline', 'Background sync registered', { tag });
    }
  } catch (error) {
    logger.error('Offline', 'Failed to register background sync', error instanceof Error ? error : undefined);
  }
}
