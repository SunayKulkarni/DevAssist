import { io } from "socket.io-client";

let socketInstance = null;

export const initializeSocket = (projectId) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    socketInstance = io(import.meta.env.VITE_API_URL, {
        auth: { token },
        query: { projectId },
    });
    return socketInstance;
}

export const recieveMessage = (eventName, callback) => {
    if (!socketInstance) return;
    socketInstance.on(eventName, callback);
}
export const sendMessage = (eventName, data) => {
    if (!socketInstance) return;
    socketInstance.emit(eventName, data);
}