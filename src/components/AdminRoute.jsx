import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

const AdminRoute = ({ children }) => {
    const { user, loading, signOut } = useAuth();
    const [profileLoading, setProfileLoading] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);

    useEffect(() => {
        if (!user) { setProfileLoading(false); return; }

        const checkAccess = async () => {
            // Check user_profiles for tenant role (SaaS multi-tenant)
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('tenant_id, role')
                .eq('id', user.id)
                .maybeSingle();

            if (profile && ['owner', 'admin', 'superadmin'].includes(profile.role)) {
                setHasAccess(true);
            } else {
                // Fallback: legacy admin email check
                const ADMIN_EMAILS = [
                    'nnvnxx.10@gmail.com',
                    'admin@sparklebooth.com',
                    'pixenzebooth@gmail.com',
                    'nanda.addi.2301216@students.um.ac.id'
                ];
                setHasAccess(ADMIN_EMAILS.includes(user.email));
            }

            setProfileLoading(false);
        };

        checkAccess();
    }, [user]);

    if (loading || profileLoading) {
        return (
            <div className="h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
                <div className="animate-spin text-blue-600">
                    <svg className="w-10 h-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
                <p className="text-slate-500 font-semibold">Verifying access...</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!hasAccess) {
        return (
            <div className="h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800 p-8">
                <h1 className="text-2xl font-bold mb-4 text-red-600">Access Denied</h1>
                <p className="mb-8 text-center max-w-md text-slate-600">
                    You don't have admin access. Sign in with an owner or admin account. ({user.email})
                </p>
                <button
                    onClick={async () => { await signOut(); window.location.href = '/login'; }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
                >
                    Switch Account
                </button>
            </div>
        );
    }

    return children;
};

export default AdminRoute;
