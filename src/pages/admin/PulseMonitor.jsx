import React, { useState, useEffect } from 'react';
import {
    Heart, Zap, RefreshCw, ExternalLink, Image as ImageIcon, Shield, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    getGlobalPulseStats, getLatestGlobalPhotos, subscribeToGlobalPhotos
} from '../../services/pulseService';
import { useAuth } from '../../hooks/useAuth';
import { useAlert } from '../../context/AlertContext';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';

export default function PulseMonitor() {
    const { tenantRole } = useAuth();
    const { showAlert } = useAlert();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ todayPhotos: 0 });
    const [photos, setPhotos] = useState([]);

    useEffect(() => {
        let photoSub = null;
        if (tenantRole === 'superadmin') {
            loadInitialData();
            photoSub = subscribeToGlobalPhotos((newPhoto) => {
                setPhotos(prev => [newPhoto, ...prev.slice(0, 49)]);
                setStats(prev => ({ ...prev, todayPhotos: prev.todayPhotos + 1 }));
            });
        }
        return () => {
            if (photoSub && typeof photoSub.unsubscribe === 'function') photoSub.unsubscribe();
        };
    }, [tenantRole]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [s, p] = await Promise.all([getGlobalPulseStats(), getLatestGlobalPhotos(50)]);
            setStats(s);
            setPhotos(p || []);
        } catch (err) {
            console.error("Pulse Load Error:", err);
            showAlert('Failed to load pulse data', 'error');
        } finally {
            setLoading(false);
        }
    };

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
            {/* Header Card */}
            <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden relative">
                <CardContent className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-400 border border-rose-500/20">
                                <Heart size={20} fill="currentColor" className="animate-pulse" />
                            </div>
                            <Badge variant="outline" className="border-rose-500/30 text-rose-400 text-[10px] font-semibold uppercase tracking-wider">
                                Live Monitoring
                            </Badge>
                        </div>
                        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">The Pulse</h1>
                        <p className="text-zinc-500 text-sm mt-1">Real-time photo ingestion stream across all tenants.</p>
                    </div>

                    <div className="flex items-center gap-6 bg-zinc-800/50 p-5 rounded-xl border border-zinc-700/50">
                        <div className="text-center">
                            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">24h Captures</p>
                            <p className="text-3xl font-bold text-rose-400 tabular-nums tracking-tight">{stats.todayPhotos}</p>
                        </div>
                        <div className="w-px h-10 bg-zinc-700" />
                        <div className="flex flex-col items-center">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping mb-2" />
                            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Active</span>
                        </div>
                    </div>
                </CardContent>
                {/* Subtle background icon */}
                <Heart className="absolute -top-4 -right-4 opacity-[0.03] text-zinc-500 pointer-events-none" size={200} />
            </Card>

            {/* Stream Header */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <ImageIcon size={16} className="text-zinc-500" />
                    <h2 className="font-semibold text-zinc-300 text-sm">Global Discovery Stream</h2>
                </div>
                <Badge variant="outline" className="border-zinc-700 text-zinc-500 text-[10px]">
                    Buffer: 50 items
                </Badge>
            </div>

            {/* Photo Grid */}
            {loading && photos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                    <p className="text-sm text-zinc-500">Syncing stream...</p>
                </div>
            ) : photos.length === 0 ? (
                <Card className="bg-zinc-900/50 border-zinc-800 py-20 text-center border-dashed">
                    <ImageIcon className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
                    <p className="text-sm text-zinc-500">No photos in stream yet...</p>
                    <p className="text-xs text-zinc-600 mt-1">New photos will appear here in real-time</p>
                </Card>
            ) : (
                <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
                    {photos.map((photo) => (
                        <motion.div
                            key={photo.id}
                            layout
                            initial={{ scale: 0.95, opacity: 0, y: 15 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                        >
                            <Card className="bg-zinc-900/80 border-zinc-800 overflow-hidden break-inside-avoid group hover:border-zinc-700 transition-all cursor-pointer">
                                {/* Live Badge */}
                                <div className="absolute top-3 right-3 z-20">
                                    <Badge className="bg-rose-500/90 text-white border-0 text-[9px] font-semibold gap-1.5 backdrop-blur-sm">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live
                                    </Badge>
                                </div>

                                {/* Photo */}
                                <div className="relative overflow-hidden">
                                    <img
                                        src={photo.photo_url}
                                        alt="Live capture"
                                        className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-transparent to-transparent opacity-60" />
                                </div>

                                {/* Info */}
                                <div className="p-4 space-y-3 relative z-10 -mt-10 bg-gradient-to-t from-zinc-900 via-zinc-900/95 to-transparent pt-10">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="font-semibold text-zinc-200 text-sm truncate flex-1 group-hover:text-primary transition-colors">
                                            {photo.events?.event_name || 'System Event'}
                                        </p>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-white shrink-0" asChild>
                                            <a href={`/gallery/${photo.events?.slug}`} target="_blank" onClick={(e) => e.stopPropagation()}>
                                                <ExternalLink size={14} />
                                            </a>
                                        </Button>
                                    </div>

                                    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                                        <div className="w-5 h-5 bg-primary/20 text-primary rounded-md flex items-center justify-center text-[9px] font-bold">
                                            {photo.tenants?.name ? photo.tenants.name.charAt(0) : 'M'}
                                        </div>
                                        <span className="text-[10px] font-medium text-zinc-500 truncate">{photo.tenants?.name || 'Unknown Vendor'}</span>
                                    </div>

                                    <div className="flex items-center justify-between pt-1">
                                        <span className="text-[10px] text-zinc-600 font-mono">
                                            {new Date(photo.created_at).toLocaleTimeString()}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <Zap size={9} className="text-rose-400" />
                                            <span className="text-[9px] font-semibold text-rose-400/70 opacity-0 group-hover:opacity-100 transition-opacity">
                                                Processed
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
