import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import {
    LayoutDashboard,
    PlusSquare,
    LogOut,
    Menu,
    Sparkles,
    Palette,
    Calendar,
    Monitor,
    CreditCard,
    Key,
    Shield,
    ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { ThemeToggle } from '../components/theme-toggle';
import { cn } from '../lib/cn';

const AdminLayout = () => {
    const { user, tenantRole } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        if (confirm('Are you sure you want to logout?')) {
            await supabase.auth.signOut();
            navigate('/login');
        }
    };

    const navGroups = [
        {
            title: 'Main',
            items: [
                { path: '/', label: 'Dashboard', icon: LayoutDashboard },
                { path: '/events', label: 'Events', icon: Calendar },
            ]
        },
        {
            title: 'Management',
            items: [
                { path: '/frames/new', label: 'New Frame', icon: PlusSquare },
                { path: '/filters', label: 'Filters', icon: Sparkles },
                { path: '/devices', label: 'Devices', icon: Monitor },
                { path: '/theme', label: 'Theme', icon: Palette },
            ]
        },
        {
            title: 'Settings',
            items: [
                { path: '/tokens', label: 'Access Tokens', icon: Key },
                { path: '/subscription', label: 'Subscription', icon: CreditCard },
            ]
        }
    ];

    const isActive = (path) => {
        if (path === '/' && location.pathname !== '/') return false;
        return location.pathname.startsWith(path);
    };

    const NavContent = ({ onNavigate }) => (
        <>
            <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
                {navGroups.map((group, index) => (
                    <div key={index} className="space-y-1">
                        <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            {group.title}
                        </h3>
                        {group.items.map((item) => {
                            const active = isActive(item.path);
                            return (
                                <Button
                                    key={item.path}
                                    variant={active ? 'secondary' : 'ghost'}
                                    className={cn(
                                        'w-full justify-start gap-3 font-medium',
                                        active && 'bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/20'
                                    )}
                                    onClick={() => {
                                        navigate(item.path);
                                        onNavigate?.();
                                    }}
                                >
                                    <item.icon className={cn('h-4 w-4', active ? 'text-primary' : 'text-muted-foreground')} />
                                    {item.label}
                                    {active && <ChevronRight className="ml-auto h-4 w-4 text-primary" />}
                                </Button>
                            );
                        })}
                    </div>
                ))}
            </nav>

            <div className="p-4 border-t">
                <div className="mb-3 px-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Signed in as</p>
                    <p className="text-sm font-medium truncate" title={user?.email}>
                        {user?.email}
                    </p>
                </div>
                {tenantRole === 'superadmin' && (
                    <Button
                        variant="default"
                        className="w-full mb-2 gap-2"
                        onClick={() => {
                            navigate('/matrix/dashboard');
                            onNavigate?.();
                        }}
                    >
                        <Shield className="h-4 w-4" />
                        Matrix Console
                    </Button>
                )}
                <Button
                    variant="ghost"
                    className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleLogout}
                >
                    <LogOut className="h-4 w-4" />
                    Logout
                </Button>
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-background text-foreground flex font-sans overflow-hidden">
            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex flex-col w-64 bg-card border-r z-20 relative">
                <div className="h-14 flex items-center gap-3 px-6 border-b">
                    <div className="bg-primary/10 p-2 rounded-lg text-primary">
                        <Sparkles size={18} />
                    </div>
                    <span className="font-bold text-lg tracking-tight">Pixenze</span>
                </div>

                <NavContent />
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b z-50 h-14 px-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-1.5 rounded-md text-primary">
                        <Sparkles size={16} />
                    </div>
                    <span className="font-bold text-lg tracking-tight">Pixenze</span>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-72 flex flex-col">
                            <SheetHeader className="p-4 border-b">
                                <SheetTitle className="flex items-center gap-2">
                                    <Sparkles size={18} className="text-primary" />
                                    Pixenze
                                </SheetTitle>
                            </SheetHeader>
                            <NavContent onNavigate={() => setIsMobileMenuOpen(false)} />
                        </SheetContent>
                    </Sheet>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 relative z-10 overflow-y-auto h-screen md:pt-0 pt-14">
                <div className="hidden md:flex items-center justify-end px-6 h-14 border-b">
                    <ThemeToggle />
                </div>
                <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto min-h-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
