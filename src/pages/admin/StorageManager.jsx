import React, { useState, useEffect, useMemo } from 'react';
import {
    Database, HardDrive, Zap, Trash2, RefreshCw,
    Search, FileArchive, Activity, ShieldCheck,
    AlertTriangle, Info, FolderOpen, TrendingDown,
    Clock, BarChart3, CheckCircle2, Shield, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAlert } from '../../context/AlertContext';
import {
    getStorageStats, getEventsWithStorage,
    scanOrphanedFiles, deleteFromR2, purgeColdAssets
} from '../../services/storageService';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../lib/cn';

export default function StorageManager() {
    const { tenantRole } = useAuth();
    const { showAlert } = useAlert();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ hotSize: 0, coldSize: 0, totalSize: 0, totalCount: 0 });
    const [events, setEvents] = useState([]);
    const [orphans, setOrphans] = useState([]);
    const [activeTab, setActiveTab] = useState('monitoring');
    const [searchTerm, setSearchTerm] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [isPurging, setIsPurging] = useState(false);

    useEffect(() => {
        if (tenantRole === 'superadmin') loadInitialData();
    }, [tenantRole]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [s, e] = await Promise.all([getStorageStats(), getEventsWithStorage()]);
            setStats(s);
            setEvents(e);
        } catch (err) {
            showAlert('Failed to load storage data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleScanOrphans = async () => {
        setIsScanning(true);
        try {
            const results = await scanOrphanedFiles();
            setOrphans(results);
            showAlert(results.length === 0 ? 'No orphaned files found.' : `Detected ${results.length} orphaned files.`, results.length === 0 ? 'success' : 'info');
        } catch (err) { showAlert('Scan failed', 'error'); }
        finally { setIsScanning(false); }
    };

    const handleDeleteOrphans = async () => {
        if (!window.confirm(`PERMANENT DELETION: Purge ${orphans.length} orphaned files from R2?`)) return;
        setIsScanning(true);
        try {
            await deleteFromR2(orphans.map(o => o.key));
            setOrphans([]);
            showAlert('Orphaned files purged!', 'success');
            loadInitialData();
        } catch (err) { showAlert('Cleanup failed', 'error'); }
        finally { setIsScanning(false); }
    };

    const handlePurgeCold = async (eventId, eventName) => {
        if (!window.confirm(`⚠️ Purge cold assets for "${eventName}"? Photostrips will be preserved.`)) return;
        setIsPurging(true);
        try {
            const count = await purgeColdAssets(eventId);
            showAlert(`Purged ${count} files.`, 'success');
            loadInitialData();
        } catch (err) { showAlert('Purge failed', 'error'); }
        finally { setIsPurging(false); }
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const filteredEvents = useMemo(() => {
        return events.filter(e =>
            e.event_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.slug.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [events, searchTerm]);

    if (tenantRole !== 'superadmin') {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center min-h-[60vh]">
                <Shield className="w-16 h-16 text-zinc-600 mb-4" />
                <h2 className="text-xl font-bold text-zinc-300">Access Restricted</h2>
            </div>
        );
    }

    const monthlyCost = (stats.totalSize / (1024 ** 3) * 0.015).toFixed(2);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Infrastructure Matrix</h1>
                    <p className="text-zinc-500 text-sm mt-1">Storage analytics, R2 diagnostics, and cost management.</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadInitialData} disabled={loading}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Sync
                </Button>
            </div>

            {/* Stats Grid */}
            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 bg-zinc-800 rounded-xl" />)}
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={Zap} label="Hot Storage" value={formatSize(stats.hotSize)} sub="Permanent assets" color="amber" />
                    <StatCard icon={HardDrive} label="Cold Storage" value={formatSize(stats.coldSize)} sub="Temporary media" color="blue" />
                    <StatCard icon={BarChart3} label="Monthly Cost" value={`$${monthlyCost}`} sub="R2 egress: $0" color="emerald" />
                    <StatCard icon={FolderOpen} label="Total Objects" value={stats.totalCount.toLocaleString()} sub="Registered files" color="violet" />
                </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-zinc-900 border border-zinc-800">
                    <TabsTrigger value="monitoring" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">
                        <Activity className="h-4 w-4 mr-2" /> Diagnostics
                    </TabsTrigger>
                    <TabsTrigger value="events" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">
                        <FolderOpen className="h-4 w-4 mr-2" /> Explorer
                    </TabsTrigger>
                    <TabsTrigger value="integrity" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">
                        <ShieldCheck className="h-4 w-4 mr-2" /> Integrity
                    </TabsTrigger>
                </TabsList>

                {/* Diagnostics Tab */}
                <TabsContent value="monitoring" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2 bg-zinc-900/50 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-zinc-100 flex items-center gap-2">
                                    <BarChart3 className="text-primary h-5 w-5" /> Storage Allocation
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Distribution Bar */}
                                <div className="relative h-10 w-full bg-zinc-800 rounded-lg flex overflow-hidden gap-0.5 p-0.5">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${(stats.hotSize / (stats.totalSize || 1)) * 100}%` }}
                                        className="h-full bg-amber-500 rounded-md group relative cursor-help flex items-center justify-center">
                                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold text-white whitespace-nowrap">Hot</span>
                                    </motion.div>
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${(stats.coldSize / (stats.totalSize || 1)) * 100}%` }}
                                        className="h-full bg-blue-500 rounded-md group relative cursor-help flex items-center justify-center">
                                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold text-white whitespace-nowrap">Cold</span>
                                    </motion.div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                            <span className="text-xs font-medium text-zinc-400">Hot (Permanent)</span>
                                        </div>
                                        <p className="text-xs text-zinc-500 mb-2">Photostrips preserved on global CDN.</p>
                                        <p className="text-xl font-bold text-zinc-100">{formatSize(stats.hotSize)}</p>
                                    </div>
                                    <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                            <span className="text-xs font-medium text-zinc-400">Cold (Temporary)</span>
                                        </div>
                                        <p className="text-xs text-zinc-500 mb-2">Raw captures for lifecycle purging.</p>
                                        <p className="text-xl font-bold text-zinc-100">{formatSize(stats.coldSize)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-primary to-indigo-700 border-primary/20">
                            <CardContent className="p-6 space-y-6">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-200/60 mb-2">Estimated Billing</p>
                                    <p className="text-4xl font-bold text-white tracking-tight">${monthlyCost} <span className="text-lg text-white/50">/mo</span></p>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs py-3 border-b border-white/10">
                                        <span className="text-blue-200/60">Storage Rate</span>
                                        <span className="text-white font-medium">$0.015 / GB</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs py-3 border-b border-white/10">
                                        <span className="text-blue-200/60">CDN Egress</span>
                                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30" variant="outline">FREE</Badge>
                                    </div>
                                </div>
                                <div className="p-3 bg-white/10 rounded-lg text-[10px] font-medium text-blue-200/60 text-center border border-white/10">
                                    R2 zero egress fees applied
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Explorer Tab */}
                <TabsContent value="events" className="mt-6">
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <div className="p-4 border-b border-zinc-800 flex flex-col md:flex-row gap-3 items-center justify-between">
                            <div className="relative w-full md:w-96">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-4 w-4" />
                                <Input placeholder="Search events..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                    className="pl-10 bg-zinc-800/50 border-zinc-700 text-zinc-200 placeholder:text-zinc-600" />
                            </div>
                            <Badge variant="outline" className="border-zinc-700 text-zinc-400">{filteredEvents.length} events</Badge>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-xs font-semibold uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
                                        <th className="py-3 px-6">Event</th>
                                        <th className="py-3 px-4 text-center">Photos</th>
                                        <th className="py-3 px-4 text-center">Storage</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEvents.map(event => (
                                        <tr key={event.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 group transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center text-primary font-bold text-sm">
                                                        {event.event_name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-zinc-200 text-sm">{event.event_name}</p>
                                                        <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                                                            <Clock size={10} /> {new Date(event.created_at).toLocaleDateString()} • {event.slug}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <p className="font-bold text-zinc-200">{event.photoCount}</p>
                                                <p className="text-[10px] text-zinc-600">objects</p>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex justify-center gap-4">
                                                    <div className="text-center">
                                                        <p className="text-sm font-semibold text-amber-400">{formatSize(event.hotSize)}</p>
                                                        <p className="text-[9px] text-zinc-600 uppercase">Hot</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-sm font-semibold text-blue-400">{formatSize(event.coldSize)}</p>
                                                        <p className="text-[9px] text-zinc-600 uppercase">Cold</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                    <Button variant="outline" size="sm" disabled={event.coldSize === 0 || isPurging}
                                                        className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-xs"
                                                        onClick={() => handlePurgeCold(event.id, event.event_name)}>
                                                        <Trash2 className="h-3.5 w-3.5" /> Purge
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>

                {/* Integrity Tab */}
                <TabsContent value="integrity" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-zinc-100">Orphan Scanner</CardTitle>
                                        <CardDescription>Detect unreferenced R2 objects and reclaim storage.</CardDescription>
                                    </div>
                                    <div className="p-3 bg-primary/10 rounded-xl">
                                        <ShieldCheck className="h-6 w-6 text-primary" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {orphans.length > 0 ? (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <AlertTriangle className="text-red-400 h-5 w-5" />
                                                <div>
                                                    <p className="font-semibold text-zinc-200">{orphans.length} orphans detected</p>
                                                    <p className="text-xs text-red-400/70">{formatSize(orphans.reduce((a, b) => a + (b.size || 0), 0))} wasted</p>
                                                </div>
                                            </div>
                                            <Button variant="destructive" size="sm" onClick={handleDeleteOrphans} disabled={isScanning}>
                                                <Trash2 className="h-3.5 w-3.5" /> Purge All
                                            </Button>
                                        </div>
                                        <div className="max-h-56 overflow-y-auto border border-zinc-800 rounded-lg bg-zinc-900/50 p-2 space-y-1">
                                            {orphans.map(o => (
                                                <div key={o.key} className="p-2 bg-zinc-800/50 rounded flex justify-between items-center text-xs text-zinc-400 hover:bg-zinc-800 transition-colors">
                                                    <span className="truncate flex-1 font-mono">{o.key}</span>
                                                    <Badge variant="outline" className="ml-3 border-zinc-700 text-zinc-500 font-mono">{formatSize(o.size)}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-12 text-center border border-dashed border-zinc-800 rounded-xl">
                                        <CheckCircle2 className="h-10 w-10 text-emerald-500/30 mx-auto mb-4" />
                                        <p className="text-sm text-zinc-500 mb-6">No orphaned files detected</p>
                                        <Button onClick={handleScanOrphans} disabled={isScanning} className="bg-primary hover:bg-primary/90">
                                            {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                                            Run Scan
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-zinc-100">Cache Control</CardTitle>
                                        <CardDescription>Synchronize CDN edge nodes and clear specific caches.</CardDescription>
                                    </div>
                                    <div className="p-3 bg-emerald-500/10 rounded-xl">
                                        <TrendingDown className="h-6 w-6 text-emerald-400" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-zinc-400">Cache Path Scope</label>
                                    <div className="flex gap-2">
                                        <Input placeholder="assets/system/frames/" className="flex-1 bg-zinc-800/50 border-zinc-700 text-zinc-200 font-mono text-xs placeholder:text-zinc-600" />
                                        <Button className="bg-zinc-100 text-zinc-900 hover:bg-white">Resync</Button>
                                    </div>
                                </div>
                                <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg flex items-start gap-3 text-xs text-zinc-400 leading-relaxed">
                                    <Info className="h-4 w-4 shrink-0 text-primary/50 mt-0.5" />
                                    Edge propagation completes in ~30 seconds across global nodes.
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

const StatCard = ({ label, value, icon: Icon, sub, color }) => {
    const colors = {
        amber: 'text-amber-400 bg-amber-500/10',
        blue: 'text-blue-400 bg-blue-500/10',
        emerald: 'text-emerald-400 bg-emerald-500/10',
        violet: 'text-violet-400 bg-violet-500/10',
    };
    const iconClass = colors[color] || colors.blue;

    return (
        <Card className="bg-zinc-900/50 border-zinc-800 p-5 hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-3 mb-3">
                <div className={cn("p-2 rounded-lg", iconClass)}>
                    <Icon className="h-4 w-4" />
                </div>
            </div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-1">{label}</p>
            <h3 className="text-2xl font-bold text-zinc-100 tracking-tight mb-0.5">{value}</h3>
            {sub && <p className="text-[10px] text-zinc-600">{sub}</p>}
        </Card>
    );
};
