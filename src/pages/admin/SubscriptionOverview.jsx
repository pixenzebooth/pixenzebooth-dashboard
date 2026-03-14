import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CreditCard, Monitor, Calendar, HardDrive, ArrowUpRight, CheckCircle, XCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const planColors = {
    free: { bg: 'bg-slate-100', text: 'text-slate-700', badge: 'bg-slate-200' },
    basic: { bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-100' },
    pro: { bg: 'bg-violet-50', text: 'text-violet-700', badge: 'bg-violet-100' },
};

const statusIcons = {
    active: { icon: CheckCircle, color: 'text-emerald-500' },
    expired: { icon: XCircle, color: 'text-red-500' },
    cancelled: { icon: Clock, color: 'text-amber-500' },
};

const SubscriptionOverview = () => {
    const [subscription, setSubscription] = useState(null);
    const [usage, setUsage] = useState({ devices: 0, events: 0, storageMB: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            // Resolve tenant_id for this admin user
            const { data: myTenantId } = await supabase.rpc('get_my_tenant_id');

            // Get subscription — filtered by tenant
            let subQuery = supabase
                .from('subscriptions')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1);
            if (myTenantId) subQuery = subQuery.eq('tenant_id', myTenantId);
            const { data: subData } = await subQuery.single();

            if (subData) setSubscription(subData);

            // Count devices — filtered by tenant
            let devQuery = supabase.from('devices').select('id', { count: 'exact', head: true });
            if (myTenantId) devQuery = devQuery.eq('tenant_id', myTenantId);
            const { count: devCount } = await devQuery;

            // Count events — filtered by tenant
            let evtQuery = supabase.from('events').select('id', { count: 'exact', head: true });
            if (myTenantId) evtQuery = evtQuery.eq('tenant_id', myTenantId);
            const { count: evtCount } = await evtQuery;

            // Sum storage — filtered by tenant
            let photoQuery = supabase.from('photos').select('file_size');
            if (myTenantId) photoQuery = photoQuery.eq('tenant_id', myTenantId);
            const { data: photos } = await photoQuery;

            const totalBytes = (photos || []).reduce((sum, p) => sum + (p.file_size || 0), 0);

            setUsage({
                devices: devCount || 0,
                events: evtCount || 0,
                storageMB: Math.round(totalBytes / (1024 * 1024)),
            });

            setLoading(false);
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-2xl" />)}
            </div>
        );
    }

    if (!subscription) {
        return (
            <div className="text-center py-20">
                <CreditCard className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-900 mb-2">No Subscription</h2>
                <p className="text-slate-500 mb-6">Your account doesn't have an active subscription</p>
                <a href="https://tech.pixenzebooth.com" target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition">
                    View Plans <ArrowUpRight size={16} />
                </a>
            </div>
        );
    }

    const plan = planColors[subscription.plan] || planColors.free;
    const statusInfo = statusIcons[subscription.status] || statusIcons.active;
    const StatusIcon = statusInfo.icon;

    const usageItems = [
        {
            label: 'Devices',
            icon: Monitor,
            current: usage.devices,
            limit: subscription.device_limit,
            color: 'blue',
        },
        {
            label: 'Events',
            icon: Calendar,
            current: usage.events,
            limit: subscription.event_limit,
            color: 'violet',
        },
        {
            label: 'Storage',
            icon: HardDrive,
            current: usage.storageMB,
            limit: subscription.storage_limit,
            unit: 'MB',
            color: 'emerald',
        },
    ];

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-8">Subscription</h1>

            {/* Plan Card */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${plan.bg} rounded-2xl p-6 mb-8 border border-slate-200/50`}
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`${plan.badge} px-3 py-1 rounded-full font-bold text-sm uppercase ${plan.text}`}>
                            {subscription.plan} Plan
                        </div>
                        <span className={`flex items-center gap-1 text-sm font-medium ${statusInfo.color}`}>
                            <StatusIcon size={16} /> {subscription.status}
                        </span>
                    </div>
                </div>

                {subscription.expires_at && (
                    <p className="text-sm text-slate-500">
                        Expires: {new Date(subscription.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                )}
            </motion.div>

            {/* Usage Cards */}
            <h2 className="text-lg font-bold text-slate-900 mb-4">Usage</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {usageItems.map((item) => {
                    const UsageIcon = item.icon;
                    const percent = Math.min(100, Math.round((item.current / item.limit) * 100));
                    const isNearLimit = percent >= 80;

                    return (
                        <motion.div
                            key={item.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl border border-slate-200 p-5"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`p-2 rounded-xl bg-${item.color}-50`}>
                                    <UsageIcon size={18} className={`text-${item.color}-600`} />
                                </div>
                                <span className="font-semibold text-slate-700">{item.label}</span>
                            </div>

                            <div className="flex items-end gap-1 mb-2">
                                <span className="text-3xl font-bold text-slate-900">{item.current}</span>
                                <span className="text-sm text-slate-400 mb-1">/ {item.limit} {item.unit || ''}</span>
                            </div>

                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${isNearLimit ? 'bg-amber-500' : `bg-${item.color}-500`}`}
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                            <p className={`text-xs mt-1 ${isNearLimit ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                                {isNearLimit ? `${100 - percent}% remaining` : `${percent}% used`}
                            </p>
                        </motion.div>
                    );
                })}
            </div>

            {/* Upgrade CTA */}
            {subscription.plan !== 'pro' && (
                <div className="bg-gradient-to-r from-blue-600 to-violet-600 rounded-2xl p-6 text-white text-center">
                    <h3 className="text-xl font-bold mb-2">Need more capacity?</h3>
                    <p className="text-white/80 text-sm mb-4">Upgrade your plan for more devices, events, and storage</p>
                    <a href="https://tech.pixenzebooth.com/#pricing" target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition">
                        Upgrade Plan <ArrowUpRight size={16} />
                    </a>
                </div>
            )}
        </div>
    );
};

export default SubscriptionOverview;
