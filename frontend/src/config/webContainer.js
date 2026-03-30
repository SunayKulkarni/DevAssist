import { WebContainer } from '@webcontainer/api';

let webContainerInstance = null;
let initializationPromise = null;

const initializeWebContainer = async () => {
    try {
        console.log('[WebContainer] Starting boot process...');
        
        const bootPromise = WebContainer.boot({
            workdirName: 'workspace',
        });
        
        // Add a timeout to catch hanging promises
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('WebContainer.boot() timeout after 30s')), 30000)
        );
        
        const container = await Promise.race([bootPromise, timeoutPromise]);
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

export const getWebContainer = async () => {
    // If we already have an instance, return it
    if (webContainerInstance) {
        console.log('[WebContainer] Returning cached instance');
        return webContainerInstance;
    }

    // If we're in the process of initializing, return the promise
    if (initializationPromise) {
        console.log('[WebContainer] Returning pending initialization promise');
        return initializationPromise;
    }

    // Start initialization
    console.log('[WebContainer] Starting new initialization...');
    initializationPromise = initializeWebContainer()
        .then(container => {
            console.log('[WebContainer] Initialization promise resolved, caching instance');
            webContainerInstance = container;
            return container;
        })
        .catch(error => {
            console.error('[WebContainer] Initialization promise rejected:', error?.message || error);
            // Reset initialization state on error
            webContainerInstance = null;
            initializationPromise = null;
            throw error;
        });

    return initializationPromise;
};

// Reset function for testing/development
export const resetWebContainer = () => {
    webContainerInstance = null;
    initializationPromise = null;
};