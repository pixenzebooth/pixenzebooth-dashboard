import React, { createContext, useContext, useCallback } from 'react';
import { toast } from 'sonner';

const AlertContext = createContext();

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};

export const AlertProvider = ({ children }) => {
    const showAlert = useCallback((message, type = 'info', title = '') => {
        const options = {};
        if (title) options.description = message;

        const displayMessage = title || message;

        switch (type) {
            case 'success':
                toast.success(displayMessage, title ? { description: message } : undefined);
                break;
            case 'error':
                toast.error(displayMessage, title ? { description: message } : undefined);
                break;
            default:
                toast.info(displayMessage, title ? { description: message } : undefined);
                break;
        }
    }, []);

    const hideAlert = useCallback(() => {
        toast.dismiss();
    }, []);

    return (
        <AlertContext.Provider value={{ showAlert, hideAlert }}>
            {children}
        </AlertContext.Provider>
    );
};
