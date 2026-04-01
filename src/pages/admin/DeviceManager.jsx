import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useAlert } from '../../context/AlertContext';
import { Monitor, Plus, Trash2, X, Wifi, WifiOff, Wrench, Search, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../lib/cn';

const statusConfig = {
    active: { label: 'Online', icon: Wifi, variant: 'success' },
    inactive: { label: 'Offline', icon: WifiOff, variant: 'secondary' },
    maintenance: { label: 'Maintenance', icon: Wrench, variant: 'warning' },
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

        const deviceQuery = supabase
            .from('devices')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

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
                    <h1 className="text-2xl font-bold tracking-tight">Device Manager</h1>
                    <p className="text-muted-foreground text-sm mt-1">{activeCount} online, {devices.length} total</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={fetchData} title="Refresh">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => setShowForm(true)}>
                        <Plus className="h-4 w-4" />
                        Register Device
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Search devices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Devices List */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="p-4 flex items-center gap-4">
                            <Skeleton className="h-12 w-12 rounded-xl" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-3 w-1/4" />
                            </div>
                        </Card>
                    ))}
                </div>
            ) : filteredDevices.length === 0 ? (
                <div className="text-center py-20">
                    <Monitor className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-foreground text-lg font-medium">No devices registered</p>
                    <p className="text-muted-foreground text-sm mt-1">Register your first photobooth device</p>
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
                            >
                                <Card className="p-4 flex items-center gap-4 hover:shadow-sm transition">
                                    <div className={cn(
                                        "p-3 rounded-xl",
                                        device.status === 'active' && 'bg-emerald-500/10',
                                        device.status === 'inactive' && 'bg-muted',
                                        device.status === 'maintenance' && 'bg-amber-500/10',
                                    )}>
                                        <Monitor className={cn(
                                            "h-5 w-5",
                                            device.status === 'active' && 'text-emerald-600',
                                            device.status === 'inactive' && 'text-muted-foreground',
                                            device.status === 'maintenance' && 'text-amber-600',
                                        )} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold truncate">{device.device_name}</h3>
                                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                            <Badge variant={status.variant} className="gap-1">
                                                <StatusIcon className="h-3 w-3" /> {status.label}
                                            </Badge>
                                            {device.hardware_id && (
                                                <span className="text-xs text-muted-foreground font-mono">{device.hardware_id.slice(0, 12)}...</span>
                                            )}
                                            {device.last_seen_at && (
                                                <span className="text-xs text-muted-foreground">
                                                    Last seen: {new Date(device.last_seen_at).toLocaleString('id-ID')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleStatus(device)} title="Toggle status">
                                            {device.status === 'active' ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(device.id)} title="Remove">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Register Device Dialog */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Register Device</DialogTitle>
                        <DialogDescription>
                            Add a new photobooth device to your account.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Device Name</label>
                            <Input
                                type="text"
                                required
                                value={formData.device_name}
                                onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                                placeholder="e.g. Booth-Studio-1"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Hardware ID (Optional)</label>
                            <Input
                                type="text"
                                value={formData.hardware_id}
                                onChange={(e) => setFormData({ ...formData, hardware_id: e.target.value })}
                                placeholder="Auto-filled when device connects"
                                className="font-mono"
                            />
                        </div>
                        <Button type="submit" className="w-full">
                            Register Device
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DeviceManager;
