import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, AlertTriangle, RefreshCw } from 'lucide-react';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 font-nunito flex flex-col items-center justify-center relative overflow-hidden p-4">

            {/* Background Pattern */}
            <div className="absolute inset-0 pattern-dots text-slate-200/50" style={{ backgroundImage: 'radial-gradient(currentColor 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="z-10 text-center flex flex-col items-center max-w-lg w-full bg-white p-10 rounded-3xl border border-slate-200 shadow-xl"
            >
                <div className="relative mb-6">
                    <h1 className="text-8xl md:text-9xl font-extrabold text-blue-600 tracking-tighter relative z-10 drop-shadow-sm">
                        404
                    </h1>
                </div>

                <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-6 w-full"
                >
                    <div className="inline-block">
                        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                            Page Not Found
                        </h2>
                    </div>

                    <p className="text-base md:text-lg text-slate-500 font-medium mb-8 max-w-sm mx-auto">
                        We can't seem to find the page you're looking for. It might have been moved, deleted, or never existed.
                    </p>

                    <div className="flex flex-col gap-3 justify-center items-center w-full mt-4">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate('/')}
                            className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:bg-blue-700 hover:shadow-lg transition-all"
                        >
                            <Home size={20} />
                            Go Back Home
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => window.location.reload()}
                            className="w-full bg-white text-slate-700 border border-slate-300 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <RefreshCw size={20} />
                            Refresh Page
                        </motion.button>
                    </div>
                </motion.div>
            </motion.div>

            {/* Decorative Floating Elements */}
            <motion.div
                animate={{
                    y: [0, -15, 0],
                }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                className="absolute top-24 left-16 opacity-20 z-0 hidden md:block"
            >
                <AlertTriangle size={64} className="text-slate-400" />
            </motion.div>

            <motion.div
                animate={{
                    y: [0, 15, 0],
                }}
                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-24 right-16 opacity-20 z-0 hidden md:block"
            >
                <AlertTriangle size={80} className="text-blue-300" />
            </motion.div>

        </div>
    );
};

export default NotFound;
