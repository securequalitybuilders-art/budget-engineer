import { LocalIndexedDbTransport } from './transport';
import { createApiClient } from './client';

export * from './types';
export * from './transport';
export * from './client';

/**
 * Default local-first API client, backed by IndexedDB.
 * Swap `LocalIndexedDbTransport` for `HttpTransport` when a backend exists.
 */
export const api = createApiClient(new LocalIndexedDbTransport());
