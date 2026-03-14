import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Navigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const Login = () => {
    const { user, signInWithGoogle } = useAuth();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    if (user) {
        // Already logged in, redirect to dashboard
        // Use a useEffect or render Navigate to avoid bad setState during render if strict mode, but Navigate component is safe
        return <Navigate to="/" replace />;
    }

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.origin
            }
        });
        if (error) {
            setMessage('Error: ' + error.message);
        } else {
            setMessage('Magic link sent! Check your email.');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center font-nunito p-4">
            <div className="bg-white border border-slate-200 p-8 sm:p-10 rounded-3xl shadow-xl max-w-md w-full relative overflow-hidden">
                <div className="absolute -top-10 -right-10 bg-blue-50 text-blue-100 rounded-full w-40 h-40 flex items-center justify-center opacity-50 pointer-events-none">
                    <Sparkles size={80} />
                </div>

                <div className="relative z-10 mb-8 text-center">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-blue-600/20">
                        <span className="text-white font-extrabold text-2xl tracking-tighter">PX</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Admin Portal</h1>
                    <p className="text-slate-500 mt-2 text-sm">Sign in to manage your photobooth operations</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5 relative z-10">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                            placeholder="admin@example.com"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-blue-700 hover:shadow-lg focus:ring-4 focus:ring-blue-100 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Sending Link...
                            </>
                        ) : 'Send Magic Link'}
                    </button>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-3 text-slate-400 font-semibold tracking-wider">or continue with</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={signInWithGoogle}
                        className="w-full bg-white text-slate-700 font-semibold py-3 px-4 rounded-xl border border-slate-300 shadow-sm hover:bg-slate-50 transition-all flex justify-center items-center gap-3"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Google
                    </button>
                </form>

                {message && (
                    <div className="mt-6 p-4 bg-emerald-50 text-emerald-800 rounded-xl text-center text-sm font-medium border border-emerald-200 relative z-10">
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Login;
