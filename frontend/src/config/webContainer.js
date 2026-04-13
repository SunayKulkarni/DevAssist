import { WebContainer, WritableStream } from '@webcontainer/api';

// Store containers per project ID to avoid room conflicts
const containersByProjectId = new Map();
const initializationPromisesByProjectId = new Map();

const initializeWebContainer = async (projectId) => {
    try {
        console.log(`[WebContainer-${projectId}] Starting boot process...`);
        
        // Create a promise that resolves/rejects with explicit tracking
        const bootPromise = new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                console.error(`[WebContainer-${projectId}] TIMEOUT: boot() did not complete within 15s`);
                reject(new Error(`WebContainer.boot() timeout for project ${projectId}`));
            }, 15000);
            
            WebContainer.boot({
                workdirName: `workspace-${projectId}`,
            })
                .then(container => {
                    clearTimeout(timeoutId);
                    console.log(`[WebContainer-${projectId}] Boot promise resolved successfully`);
                    resolve(container);
                })
                .catch(error => {
                    clearTimeout(timeoutId);
                    console.error(`[WebContainer-${projectId}] Boot promise rejected:`, error?.message);
                    reject(error);
                });
        });
        
        const container = await bootPromise;
        console.log(`[WebContainer-${projectId}] Boot completed successfully`);
        
        console.log(`[WebContainer-${projectId}] Mounting initial file system...`);
        await container.mount({
            'package.json': {
                file: {
                    contents: JSON.stringify({
                        name: `workspace-${projectId}`,
                        version: '1.0.0',
                        type: 'module'
                    }, null, 2)
                }
            }
        });
        console.log(`[WebContainer-${projectId}] Initial mount completed`);

        return container;
    } catch (error) {
        console.error(`[WebContainer-${projectId}] Initialization failed:`, error?.message || error);
        console.error(`[WebContainer-${projectId}] Error stack:`, error?.stack);
        throw error;
    }
};

export const getWebContainer = async (projectId) => {
    if (!projectId) {
        throw new Error('projectId is required');
    }

    // If we already have an instance for this project, return it
    if (containersByProjectId.has(projectId)) {
        console.log(`[WebContainer-${projectId}] Returning cached instance`);
        return containersByProjectId.get(projectId);
    }

    // If we're in the process of initializing for this project, return the promise
    if (initializationPromisesByProjectId.has(projectId)) {
        console.log(`[WebContainer-${projectId}] Returning pending initialization promise`);
        return initializationPromisesByProjectId.get(projectId);
    }

    // Start initialization
    console.log(`[WebContainer-${projectId}] Starting new initialization...`);
    const initPromise = initializeWebContainer(projectId)
        .then(container => {
            console.log(`[WebContainer-${projectId}] Initialization promise resolved, caching instance`);
            containersByProjectId.set(projectId, container);
            initializationPromisesByProjectId.delete(projectId);
            return container;
        })
        .catch(error => {
            console.error(`[WebContainer-${projectId}] Initialization promise rejected:`, error?.message || error);
            // Reset initialization state on error
            containersByProjectId.delete(projectId);
            initializationPromisesByProjectId.delete(projectId);
            throw error;
        });

    initializationPromisesByProjectId.set(projectId, initPromise);
    return initPromise;
};

// Reset function for testing/development
export const resetWebContainer = (projectId) => {
    if (projectId) {
        console.log(`[WebContainer-${projectId}] Resetting container`);
        containersByProjectId.delete(projectId);
        initializationPromisesByProjectId.delete(projectId);
    } else {
        console.log('[WebContainer] Resetting all containers');
        containersByProjectId.clear();
        initializationPromisesByProjectId.clear();
    }
};

// Export WritableStream for use in components
export { WritableStream };