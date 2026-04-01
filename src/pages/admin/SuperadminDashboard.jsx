import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../context/AlertContext';
import {
    Shield, Settings, Save, X, Search, Activity, Users, CreditCard,
    Monitor, Trash2, Filter, ArrowUpRight, TrendingUp, Calendar,
    Mail, Heart, Zap, Loader2
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../lib/cn';

export default function SuperadminDashboard() {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPlan, setFilterPlan] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const { showAlert } = useAlert();
    const { tenantRole } = useAuth();

    useEffect(() => {
        if (tenantRole === 'superadmin') fetchData();
    }, [tenantRole]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: tenantsData, error: tenantsError } = await supabase
                .from('tenants')
                .select(`*, subscriptions (*), user_profiles (email, role), devices (count), events (count)`)
                .order('created_at', { ascending: false });
            if (tenantsError) throw tenantsError;
            setTenants(tenantsData || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            showAlert('Failed to load global data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => {
        const total = tenants.length;
        const activeSub = tenants.filter(t => t.subscriptions?.[0]?.status === 'active').length;
        const proUsers = tenants.filter(t => t.subscriptions?.[0]?.plan === 'pro').length;
        const basicUsers = tenants.filter(t => t.subscriptions?.[0]?.plan === 'basic').length;
        const estRevenue = (proUsers * 750000) + (basicUsers * 350000);
        return { total, activeSub, proUsers, estRevenue };
    }, [tenants]);

    const handleEditClick = (tenant) => {
        const sub = tenant.subscriptions?.[0] || { plan: 'free', device_limit: 1, event_limit: 5, storage_limit: 500, status: 'active' };
        setEditForm({
            tenantName: tenant.name, tenantIsActive: tenant.is_active, subId: sub.id,
            plan: sub.plan, deviceLimit: sub.device_limit, eventLimit: sub.event_limit,
            storageLimit: sub.storage_limit, subStatus: sub.status,
            expiresAt: sub.expires_at ? new Date(sub.expires_at).toISOString().split('T')[0] : ''
        });
        setEditingId(tenant.id);
    };

    const handleSave = async (tenantId) => {
        try {
            const { error: tError } = await supabase.from('tenants').update({ name: editForm.tenantName, is_active: editForm.tenantIsActive }).eq('id', tenantId);
            if (tError) throw tError;
            const subPayload = { plan: editForm.plan, device_limit: parseInt(editForm.deviceLimit), event_limit: parseInt(editForm.eventLimit), storage_limit: parseInt(editForm.storageLimit), status: editForm.subStatus, expires_at: editForm.expiresAt || null };
            if (editForm.subId) {
                const { error: sError } = await supabase.from('subscriptions').update(subPayload).eq('id', editForm.subId);
                if (sError) throw sError;
            } else {
                const { error: sError } = await supabase.from('subscriptions').insert([{ tenant_id: tenantId, ...subPayload }]);
                if (sError) throw sError;
            }
            showAlert('Tenant data updated successfully', 'success');
            setEditingId(null);
            fetchData();
        } catch (error) {
            showAlert('Failed to save changes', 'error');
        }
    };

    const deleteTenant = async (id, name) => {
        if (!window.confirm(`⚠️ WARNING: Are you sure you want to delete "${name}"? This will delete ALL their events, photos, and frames forever.`)) return;
        try {
            const { error } = await supabase.from('tenants').delete().eq('id', id);
            if (error) throw error;
            showAlert('Tenant and all associated data deleted', 'success');
            fetchData();
        } catch (e) {
            showAlert('Failed to delete tenant', 'error');
        }
    };

    const filteredTenants = useMemo(() => {
        return tenants.filter(t => {
            const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.slug.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesPlan = filterPlan === 'all' || (t.subscriptions?.[0]?.plan === filterPlan);
            const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' ? t.is_active : !t.is_active);
            return matchesSearch && matchesPlan && matchesStatus;
        });
    }, [tenants, searchTerm, filterPlan, filterStatus]);

    if (tenantRole !== 'superadmin') {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center min-h-[60vh]">
                <Shield className="w-16 h-16 text-zinc-600 mb-4" />
                <h2 className="text-xl font-bold text-zinc-300">Access Restricted</h2>
                <p className="text-zinc-500 mt-2 text-sm">Superadmin clearance required.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Superadmin Center</h1>
                    <p className="text-zinc-500 text-sm mt-1">Global tenant management and monitoring.</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                    Refresh
                </Button>
            </div>

            {/* Quick Navigation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-rose-600 to-rose-700 border-rose-500/20 cursor-pointer hover:shadow-xl hover:shadow-rose-500/10 transition-all group" onClick={() => window.location.href = '/matrix/pulse'}>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                                <Heart className="h-6 w-6 text-white" fill="currentColor" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">The Pulse</h3>
                                <p className="text-rose-200/70 text-sm">Real-time photo ingestion monitor</p>
                            </div>
                        </div>
                        <ArrowUpRight className="h-5 w-5 text-white/50 group-hover:text-white transition-colors" />
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-primary to-indigo-700 border-primary/20 cursor-pointer hover:shadow-xl hover:shadow-primary/10 transition-all group" onClick={() => window.location.href = '/matrix/storage'}>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                                <Monitor className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Infrastructure</h3>
                                <p className="text-blue-200/70 text-sm">Storage analytics & cost projections</p>
                            </div>
                        </div>
                        <ArrowUpRight className="h-5 w-5 text-white/50 group-hover:text-white transition-colors" />
                    </CardContent>
                </Card>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Vendors" value={stats.total} icon={Users} />
                <StatCard label="Active Subs" value={stats.activeSub} icon={CreditCard} />
                <StatCard label="Pro Users" value={stats.proUsers} icon={TrendingUp} />
                <StatCard label="Est. Revenue" value={`Rp ${(stats.estRevenue / 1000).toLocaleString()}k`} icon={ArrowUpRight} />
            </div>

            {/* Filter & Table */}
            <Card className="bg-zinc-900/50 border-zinc-800">
                <div className="p-4 border-b border-zinc-800 flex flex-col lg:flex-row gap-3 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-4 w-4" />
                        <Input placeholder="Search vendors..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            className="pl-10 bg-zinc-800/50 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-primary/30" />
                    </div>
                    <div className="flex gap-2 items-center">
                        <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-medium text-zinc-400 outline-none focus:ring-1 focus:ring-primary/30">
                            <option value="all">All Plans</option>
                            <option value="free">Free</option>
                            <option value="basic">Basic</option>
                            <option value="pro">Pro</option>
                        </select>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-medium text-zinc-400 outline-none focus:ring-1 focus:ring-primary/30">
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-6 space-y-3">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full bg-zinc-800" />)}
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-xs font-semibold uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
                                    <th className="py-3 px-6">Vendor</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-center">Plan</th>
                                    <th className="py-3 px-4 text-center">Resources</th>
                                    <th className="py-3 px-4 text-center">Expires</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence mode="popLayout">
                                    {filteredTenants.map((tenant) => {
                                        const sub = tenant.subscriptions?.[0] || {};
                                        const isEditing = editingId === tenant.id;
                                        const owner = tenant.user_profiles?.find(p => p.role === 'owner' || p.role === 'admin') || tenant.user_profiles?.[0];

                                        return (
                                            <motion.tr layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                key={tenant.id} className={cn("border-b border-zinc-800/50 group transition-colors", isEditing ? 'bg-primary/5' : 'hover:bg-zinc-800/30')}>
                                                <td className="py-4 px-6">
                                                    {isEditing ? (
                                                        <Input value={editForm.tenantName} onChange={e => setEditForm({ ...editForm, tenantName: e.target.value })}
                                                            className="bg-zinc-800 border-zinc-700 text-white" />
                                                    ) : (
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 bg-gradient-to-br from-primary to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">
                                                                {tenant.name.charAt(0)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-semibold text-zinc-200 text-sm truncate">{tenant.name}</p>
                                                                <p className="text-[11px] text-zinc-500 flex items-center gap-1 truncate">
                                                                    <Mail size={10} /> {owner?.email || 'N/A'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="py-4 px-4">
                                                    {isEditing ? (
                                                        <select value={editForm.tenantIsActive} onChange={e => setEditForm({ ...editForm, tenantIsActive: e.target.value === 'true' })}
                                                            className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none">
                                                            <option value="true">Active</option>
                                                            <option value="false">Suspended</option>
                                                        </select>
                                                    ) : (
                                                        <div>
                                                            <p className="text-[10px] text-zinc-600 font-mono mb-1 truncate max-w-[100px]">{tenant.slug}</p>
                                                            <Badge variant={tenant.is_active ? 'success' : 'destructive'} className="text-[10px]">
                                                                {tenant.is_active ? 'Active' : 'Suspended'}
                                                            </Badge>
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="py-4 px-4 text-center">
                                                    {isEditing ? (
                                                        <select value={editForm.plan} onChange={e => setEditForm({ ...editForm, plan: e.target.value })}
                                                            className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none">
                                                            <option value="free">Free</option>
                                                            <option value="basic">Basic</option>
                                                            <option value="pro">Pro</option>
                                                        </select>
                                                    ) : (
                                                        <Badge variant="outline" className={cn("uppercase text-[10px] font-bold", getPlanColor(sub.plan))}>
                                                            {sub.plan || 'None'}
                                                        </Badge>
                                                    )}
                                                </td>

                                                <td className="py-4 px-4">
                                                    {isEditing ? (
                                                        <div className="grid grid-cols-3 gap-1.5">
                                                            <LimitInput label="Dev" value={editForm.deviceLimit} onChange={v => setEditForm({ ...editForm, deviceLimit: v })} />
                                                            <LimitInput label="Evt" value={editForm.eventLimit} onChange={v => setEditForm({ ...editForm, eventLimit: v })} />
                                                            <LimitInput label="Str" value={editForm.storageLimit} onChange={v => setEditForm({ ...editForm, storageLimit: v })} />
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-center gap-3">
                                                            <Metric current={tenant.devices?.[0]?.count || 0} limit={sub.device_limit || 1} icon={Monitor} label="Dev" />
                                                            <Metric current={tenant.events?.[0]?.count || 0} limit={sub.event_limit || 5} icon={Calendar} label="Evt" />
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="py-4 px-4 text-center">
                                                    {isEditing ? (
                                                        <input type="date" value={editForm.expiresAt} onChange={e => setEditForm({ ...editForm, expiresAt: e.target.value })}
                                                            className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none" />
                                                    ) : (
                                                        <div>
                                                            <p className="text-xs text-zinc-400">{sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : '∞'}</p>
                                                            <p className="text-[10px] text-zinc-600">{getDaysRemaining(sub.expires_at)} days</p>
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="py-4 px-4 text-right">
                                                    {isEditing ? (
                                                        <div className="flex justify-end gap-1.5">
                                                            <Button size="icon" className="h-8 w-8 bg-primary hover:bg-primary/90" onClick={() => handleSave(tenant.id)}>
                                                                <Save className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={() => setEditingId(null)}>
                                                                <X className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-primary hover:bg-primary/10" onClick={() => handleEditClick(tenant)}>
                                                                <Settings className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => deleteTenant(tenant.id, tenant.name)}>
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>
        </div>
    );
}

const StatCard = ({ label, value, icon: Icon }) => (
    <Card className="bg-zinc-900/50 border-zinc-800 p-5 hover:border-zinc-700 transition-colors">
        <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
            </div>
        </div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-zinc-100 tracking-tight">{value}</h3>
    </Card>
);

const Metric = ({ current, limit, label, icon: Icon }) => {
    const isFull = current >= limit;
    return (
        <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 mb-1 text-zinc-500">
                <Icon size={10} />
                <span className="text-[9px] font-semibold uppercase">{label}</span>
            </div>
            <div className="flex items-baseline gap-0.5">
                <span className={cn("font-bold text-sm", isFull ? 'text-red-400' : 'text-zinc-200')}>{current}</span>
                <span className="text-zinc-600 text-[10px]">/{limit}</span>
            </div>
        </div>
    );
};

const LimitInput = ({ label, value, onChange }) => (
    <div className="flex flex-col gap-1">
        <label className="text-[9px] font-semibold text-zinc-500 uppercase text-center">{label}</label>
        <input type="number" value={value} onChange={e => onChange(e.target.value)}
            className="w-full p-1.5 text-center bg-zinc-800 border border-zinc-700 rounded-lg font-medium text-white text-xs outline-none focus:border-primary/50" />
    </div>
);

const getPlanColor = (plan) => {
    switch (plan) {
        case 'pro': return 'border-violet-500/50 text-violet-400';
        case 'basic': return 'border-cyan-500/50 text-cyan-400';
        case 'free': return 'border-zinc-600 text-zinc-400';
        default: return 'border-zinc-700 text-zinc-500';
    }
};

const getDaysRemaining = (date) => {
    if (!date) return '∞';
    const diff = new Date(date) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};
