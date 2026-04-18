import { WebContainer } from '@webcontainer/api';

// Use a SINGLE shared WebContainer instance to avoid hitting instance limits
let webContainerInstance = null;
let initializationPromise = null;
let currentProjectId = null;

const initializeWebContainer = async () => {
    try {
        console.log('[WebContainer] Starting boot process...');
        console.log('[WebContainer] Environment:', typeof window !== 'undefined' ? 'browser' : 'server');
        
        // Check if WebContainer API is available
        if (typeof WebContainer === 'undefined') {
            throw new Error('WebContainer API is not available. Make sure @webcontainer/api is properly loaded.');
        }
        
        if (typeof WebContainer.boot !== 'function') {
            throw new Error('WebContainer.boot is not a function');
        }
        
        // Create a promise that resolves/rejects with explicit tracking
        const bootPromise = new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                console.error('[WebContainer] TIMEOUT: boot() did not complete within 30s');
                reject(new Error('WebContainer.boot() timeout - This may indicate a network issue or the WebContainer API is unavailable'));
            }, 30000);
            
            try {
                WebContainer.boot({
                    workdirName: 'workspace',
                })
                    .then(container => {
                        clearTimeout(timeoutId);
                        console.log('[WebContainer] Boot promise resolved successfully');
                        resolve(container);
                    })
                    .catch(error => {
                        clearTimeout(timeoutId);
                        console.error('[WebContainer] Boot promise rejected:', error?.message);
                        console.error('[WebContainer] Error details:', error);
                        
                        // Detect specific errors
                        const errorMsg = error?.message || String(error);
                        if (errorMsg.includes('already booted') || errorMsg.includes('max') || errorMsg.includes('instance')) {
                            console.warn('[WebContainer] Instance limit reached. Try refreshing the page or closing other tabs with this app.');
                        } else if (errorMsg.includes('Cross-Origin') || errorMsg.includes('COEP') || errorMsg.includes('COOP') || errorMsg.includes('SharedArrayBuffer')) {
                            console.warn('[WebContainer] COEP/COOP headers issue detected. The server must return proper security headers for WebContainer to function.');
                            console.warn('[WebContainer] Server should set: Cross-Origin-Opener-Policy: same-origin');
                            console.warn('[WebContainer] Server should set: Cross-Origin-Embedder-Policy: require-corp');
                        }
                        
                        reject(error);
                    });
            } catch (syncError) {
                clearTimeout(timeoutId);
                console.error('[WebContainer] Synchronous error during boot:', syncError?.message);
                reject(syncError);
            }
        });
        
        const container = await bootPromise;
        console.log('[WebContainer] Boot completed successfully');
        
        console.log('[WebContainer] Mounting initial file system...');
        await container.mount({
            'package.json': {
                file: {
                    contents: JSON.stringify({
                        name: 'workspace',
                        version: '1.0.0',
                        type: 'module'
                    }, null, 2)
                }
            }
        });
        console.log('[WebContainer] Initial mount completed');

        return container;
    } catch (error) {
        console.error('[WebContainer] Initialization failed:', error?.message || error);
        console.error('[WebContainer] Error stack:', error?.stack);
        throw error;
    }
};

export const getWebContainer = async (projectId) => {
    if (!projectId) {
        throw new Error('projectId is required');
    }

    // If web container exists and we haven't changed projects, return it
    if (webContainerInstance && currentProjectId === projectId) {
        console.log('[WebContainer] Returning cached instance for project:', projectId);
        return webContainerInstance;
    }

    // If we're initializing, return the promise
    if (initializationPromise) {
        console.log('[WebContainer] Returning pending initialization promise');
        try {
            const container = await initializationPromise;
            currentProjectId = projectId;
            return container;
        } catch (error) {
            // If initialization failed, reset state to retry
            initializationPromise = null;
            webContainerInstance = null;
            throw error;
        }
    }

    // Start initialization
    console.log('[WebContainer] Starting new initialization for project:', projectId);
    initializationPromise = initializeWebContainer()
        .then(container => {
            console.log('[WebContainer] Initialization resolved, caching instance');
            webContainerInstance = container;
            currentProjectId = projectId;
            return container;
        })
        .catch(error => {
            console.error('[WebContainer] Initialization failed:', error?.message || error);
            // Reset state on error
            webContainerInstance = null;
            initializationPromise = null;
            currentProjectId = null;
            throw error;
        });

    return initializationPromise;
};

// Reset function to cleanup
export const resetWebContainer = () => {
    console.log('[WebContainer] Resetting container');
    webContainerInstance = null;
    initializationPromise = null;
    currentProjectId = null;
};

// Call this when leaving a project/component unmounts
export const cleanupWebContainer = async () => {
    try {
        if (webContainerInstance) {
            console.log('[WebContainer] Cleaning up container');
            // Clear the workspace
            await webContainerInstance.mount({});
        }
    } catch (error) {
        console.warn('[WebContainer] Error during cleanup:', error?.message);
    } finally {
        webContainerInstance = null;
        initializationPromise = null;
        currentProjectId = null;
    }
};

