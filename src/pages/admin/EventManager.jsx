import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useAlert } from '../../context/AlertContext';
import {
    Calendar, Plus, Pencil, Trash2, Copy, ExternalLink, QrCode, X, Search, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';

const EventManager = () => {
    const { tenantId } = useAuth();
    const { showAlert } = useAlert();
    const [events, setEvents] = useState([]);
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [showQr, setShowQr] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
        event_name: '', slug: '', event_date: '', description: '',
    });

    const [currentStep, setCurrentStep] = useState(1);

    const fetchData = useCallback(async () => {
        if (!tenantId) return;
        setLoading(true);

        const eventQuery = supabase
            .from('events')
            .select('*, photos(count)')
            .eq('tenant_id', tenantId)
            .order('event_date', { ascending: false });

        const subQuery = supabase
            .from('subscriptions')
            .select('event_limit')
            .eq('tenant_id', tenantId)
            .eq('status', 'active')
            .maybeSingle();

        const [eventRes, subRes] = await Promise.all([eventQuery, subQuery]);

        if (!eventRes.error && eventRes.data) setEvents(eventRes.data);
        if (!subRes.error && subRes.data) setSubscription(subRes.data);

        setLoading(false);
    }, [tenantId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleNextStep = () => {
        if (currentStep === 1 && !formData.event_name) {
            showAlert("Event Name is required.", "error");
            return;
        }
        if (currentStep === 2 && !formData.slug) {
            showAlert("Gallery Slug is required.", "error");
            return;
        }
        setCurrentStep(prev => Math.min(prev + 1, 3));
    };

    const handlePrevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingEvent(null);
        setCurrentStep(1);
        setFormData({ event_name: '', slug: '', event_date: '', description: '' });
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        const cleanSlug = formData.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');

        if (editingEvent) {
            const { error } = await supabase
                .from('events')
                .update({ ...formData, slug: cleanSlug })
                .eq('id', editingEvent.id);
            if (error) { showAlert('Update failed: ' + error.message, "error"); return; }
            showAlert("Event updated successfully!", "success");
        } else {
            const limit = subscription?.event_limit || 5;
            if (events.length >= limit) {
                showAlert(`Limit reached! Your current plan allows only ${limit} active event(s). Please upgrade to add more.`, "error");
                return;
            }

            const insertData = { ...formData, slug: cleanSlug, tenant_id: tenantId };
            const { error } = await supabase
                .from('events')
                .insert([insertData]);
            if (error) { showAlert('Create failed: ' + error.message, "error"); return; }
            showAlert("Event created successfully!", "success");
        }

        resetForm();
        fetchData();
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this event and all its photos?')) return;
        await supabase.from('events').delete().eq('id', id);
        fetchData();
    };

    const startEdit = (event) => {
        setEditingEvent(event);
        setFormData({
            event_name: event.event_name,
            slug: event.slug,
            event_date: event.event_date || '',
            description: event.description || '',
        });
        setCurrentStep(1);
        setShowForm(true);
    };

    const galleryUrl = (slug) => `${window.location.origin}/gallery/${slug}`;

    const copyLink = (slug) => {
        navigator.clipboard.writeText(galleryUrl(slug));
        showAlert('Gallery link copied!', 'success');
    };

    const filteredEvents = events.filter(e =>
        e.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const stepVariants = {
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
        exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Event Manager</h1>
                    <p className="text-slate-500 text-sm mt-1">{events.length} / {subscription?.event_limit || 5} events used</p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowForm(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition shadow-sm hover:shadow-md active:scale-95"
                >
                    <Plus size={18} /> New Event
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm shadow-sm transition-shadow hover:shadow-md"
                />
            </div>

            {/* Events Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col h-[200px]">
                            <div className="flex justify-between items-start mb-4">
                                <div className="space-y-2 flex-1 pr-4">
                                    <div className="h-5 bg-slate-200 animate-pulse rounded-md w-3/4"></div>
                                    <div className="h-4 bg-slate-100 animate-pulse rounded-md w-1/2"></div>
                                </div>
                                <div className="h-5 w-12 bg-slate-100 animate-pulse rounded-full"></div>
                            </div>
                            <div className="space-y-2 mb-6 flex-1">
                                <div className="h-4 bg-slate-100 animate-pulse rounded-md w-2/3"></div>
                                <div className="h-4 bg-slate-50 animate-pulse rounded-md w-full"></div>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-auto">
                                <div className="h-6 w-16 bg-blue-50 animate-pulse rounded-lg"></div>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4].map(btn => <div key={btn} className="h-8 w-8 bg-slate-100 animate-pulse rounded-xl"></div>)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredEvents.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-3xl border border-slate-200/60 shadow-sm">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Calendar className="w-10 h-10 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No events yet</h3>
                    <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">Create your first event to start capturing amazing memories and connecting devices.</p>
                    <button
                        onClick={() => { resetForm(); setShowForm(true); }}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition shadow-sm hover:shadow-md active:scale-95"
                    >
                        <Plus size={18} /> Create First Event
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEvents.map((event) => (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl border border-slate-200/60 p-6 hover:shadow-lg hover:border-blue-100 transition-all group flex flex-col"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1 min-w-0 pr-4">
                                    <h3 className="font-bold text-lg text-slate-900 truncate group-hover:text-blue-700 transition-colors">{event.event_name}</h3>
                                    <p className="text-xs text-slate-400 font-mono mt-1 bg-slate-50 inline-block px-2 py-1 rounded truncate max-w-full">/{event.slug}</p>
                                </div>
                                <span className={`px-2.5 py-1 text-[10px] rounded-full font-bold uppercase tracking-wider ${event.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                    {event.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            <div className="space-y-2 mb-6 flex-1">
                                {event.event_date && (
                                    <p className="text-sm text-slate-600 flex items-center gap-2">
                                        <Calendar size={15} className="text-slate-400" />
                                        {new Date(event.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                )}
                                {event.description && (
                                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{event.description}</p>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
                                    {event.photos?.[0]?.count || 0} Photos
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <button onClick={() => startEdit(event)} className="p-2.5 hover:bg-slate-100 rounded-xl transition text-slate-500 hover:text-blue-600" title="Edit">
                                        <Pencil size={18} />
                                    </button>
                                    <button onClick={() => copyLink(event.slug)} className="p-2.5 hover:bg-slate-100 rounded-xl transition text-slate-500 hover:text-blue-600" title="Copy gallery link">
                                        <Copy size={18} />
                                    </button>
                                    <button onClick={() => setShowQr(event)} className="p-2.5 hover:bg-slate-100 rounded-xl transition text-slate-500 hover:text-blue-600" title="QR Code">
                                        <QrCode size={18} />
                                    </button>
                                    <a href={galleryUrl(event.slug)} target="_blank" rel="noreferrer" className="p-2.5 hover:bg-slate-100 rounded-xl transition text-slate-500 hover:text-blue-600" title="Open gallery">
                                        <ExternalLink size={18} />
                                    </a>
                                    <button onClick={() => handleDelete(event.id)} className="p-2.5 hover:bg-rose-50 rounded-xl transition text-slate-400 hover:text-rose-600 ml-1" title="Delete">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Event Form Wizard Modal */}
            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                            className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl relative overflow-hidden"
                        >
                            <button onClick={resetForm} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors z-10">
                                <X size={20} />
                            </button>
                            
                            <div className="mb-8 pr-10">
                                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                                    {editingEvent ? 'Edit Event' : 'Create New Event'}
                                </h2>
                                <p className="text-slate-500 text-sm mt-1">
                                    {currentStep === 1 && "Start by giving your event a name and date."}
                                    {currentStep === 2 && "Customize how your guests will see the gallery."}
                                    {currentStep === 3 && "Review everything before publishing."}
                                </p>
                            </div>

                            {/* Stepper Indicator */}
                            <div className="flex items-center gap-2 mb-8">
                                {[1, 2, 3].map((step) => (
                                    <div key={step} className="flex-1 flex items-center">
                                        <div className={`h-2 flex-1 rounded-full transition-colors duration-300 ${step <= currentStep ? 'bg-blue-600' : 'bg-slate-100'}`} />
                                    </div>
                                ))}
                            </div>

                            <div className="relative min-h-[220px]">
                                <AnimatePresence mode="wait">
                                    {currentStep === 1 && (
                                        <motion.div key="step1" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-5">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Event Name <span className="text-rose-500">*</span></label>
                                                <input type="text" autoFocus required value={formData.event_name} onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                                                    className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-900 font-medium transition-all shadow-sm" placeholder="e.g. Wedding Sarah & John" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Event Date</label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                    <input type="date" value={formData.event_date} onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                                                        className="w-full pl-12 pr-5 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-900 transition-all shadow-sm" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {currentStep === 2 && (
                                        <motion.div key="step2" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-5">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Gallery Slug <span className="text-rose-500">*</span></label>
                                                <input type="text" required value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                                    className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-900 font-mono text-sm transition-all shadow-sm" placeholder="wedding-sarah-john" />
                                                <div className="mt-2 text-xs font-mono text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center gap-2 overflow-x-auto">
                                                    <span className="text-slate-400 select-none">{window.location.origin}/gallery/</span>
                                                    <span className="text-blue-600 font-bold">{formData.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') || '...'}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Description (Optional)</label>
                                                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                    className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-900 transition-all shadow-sm resize-none" rows={3} placeholder="Share a message with your guests..." />
                                            </div>
                                        </motion.div>
                                    )}

                                    {currentStep === 3 && (
                                        <motion.div key="step3" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                                            <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100/50">
                                                <div className="mb-4">
                                                    <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Event Details</h4>
                                                    <p className="font-bold text-slate-900 text-lg">{formData.event_name}</p>
                                                    {formData.event_date && <p className="text-sm text-slate-600 mt-0.5">{new Date(formData.event_date).toLocaleDateString()}</p>}
                                                </div>
                                                <div className="mb-4">
                                                    <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Gallery Link</h4>
                                                    <p className="text-sm font-mono text-slate-700 bg-white p-2 rounded border border-blue-100">/{formData.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')}</p>
                                                </div>
                                                {formData.description && (
                                                    <div>
                                                        <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Description</h4>
                                                        <p className="text-sm text-slate-600 italic">"{formData.description}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Navigation Buttons */}
                            <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-slate-100">
                                {currentStep > 1 ? (
                                    <button type="button" onClick={handlePrevStep} className="px-6 py-3 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                                        Back
                                    </button>
                                ) : <div />}
                                
                                {currentStep < 3 ? (
                                    <button type="button" onClick={handleNextStep} className="px-8 py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg active:scale-95">
                                        Continue
                                    </button>
                                ) : (
                                    <button type="button" onClick={handleSubmit} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 flex items-center gap-2">
                                        {editingEvent ? 'Save Changes' : 'Publish Event'} <Sparkles size={16} />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* QR Code Modal */}
            <AnimatePresence>
                {showQr && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowQr(null)}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-xl text-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-bold text-slate-900 mb-1">{showQr.event_name}</h3>
                            <p className="text-slate-400 text-sm mb-6">Scan to view gallery</p>
                            <div className="flex justify-center mb-4">
                                <QRCodeCanvas value={galleryUrl(showQr.slug)} size={200} level="H" includeMargin />
                            </div>
                            <p className="text-xs text-slate-400 font-mono break-all">{galleryUrl(showQr.slug)}</p>
                            <button onClick={() => setShowQr(null)} className="mt-4 px-6 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition">Close</button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default EventManager;
