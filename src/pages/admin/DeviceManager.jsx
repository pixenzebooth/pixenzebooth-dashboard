import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useAlert } from '../../context/AlertContext';
import { Monitor, Plus, Trash2, X, Wifi, WifiOff, Wrench, Search, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const statusConfig = {
    active: { label: 'Online', icon: Wifi, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    inactive: { label: 'Offline', icon: WifiOff, color: 'text-slate-500', bg: 'bg-slate-100' },
    maintenance: { label: 'Maintenance', icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-50' },
};

const DeviceManager = () => {
    const { tenantId } = useAuth();
    const { showAlert } = useAlert();
    const [devices, setDevices] = useState([]);
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({ device_name: '', hardware_id: '' });

    const fetchData = useCallback(async () => {
        if (!tenantId) return;
        setLoading(true);

        // Fetch Devices
        const deviceQuery = supabase
            .from('devices')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        // Fetch Subscription for limit
        const subQuery = supabase
            .from('subscriptions')
            .select('device_limit')
            .eq('tenant_id', tenantId)
            .eq('status', 'active')
            .maybeSingle();

        const [devRes, subRes] = await Promise.all([deviceQuery, subQuery]);

        if (!devRes.error && devRes.data) setDevices(devRes.data);
        if (!subRes.error && subRes.data) setSubscription(subRes.data);

        setLoading(false);
    }, [tenantId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleCreate = async (e) => {
        e.preventDefault();

        const limit = subscription?.device_limit || 1;
        if (devices.length >= limit) {
            showAlert(`Limit reached! Your current plan allows only ${limit} device(s). Please upgrade to add more.`, "error");
            return;
        }

        const { error } = await supabase.from('devices').insert([{
            tenant_id: tenantId,
            device_name: formData.device_name,
            hardware_id: formData.hardware_id || null,
            status: 'inactive',
        }]);
        if (error) { showAlert('Failed: ' + error.message, "error"); return; }
        
        showAlert("Device registered successfully!", "success");
        setShowForm(false);
        setFormData({ device_name: '', hardware_id: '' });
        fetchData();
    };

    const toggleStatus = async (device) => {
        const nextStatus = device.status === 'active' ? 'inactive' : device.status === 'inactive' ? 'active' : 'inactive';
        await supabase.from('devices').update({ status: nextStatus }).eq('id', device.id);
        fetchData();
    };

    const handleDelete = async (id) => {
        if (!confirm('Remove this device?')) return;
        await supabase.from('devices').delete().eq('id', id);
        fetchData();
    };

    const filteredDevices = devices.filter(d =>
        d.device_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.hardware_id || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeCount = devices.filter(d => d.status === 'active').length;

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Device Manager</h1>
                    <p className="text-slate-500 text-sm mt-1">{activeCount} online, {devices.length} total</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchData} className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition" title="Refresh">
                        <RefreshCw size={18} className="text-slate-500" />
                    </button>
                    <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition shadow-sm">
                        <Plus size={18} /> Register Device
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search devices..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm" />
            </div>

            {/* Devices List */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-slate-100 animate-pulse shrink-0"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-slate-200 animate-pulse rounded w-1/3"></div>
                                <div className="h-3 bg-slate-100 animate-pulse rounded w-1/4"></div>
                            </div>
                            <div className="flex gap-2">
                                <div className="h-8 w-8 bg-slate-100 animate-pulse rounded-lg"></div>
                                <div className="h-8 w-8 bg-slate-100 animate-pulse rounded-lg"></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredDevices.length === 0 ? (
                <div className="text-center py-20">
                    <Monitor className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg">No devices registered</p>
                    <p className="text-slate-400 text-sm mt-1">Register your first photobooth device</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredDevices.map((device) => {
                        const status = statusConfig[device.status] || statusConfig.inactive;
                        const StatusIcon = status.icon;
                        return (
                            <motion.div
                                key={device.id}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 hover:shadow-sm transition"
                            >
                                <div className={`p-3 rounded-xl ${status.bg}`}>
                                    <Monitor size={22} className={status.color} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-slate-900 truncate">{device.device_name}</h3>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        <span className={`text-xs font-medium flex items-center gap-1 ${status.color}`}>
                                            <StatusIcon size={12} /> {status.label}
                                        </span>
                                        {device.hardware_id && (
                                            <span className="text-xs text-slate-400 font-mono">{device.hardware_id.slice(0, 12)}...</span>
                                        )}
                                        {device.last_seen_at && (
                                            <span className="text-xs text-slate-400">
                                                Last seen: {new Date(device.last_seen_at).toLocaleString('id-ID')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => toggleStatus(device)} className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-400" title="Toggle status">
                                        {device.status === 'active' ? <WifiOff size={16} /> : <Wifi size={16} />}
                                    </button>
                                    <button onClick={() => handleDelete(device.id)} className="p-2 hover:bg-red-50 rounded-lg transition text-red-400 hover:text-red-600" title="Remove">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Register Device Modal */}
            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl relative"
                        >
                            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                            <h2 className="text-xl font-bold text-slate-900 mb-6">Register Device</h2>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Device Name</label>
                                    <input type="text" required value={formData.device_name} onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm" placeholder="e.g. Booth-Studio-1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Hardware ID (Optional)</label>
                                    <input type="text" value={formData.hardware_id} onChange={(e) => setFormData({ ...formData, hardware_id: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm font-mono" placeholder="Auto-filled when device connects" />
                                </div>
                                <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition">
                                    Register Device
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DeviceManager;
