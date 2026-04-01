import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CreditCard, Monitor, Calendar, HardDrive, ArrowUpRight, CheckCircle, XCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../lib/cn';

const statusConfig = {
    active: { icon: CheckCircle, variant: 'success', label: 'Active' },
    expired: { icon: XCircle, variant: 'destructive', label: 'Expired' },
    cancelled: { icon: Clock, variant: 'warning', label: 'Cancelled' },
};

const SubscriptionOverview = () => {
    const [subscription, setSubscription] = useState(null);
    const [usage, setUsage] = useState({ devices: 0, events: 0, storageMB: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: myTenantId, error: rpcErr } = await supabase.rpc('get_my_tenant_id');
                if (rpcErr) throw rpcErr;

                let subQuery = supabase.from('subscriptions').select('*').order('created_at', { ascending: false }).limit(1);
                if (myTenantId) subQuery = subQuery.eq('tenant_id', myTenantId);
                const { data: subData, error: subErr } = await subQuery.maybeSingle();
                if (subErr) console.error("Sub fetch error:", subErr);
                if (subData) setSubscription(subData);

                let devQuery = supabase.from('devices').select('id', { count: 'exact', head: true });
                if (myTenantId) devQuery = devQuery.eq('tenant_id', myTenantId);
                const { count: devCount } = await devQuery;

                let evtQuery = supabase.from('events').select('id', { count: 'exact', head: true });
                if (myTenantId) evtQuery = evtQuery.eq('tenant_id', myTenantId);
                const { count: evtCount } = await evtQuery;

                let photoQuery = supabase.from('photos').select('file_size, photo_url');
                if (myTenantId) photoQuery = photoQuery.eq('tenant_id', myTenantId);
                const { data: photos } = await photoQuery;

                let r2Bytes = 0, supabaseBytes = 0;
                (photos || []).forEach(p => {
                    const size = p.file_size || 0;
                    if (p.photo_url?.includes('supabase.co/storage')) supabaseBytes += size;
                    else r2Bytes += size;
                });

                setUsage({
                    devices: devCount || 0,
                    events: evtCount || 0,
                    storageMB: (r2Bytes + supabaseBytes) / (1024 * 1024),
                    r2MB: r2Bytes / (1024 * 1024),
                    supabaseMB: supabaseBytes / (1024 * 1024),
                });
            } catch (err) {
                console.error("Error fetching subscription data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
            </div>
        );
    }

    if (!subscription) {
        return (
            <div className="text-center py-20">
                <CreditCard className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">No Subscription</h2>
                <p className="text-muted-foreground mb-6">Your account doesn't have an active subscription</p>
                <Button asChild>
                    <a href="https://tech.pixenzebooth.com" target="_blank" rel="noreferrer">
                        View Plans <ArrowUpRight className="h-4 w-4" />
                    </a>
                </Button>
            </div>
        );
    }

    const statusInfo = statusConfig[subscription.status] || statusConfig.active;
    const StatusIcon = statusInfo.icon;

    const usageItems = [
        { label: 'Devices', icon: Monitor, current: usage.devices, limit: subscription.device_limit || 1 },
        { label: 'Events', icon: Calendar, current: usage.events, limit: subscription.event_limit || 1 },
        {
            label: 'Storage',
            icon: HardDrive,
            current: usage.storageMB < 0.1 ? (usage.storageMB * 1024).toFixed(0) : usage.storageMB.toFixed(2),
            limit: subscription.storage_limit || 500,
            unit: usage.storageMB < 0.1 ? 'KB' : 'MB',
            details: `R2: ${usage.r2MB.toFixed(2)} MB | Supabase: ${usage.supabaseMB.toFixed(2)} MB`
        },
    ];

    return (
        <div>
            <h1 className="text-2xl font-bold tracking-tight mb-8">Subscription</h1>

            <Card className="mb-8">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-sm font-bold uppercase">
                                {subscription.plan} Plan
                            </Badge>
                            <Badge variant={statusInfo.variant} className="gap-1">
                                <StatusIcon className="h-3 w-3" /> {statusInfo.label}
                            </Badge>
                        </div>
                    </div>
                    {subscription.expires_at && (
                        <p className="text-sm text-muted-foreground">
                            Expires: {new Date(subscription.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    )}
                </CardContent>
            </Card>

            <h2 className="text-lg font-semibold mb-4">Usage</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {usageItems.map((item) => {
                    const UsageIcon = item.icon;
                    const denom = item.limit || 1;
                    const valForPercent = item.unit === 'KB' ? (parseFloat(item.current) / 1024) : parseFloat(item.current);
                    const percent = Math.min(100, Math.round((valForPercent / denom) * 100));
                    const isNearLimit = percent >= 80;

                    return (
                        <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <Card className="p-5">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 rounded-lg bg-primary/10">
                                        <UsageIcon className="h-4 w-4 text-primary" />
                                    </div>
                                    <span className="font-medium">{item.label}</span>
                                </div>
                                <div className="flex items-end gap-1 mb-2">
                                    <span className="text-3xl font-bold">{item.current}</span>
                                    <span className="text-sm text-muted-foreground mb-1">/ {item.limit} {item.unit || ''}</span>
                                </div>
                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percent}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className={cn("h-full rounded-full", isNearLimit ? 'bg-amber-500' : 'bg-primary')}
                                    />
                                </div>
                                <div className="flex justify-between items-start mt-1">
                                    <p className={cn("text-xs", isNearLimit ? 'text-amber-600 font-medium' : 'text-muted-foreground')}>
                                        {isNearLimit ? `${100 - percent}% remaining` : `${percent}% used`}
                                    </p>
                                    {item.details && <p className="text-[9px] text-muted-foreground text-right leading-tight">{item.details}</p>}
                                </div>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>

            {subscription.plan !== 'pro' && (
                <Card className="bg-gradient-to-r from-primary to-violet-600 text-white p-6 text-center border-0">
                    <h3 className="text-xl font-bold mb-2">Need more capacity?</h3>
                    <p className="text-white/80 text-sm mb-4">Upgrade your plan for more devices, events, and storage</p>
                    <Button variant="secondary" className="bg-white text-primary hover:bg-white/90" asChild>
                        <a href="https://tech.pixenzebooth.com/#pricing" target="_blank" rel="noreferrer">
                            Upgrade Plan <ArrowUpRight className="h-4 w-4" />
                        </a>
                    </Button>
                </Card>
            )}
        </div>
    );
};

export default SubscriptionOverview;
