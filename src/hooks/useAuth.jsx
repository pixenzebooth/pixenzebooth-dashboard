import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { useAlert } from '../context/AlertContext';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [tenantId, setTenantId] = useState(null);
    const [tenantRole, setTenantRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const { showAlert } = useAlert();

    // Resolve tenant info when user changes
    const resolveTenant = async (currentUser) => {
        if (!currentUser || !supabase) {
            setTenantId(null);
            setTenantRole(null);
            return;
        }
        try {
            const { data: tid } = await supabase.rpc('get_my_tenant_id');
            setTenantId(tid || null);

            const { data: profiles } = await supabase
                .from('user_profiles')
                .select('role')
                .eq('id', currentUser.id)
                .maybeSingle();
            setTenantRole(profiles?.role || null);
        } catch (e) {
            console.warn('Could not resolve tenant:', e);
        }
    };

    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            return;
        }

        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            resolveTenant(currentUser).then(() => setLoading(false));
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            resolveTenant(currentUser);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        if (!supabase) {
            showAlert("Backend not configured. Cannot login.", "error");
            return;
        }
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            }
        });
        if (error) {
            console.error("Login Error:", error);
            showAlert(`Login Failed: ${error.message}\n(Hint: Did you enable the Google Provider in your Supabase Dashboard?)`, "error");
        }
    };

    const signOut = async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
        setTenantId(null);
        setTenantRole(null);
    };

    const signInAnonymously = async () => {
        if (!supabase) return;
        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
            console.error(error);
            showAlert(`Guest Login Failed: ${error.message}\n(Make sure 'Anonymous Sign-ins' is enabled in Supabase Auth Providers)`, "error");
        }
    };

    return (
        <AuthContext.Provider value={{ user, tenantId, tenantRole, loading, signInWithGoogle, signInAnonymously, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
