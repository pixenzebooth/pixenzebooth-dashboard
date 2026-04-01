import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Navigate } from 'react-router-dom';
import { Sparkles, Mail, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';

const Login = () => {
    const { user, signInWithGoogle } = useAuth();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    if (user) {
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
        <div className="min-h-screen bg-background flex items-center justify-center font-sans p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center pb-2">
                    <div className="w-14 h-14 bg-primary rounded-xl mx-auto mb-3 flex items-center justify-center shadow-lg shadow-primary/20">
                        <span className="text-primary-foreground font-bold text-xl tracking-tighter">PX</span>
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">Admin Portal</CardTitle>
                    <CardDescription>Sign in to manage your photobooth operations</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pt-4">
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground" htmlFor="email">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10"
                                    placeholder="admin@example.com"
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Sending Link...
                                </>
                            ) : 'Send Magic Link'}
                        </Button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <Separator />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-3 text-muted-foreground font-medium">or continue with</span>
                        </div>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={signInWithGoogle}
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Google
                    </Button>

                    {message && (
                        <div className="p-3 bg-primary/10 text-primary rounded-lg text-center text-sm font-medium border border-primary/20">
                            {message}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default Login;
