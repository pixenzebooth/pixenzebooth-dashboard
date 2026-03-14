import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../context/AlertContext';
import {
    Shield,
    Settings,
    Save,
    X,
    Search,
    Activity,
    Users,
    CreditCard,
    Monitor,
    Trash2,
    Filter,
    ArrowUpRight,
    TrendingUp,
    Calendar,
    Mail
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';

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
        if (tenantRole === 'superadmin') {
            fetchData();
        }
    }, [tenantRole]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch tenants, subs, and profiles
            const { data: tenantsData, error: tenantsError } = await supabase
                .from('tenants')
                .select(`
                    *,
                    subscriptions (*),
                    user_profiles (email, role),
                    devices (count),
                    events (count)
                `)
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

        // Mock revenue estimation
        const estRevenue = (proUsers * 750000) + (basicUsers * 350000);

        return { total, activeSub, proUsers, estRevenue };
    }, [tenants]);

    const handleEditClick = (tenant) => {
        const sub = tenant.subscriptions?.[0] || {
            plan: 'free',
            device_limit: 1,
            event_limit: 5,
            storage_limit: 500,
            status: 'active'
        };
        setEditForm({
            tenantName: tenant.name,
            tenantIsActive: tenant.is_active,
            subId: sub.id,
            plan: sub.plan,
            deviceLimit: sub.device_limit,
            eventLimit: sub.event_limit,
            storageLimit: sub.storage_limit,
            subStatus: sub.status,
            expiresAt: sub.expires_at ? new Date(sub.expires_at).toISOString().split('T')[0] : ''
        });
        setEditingId(tenant.id);
    };

    const handleSave = async (tenantId) => {
        try {
            // Update tenant
            const { error: tError } = await supabase
                .from('tenants')
                .update({
                    name: editForm.tenantName,
                    is_active: editForm.tenantIsActive
                })
                .eq('id', tenantId);

            if (tError) throw tError;

            const subPayload = {
                plan: editForm.plan,
                device_limit: parseInt(editForm.deviceLimit),
                event_limit: parseInt(editForm.eventLimit),
                storage_limit: parseInt(editForm.storageLimit),
                status: editForm.subStatus,
                expires_at: editForm.expiresAt || null
            };

            // Update or Create subscription
            if (editForm.subId) {
                const { error: sError } = await supabase
                    .from('subscriptions')
                    .update(subPayload)
                    .eq('id', editForm.subId);
                if (sError) throw sError;
            } else {
                const { error: sError } = await supabase
                    .from('subscriptions')
                    .insert([{ tenant_id: tenantId, ...subPayload }]);
                if (sError) throw sError;
            }

            showAlert('Tenant data updated successfully', 'success');
            setEditingId(null);
            fetchData();
        } catch (error) {
            console.error('Save error:', error);
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
            const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.slug.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesPlan = filterPlan === 'all' || (t.subscriptions?.[0]?.plan === filterPlan);
            const matchesStatus = filterStatus === 'all' ||
                (filterStatus === 'active' ? t.is_active : !t.is_active);

            return matchesSearch && matchesPlan && matchesStatus;
        });
    }, [tenants, searchTerm, filterPlan, filterStatus]);

    if (tenantRole !== 'superadmin') {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-screen bg-slate-50">
                <Shield className="w-20 h-20 text-slate-200 mb-6" />
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">ACCESS RESTRICTED</h2>
                <p className="text-slate-500 mt-2 font-medium">You need superadmin clearance to enter this domain.</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
                            <Shield size={20} />
                        </div>
                        <span className="text-indigo-600 font-black text-xs uppercase tracking-[0.2em]">Matrix Control</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Superadmin Dashboard</h1>
                    <p className="text-slate-500 mt-1 font-medium">Global infrastructure management for PixenzeBooth SaaS.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        className={`p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all ${loading ? 'animate-spin' : ''}`}
                    >
                        <Activity size={20} className="text-slate-600" />
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-slate-900">
                <StatCard
                    label="Total Vendors"
                    value={stats.total}
                    icon={Users}
                    color="blue"
                    trend="+12% this month"
                />
                <StatCard
                    label="Active Subscriptions"
                    value={stats.activeSub}
                    icon={CreditCard}
                    color="indigo"
                />
                <StatCard
                    label="Pro Users"
                    value={stats.proUsers}
                    icon={TrendingUp}
                    color="purple"
                />
                <StatCard
                    label="Estimated Monthly Rev"
                    value={`Rp ${(stats.estRevenue / 1000).toLocaleString()}k`}
                    icon={ArrowUpRight}
                    color="emerald"
                />
            </div>

            {/* Filter & Table Container */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex flex-col lg:flex-row gap-4 justify-between">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by vendor name or slug..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-700"
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex gap-3 overflow-x-auto pb-2 lg:pb-0 scrollbar-none text-slate-900">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200">
                            <Filter size={14} className="text-slate-400" />
                            <select
                                value={filterPlan}
                                onChange={e => setFilterPlan(e.target.value)}
                                className="bg-transparent border-none outline-none font-bold text-xs text-slate-600 cursor-pointer"
                            >
                                <option value="all">ALL PLANS</option>
                                <option value="free">FREE</option>
                                <option value="basic">BASIC</option>
                                <option value="pro">PRO</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200">
                            <select
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                                className="bg-transparent border-none outline-none font-bold text-xs text-slate-600 cursor-pointer"
                            >
                                <option value="all">ALL STATUS</option>
                                <option value="active">ACTIVE</option>
                                <option value="suspended">SUSPENDED</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <th className="py-4 px-6">Vendor Profile</th>
                                <th className="py-4 px-6">Access Group</th>
                                <th className="py-4 px-6">Plan Matrix</th>
                                <th className="py-4 px-6 text-center">Limits</th>
                                <th className="py-4 px-6 text-center">Expiry</th>
                                <th className="py-4 px-6 text-right">Operations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <AnimatePresence mode="popLayout">
                                {filteredTenants.map((tenant) => {
                                    const sub = tenant.subscriptions?.[0] || {};
                                    const isEditing = editingId === tenant.id;
                                    const owner = tenant.user_profiles?.find(p => p.role === 'owner' || p.role === 'admin') || tenant.user_profiles?.[0];

                                    return (
                                        <motion.tr
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            key={tenant.id}
                                            className={`hover:bg-slate-50/50 transition-colors group ${isEditing ? 'bg-indigo-50/30' : ''}`}
                                        >
                                            <td className="py-5 px-6">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editForm.tenantName}
                                                        onChange={e => setEditForm({ ...editForm, tenantName: e.target.value })}
                                                        className="w-full px-3 py-2 border-2 border-indigo-100 rounded-xl outline-none focus:border-indigo-500 font-bold"
                                                    />
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-black text-sm">
                                                            {tenant.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-slate-900">{tenant.name}</p>
                                                            <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-0.5">
                                                                <Mail size={12} />
                                                                {owner?.email || 'No email registered'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>

                                            <td className="py-5 px-6">
                                                {isEditing ? (
                                                    <select
                                                        value={editForm.tenantIsActive}
                                                        onChange={e => setEditForm({ ...editForm, tenantIsActive: e.target.value === 'true' })}
                                                        className="w-full px-3 py-2 border-2 border-indigo-100 rounded-xl outline-none"
                                                    >
                                                        <option value="true">ACTIVE ✅</option>
                                                        <option value="false">SUSPENDED ❌</option>
                                                    </select>
                                                ) : (
                                                    <div>
                                                        <p className="text-[10px] font-mono text-slate-400 mb-1">ID: {tenant.slug}</p>
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${tenant.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                            {tenant.is_active ? 'Online' : 'Restricted'}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>

                                            <td className="py-5 px-6">
                                                {isEditing ? (
                                                    <div className="space-y-2">
                                                        <select
                                                            value={editForm.plan}
                                                            onChange={e => setEditForm({ ...editForm, plan: e.target.value })}
                                                            className="w-full px-2 py-1.5 border-2 border-indigo-100 rounded-lg"
                                                        >
                                                            <option value="free">FREE</option>
                                                            <option value="basic">BASIC</option>
                                                            <option value="pro">PRO</option>
                                                        </select>
                                                        <select
                                                            value={editForm.subStatus}
                                                            onChange={e => setEditForm({ ...editForm, subStatus: e.target.value })}
                                                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-[10px]"
                                                        >
                                                            <option value="active">SUB: ACTIVE</option>
                                                            <option value="past_due">SUB: PAST DUE</option>
                                                            <option value="canceled">SUB: CANCELED</option>
                                                        </select>
                                                    </div>
                                                ) : (
                                                    <div className={`p-3 rounded-2xl border ${getPlanStyle(sub.plan)}`}>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <span className="font-extrabold text-sm uppercase">{sub.plan || 'No Plan'}</span>
                                                            <Activity size={14} opacity={0.5} />
                                                        </div>
                                                        <div className="mt-1 flex items-center gap-1">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${sub.status === 'active' ? 'bg-current' : 'bg-rose-500'}`} />
                                                            <span className="text-[9px] font-bold uppercase opacity-70 leading-none">
                                                                {sub.status || 'OFFLINE'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>

                                            <td className="py-5 px-6">
                                                {isEditing ? (
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <LimitInput label="DEV" value={editForm.deviceLimit} onChange={v => setEditForm({ ...editForm, deviceLimit: v })} />
                                                        <LimitInput label="EVT" value={editForm.eventLimit} onChange={v => setEditForm({ ...editForm, eventLimit: v })} />
                                                        <LimitInput label="STR" value={editForm.storageLimit} onChange={v => setEditForm({ ...editForm, storageLimit: v })} />
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-center gap-2">
                                                        <Metric current={tenant.devices?.[0]?.count || 0} limit={sub.device_limit || 1} icon={Monitor} label="Devices" />
                                                        <Metric current={tenant.events?.[0]?.count || 0} limit={sub.event_limit || 5} icon={Calendar} label="Events" />
                                                    </div>
                                                )}
                                            </td>

                                            <td className="py-5 px-6 text-center">
                                                {isEditing ? (
                                                    <input
                                                        type="date"
                                                        value={editForm.expiresAt}
                                                        onChange={e => setEditForm({ ...editForm, expiresAt: e.target.value })}
                                                        className="px-2 py-1 text-xs border rounded outline-none"
                                                    />
                                                ) : (
                                                    <div className="text-center">
                                                        <p className="text-xs font-bold text-slate-700">
                                                            {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : 'LIFETIME'}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 mt-0.5">Ends in {getDaysRemaining(sub.expires_at)}d</p>
                                                    </div>
                                                )}
                                            </td>

                                            <td className="py-5 px-6 text-right">
                                                {isEditing ? (
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => handleSave(tenant.id)} className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200">
                                                            <Save size={18} />
                                                        </button>
                                                        <button onClick={() => setEditingId(null)} className="p-2 bg-slate-200 text-slate-600 rounded-xl">
                                                            <X size={18} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleEditClick(tenant)}
                                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                        >
                                                            <Settings size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteTenant(tenant.id, tenant.name)}
                                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

const StatCard = ({ label, value, icon: Icon, color, trend }) => {
    const colors = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100 shadow-blue-100',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-100',
        purple: 'bg-purple-50 text-purple-600 border-purple-100 shadow-purple-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-100',
    };
    return (
        <div className={`p-6 rounded-3xl border ${colors[color]} shadow-lg transition-transform hover:-translate-y-1`}>
            <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-white/60 rounded-xl backdrop-blur-sm">
                    <Icon size={24} />
                </div>
                {trend && <span className="text-[10px] font-black uppercase bg-white/60 px-2 py-1 rounded-lg backdrop-blur-sm">{trend}</span>}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">{label}</p>
            <h3 className="text-3xl font-black tracking-tight">{value}</h3>
        </div>
    );
};

const Metric = ({ current, limit, label, icon: Icon }) => {
    const isFull = current >= limit;
    const percentage = Math.min((current / limit) * 100, 100);

    return (
        <div className={`flex flex-col items-center p-2 rounded-xl w-16 border ${isFull ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
            <div className="flex items-center gap-1 mb-1 text-slate-400">
                <Icon size={10} />
                <span className="text-[7px] font-black uppercase tracking-tighter">{label}</span>
            </div>
            <div className="flex items-baseline gap-0.5">
                <span className={`font-black text-xs ${isFull ? 'text-rose-600' : 'text-slate-900'}`}>{current}</span>
                <span className="text-slate-300 text-[8px]">/</span>
                <span className="text-slate-400 font-bold text-[9px]">{limit}</span>
            </div>

            {/* Tiny Progress Bar */}
            <div className="w-full h-1 bg-slate-200 mt-1.5 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-500 ${isFull ? 'bg-rose-500' : 'bg-indigo-500'}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

const LimitInput = ({ label, value, onChange }) => (
    <div className="flex flex-col gap-1">
        <label className="text-[9px] font-black text-slate-400">{label}</label>
        <input
            type="number"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full p-1 text-center bg-white border border-slate-200 rounded font-bold text-xs"
        />
    </div>
);

const getPlanStyle = (plan) => {
    switch (plan) {
        case 'pro': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
        case 'basic': return 'bg-sky-50 text-sky-700 border-sky-100';
        case 'free': return 'bg-slate-100 text-slate-500 border-slate-200';
        default: return 'bg-slate-50 text-slate-300 border-slate-100';
    }
};

const getDaysRemaining = (date) => {
    if (!date) return '∞';
    const diff = new Date(date) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};
