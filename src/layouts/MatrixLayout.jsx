import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import {
    Shield,
    Database,
    Zap,
    LogOut,
    ArrowLeft,
    Globe
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { cn } from '../lib/cn';

const MatrixLayout = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        if (confirm('Are you sure you want to exit the Matrix?')) {
            await supabase.auth.signOut();
            navigate('/login');
        }
    };

    const navItems = [
        { path: '/matrix/dashboard', label: 'Nodes Control', icon: Shield },
        { path: '/matrix/storage', label: 'Storage Matrix', icon: Database },
        { path: '/matrix/pulse', label: 'Global Pulse', icon: Zap },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-300 flex font-sans overflow-hidden">
            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex flex-col w-72 bg-zinc-950 border-r border-zinc-800 z-20 relative">
                <div className="h-16 flex items-center gap-4 px-8 border-b border-zinc-800">
                    <div className="bg-primary p-2.5 rounded-xl text-primary-foreground shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                        <Globe size={22} />
                    </div>
                    <div>
                        <span className="font-bold text-xl text-white tracking-tight block leading-none">MATRIX</span>
                        <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Control Center</span>
                    </div>
                </div>

                <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
                    <p className="px-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-4">Core Systems</p>
                    {navItems.map((item) => {
                        const active = isActive(item.path);
                        return (
                            <Button
                                key={item.path}
                                variant="ghost"
                                className={cn(
                                    'w-full justify-start gap-3 h-12 rounded-xl font-semibold text-zinc-500 hover:text-white hover:bg-zinc-800/50',
                                    active && 'bg-primary text-white hover:bg-primary/90 hover:text-white shadow-[0_10px_25px_-5px_rgba(59,130,246,0.3)]'
                                )}
                                onClick={() => navigate(item.path)}
                            >
                                <item.icon className={cn('h-5 w-5', active ? 'text-white' : 'text-zinc-600')} />
                                {item.label}
                                {active && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_white]" />
                                )}
                            </Button>
                        );
                    })}

                    <Separator className="my-6 bg-zinc-800" />

                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 h-12 rounded-xl font-semibold text-zinc-500 hover:text-white hover:bg-zinc-800/50"
                        onClick={() => navigate('/')}
                    >
                        <ArrowLeft className="h-5 w-5" />
                        Exit to Standard CMS
                    </Button>
                </nav>

                <div className="p-6 border-t border-zinc-800 bg-black/20">
                    <div className="mb-6 px-2">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Operator</p>
                        <p className="text-sm font-semibold text-white truncate opacity-90">{user?.email}</p>
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full gap-2 h-11 rounded-xl font-bold text-xs uppercase tracking-widest bg-red-950/30 text-red-500 border border-red-500/20 hover:bg-red-600 hover:text-white hover:border-transparent"
                        onClick={handleLogout}
                    >
                        <LogOut className="h-4 w-4" />
                        Disconnect
                    </Button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 relative z-10 overflow-y-auto h-screen bg-zinc-950">
                <div className="p-8 lg:p-12 max-w-7xl mx-auto min-h-full relative z-10">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default MatrixLayout;
