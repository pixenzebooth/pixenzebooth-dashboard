import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useAlert } from '../../context/AlertContext';
import { Calendar, Plus, Pencil, Trash2, Copy, ExternalLink, QrCode, Search, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Skeleton } from '../../components/ui/skeleton';

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
    const [formData, setFormData] = useState({ event_name: '', slug: '', event_date: '', description: '' });
    const [currentStep, setCurrentStep] = useState(1);

    const fetchData = useCallback(async () => {
        if (!tenantId) return;
        setLoading(true);
        const eventQuery = supabase.from('events').select('*, photos(count)').eq('tenant_id', tenantId).order('event_date', { ascending: false });
        const subQuery = supabase.from('subscriptions').select('event_limit').eq('tenant_id', tenantId).eq('status', 'active').maybeSingle();
        const [eventRes, subRes] = await Promise.all([eventQuery, subQuery]);
        if (!eventRes.error && eventRes.data) setEvents(eventRes.data);
        if (!subRes.error && subRes.data) setSubscription(subRes.data);
        setLoading(false);
    }, [tenantId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleNextStep = () => {
        if (currentStep === 1 && !formData.event_name) { showAlert("Event Name is required.", "error"); return; }
        if (currentStep === 2 && !formData.slug) { showAlert("Gallery Slug is required.", "error"); return; }
        setCurrentStep(prev => Math.min(prev + 1, 3));
    };
    const handlePrevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

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
            const { error } = await supabase.from('events').update({ ...formData, slug: cleanSlug }).eq('id', editingEvent.id);
            if (error) { showAlert('Update failed: ' + error.message, "error"); return; }
            showAlert("Event updated successfully!", "success");
        } else {
            const limit = subscription?.event_limit || 5;
            if (events.length >= limit) { showAlert(`Limit reached! Your current plan allows only ${limit} active event(s).`, "error"); return; }
            const { error } = await supabase.from('events').insert([{ ...formData, slug: cleanSlug, tenant_id: tenantId }]);
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
        setFormData({ event_name: event.event_name, slug: event.slug, event_date: event.event_date || '', description: event.description || '' });
        setCurrentStep(1);
        setShowForm(true);
    };

    const galleryUrl = (slug) => `${window.location.origin}/gallery/${slug}`;
    const copyLink = (slug) => { navigator.clipboard.writeText(galleryUrl(slug)); showAlert('Gallery link copied!', 'success'); };

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Event Manager</h1>
                    <p className="text-muted-foreground text-sm mt-1">{events.length} / {subscription?.event_limit || 5} events used</p>
                </div>
                <Button onClick={() => { resetForm(); setShowForm(true); }}>
                    <Plus className="h-4 w-4" /> New Event
                </Button>
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search events..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="p-6 space-y-4">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-4 w-full" />
                            <div className="flex gap-2 pt-4">
                                {[1, 2, 3, 4].map(b => <Skeleton key={b} className="h-8 w-8 rounded-lg" />)}
                            </div>
                        </Card>
                    ))}
                </div>
            ) : filteredEvents.length === 0 ? (
                <Card className="text-center py-20">
                    <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Calendar className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">No events yet</h3>
                    <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">Create your first event to start capturing amazing memories.</p>
                    <Button onClick={() => { resetForm(); setShowForm(true); }}>
                        <Plus className="h-4 w-4" /> Create First Event
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredEvents.map((event) => (
                        <motion.div key={event.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
                            <Card className="p-5 hover:shadow-md transition-all group flex flex-col h-full">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">{event.event_name}</h3>
                                        <code className="text-xs text-muted-foreground font-mono mt-1 bg-muted inline-block px-2 py-0.5 rounded truncate max-w-full">/{event.slug}</code>
                                    </div>
                                    <Badge variant={event.is_active ? 'success' : 'secondary'}>
                                        {event.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>

                                <div className="space-y-1.5 mb-4 flex-1">
                                    {event.event_date && (
                                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                                            <Calendar size={14} />
                                            {new Date(event.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                    )}
                                    {event.description && <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>}
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t">
                                    <Badge variant="outline" className="text-primary">{event.photos?.[0]?.count || 0} Photos</Badge>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(event)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyLink(event.slug)} title="Copy link"><Copy className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowQr(event)} title="QR Code"><QrCode className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild><a href={galleryUrl(event.slug)} target="_blank" rel="noreferrer" title="Open gallery"><ExternalLink className="h-4 w-4" /></a></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(event.id)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Event Form Dialog */}
            <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingEvent ? 'Edit Event' : 'Create New Event'}</DialogTitle>
                        <DialogDescription>
                            {currentStep === 1 && "Start by giving your event a name and date."}
                            {currentStep === 2 && "Customize how your guests will see the gallery."}
                            {currentStep === 3 && "Review everything before publishing."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center gap-2 mb-4">
                        {[1, 2, 3].map((step) => (
                            <div key={step} className="flex-1"><div className={`h-1.5 rounded-full transition-colors ${step <= currentStep ? 'bg-primary' : 'bg-muted'}`} /></div>
                        ))}
                    </div>

                    <div className="relative min-h-[200px]">
                        <AnimatePresence mode="wait">
                            {currentStep === 1 && (
                                <motion.div key="step1" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Event Name <span className="text-destructive">*</span></label>
                                        <Input autoFocus required value={formData.event_name} onChange={(e) => setFormData({ ...formData, event_name: e.target.value })} placeholder="e.g. Wedding Sarah & John" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Event Date</label>
                                        <Input type="date" value={formData.event_date} onChange={(e) => setFormData({ ...formData, event_date: e.target.value })} />
                                    </div>
                                </motion.div>
                            )}
                            {currentStep === 2 && (
                                <motion.div key="step2" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Gallery Slug <span className="text-destructive">*</span></label>
                                        <Input required value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="wedding-sarah-john" className="font-mono" />
                                        <div className="text-xs font-mono text-muted-foreground bg-muted p-2 rounded flex items-center gap-1 overflow-x-auto">
                                            <span className="text-muted-foreground/70">{window.location.origin}/gallery/</span>
                                            <span className="text-primary font-semibold">{formData.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') || '...'}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Description (Optional)</label>
                                        <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                                            rows={3} placeholder="Share a message with your guests..." />
                                    </div>
                                </motion.div>
                            )}
                            {currentStep === 3 && (
                                <motion.div key="step3" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
                                    <div className="bg-primary/5 rounded-xl p-5 border border-primary/10 space-y-4">
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Event Details</p>
                                            <p className="font-semibold text-lg">{formData.event_name}</p>
                                            {formData.event_date && <p className="text-sm text-muted-foreground mt-0.5">{new Date(formData.event_date).toLocaleDateString()}</p>}
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Gallery Link</p>
                                            <code className="text-sm font-mono bg-background p-2 rounded border block">/{formData.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')}</code>
                                        </div>
                                        {formData.description && (
                                            <div>
                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</p>
                                                <p className="text-sm text-muted-foreground italic">"{formData.description}"</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-4 border-t">
                        {currentStep > 1 ? (
                            <Button variant="ghost" onClick={handlePrevStep}>Back</Button>
                        ) : <div />}
                        {currentStep < 3 ? (
                            <Button onClick={handleNextStep}>Continue</Button>
                        ) : (
                            <Button onClick={handleSubmit}>
                                {editingEvent ? 'Save Changes' : 'Publish Event'} <Sparkles className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* QR Code Dialog */}
            <Dialog open={!!showQr} onOpenChange={() => setShowQr(null)}>
                <DialogContent className="max-w-sm text-center">
                    <DialogHeader>
                        <DialogTitle>{showQr?.event_name}</DialogTitle>
                        <DialogDescription>Scan to view gallery</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center my-4">
                        {showQr && <QRCodeCanvas value={galleryUrl(showQr.slug)} size={200} level="H" includeMargin />}
                    </div>
                    {showQr && <p className="text-xs text-muted-foreground font-mono break-all">{galleryUrl(showQr.slug)}</p>}
                    <Button variant="secondary" onClick={() => setShowQr(null)}>Close</Button>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default EventManager;
