import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

const AlertContext = createContext();

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};

export const AlertProvider = ({ children }) => {
    const [alert, setAlert] = useState({
        isOpen: false,
        message: '',
        type: 'info', // 'success', 'error', 'info'
        title: ''
    });

    const showAlert = useCallback((message, type = 'info', title = '') => {
        // Auto determine title if not provided
        let autoTitle = title;
        if (!autoTitle) {
            if (type === 'success') autoTitle = 'SUCCESS!';
            else if (type === 'error') autoTitle = 'GAME OVER';
            else autoTitle = 'NOTICE';
        }

        setAlert({
            isOpen: true,
            message,
            type,
            title: autoTitle
        });
    }, []);

    const hideAlert = useCallback(() => {
        setAlert(prev => ({ ...prev, isOpen: false }));
    }, []);

    return (
        <AlertContext.Provider value={{ showAlert, hideAlert }}>
            {children}
            <GameAlert
                isOpen={alert.isOpen}
                message={alert.message}
                type={alert.type}
                title={alert.title}
                onClose={hideAlert}
            />
        </AlertContext.Provider>
    );
};

const GameAlert = ({ isOpen, message, type, title, onClose }) => {
    if (!isOpen) return null;

    const colors = {
        success: { bg: 'bg-[#00E055]', border: 'border-black', icon: <CheckCircle size={48} className="text-black" /> },
        error: { bg: 'bg-[#FF2A2A]', border: 'border-black', icon: <AlertCircle size={48} className="text-white" /> },
        info: { bg: 'bg-[#face10]', border: 'border-black', icon: <Info size={48} className="text-black" /> }
    };

    const style = colors[type] || colors.info;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className={`${style.bg} border-4 ${style.border} p-0 rounded-2xl max-w-sm w-full shadow-[8px_8px_0_#000] relative overflow-hidden`}
                    >
                        {/* Header Bar */}
                        <div className="bg-black/10 p-2 flex justify-end">
                            <button onClick={onClose} className="text-black/50 hover:text-black">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 flex flex-col items-center text-center gap-4">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
                            >
                                {style.icon}
                            </motion.div>

                            <div>
                                <h3 className={`font-titan text-2xl uppercase tracking-wider mb-2 ${type === 'error' ? 'text-white' : 'text-black'}`}>
                                    {title}
                                </h3>
                                <p className={`font-mono text-sm leading-relaxed whitespace-pre-line ${type === 'error' ? 'text-white/90' : 'text-black/80'}`}>
                                    {message}
                                </p>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onClose}
                                className="mt-2 bg-black text-white font-titan px-8 py-3 rounded-full hover:bg-white hover:text-black transition-colors border-2 border-transparent hover:border-black"
                            >
                                {type === 'error' ? 'TRY AGAIN' : 'CONTINUE'}
                            </motion.button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
