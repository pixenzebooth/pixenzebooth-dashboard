/**
 * Gallery Page — Public Event Photo Gallery
 *
 * Route: /gallery/:eventSlug
 * Features:
 *   - Displays all photos from an event
 *   - Download individual photos
 *   - Share gallery link
 *   - QR code for easy mobile access
 *   - Realtime updates (new photos appear automatically)
 *   - Fully public (no authentication required)
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Share2, X, Camera, Clock, ChevronLeft, QrCode, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Gallery = () => {
    const { eventSlug } = useParams();
    const [event, setEvent] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [showQr, setShowQr] = useState(false);

    const galleryUrl = window.location.href;

    // Fetch event and photos
    useEffect(() => {
        if (!eventSlug) return;

        const fetchGallery = async () => {
            try {
                const apiBase = import.meta.env.VITE_API_BASE_URL || '';
                const res = await fetch(`${apiBase}/api/events?slug=${encodeURIComponent(eventSlug)}`);

                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setEvent(data.event);
                        setPhotos(data.photos || []);
                    } else {
                        setError('Event not found.');
                    }
                } else {
                    // Fallback: query Supabase directly
                    await fetchFromSupabase();
                }
            } catch {
                await fetchFromSupabase();
            }

            setLoading(false);
        };

        const fetchFromSupabase = async () => {
            const { data: eventData, error: eventErr } = await supabase
                .from('events')
                .select('id, tenant_id, event_name, event_date, slug, description')
                .eq('slug', eventSlug)
                .eq('is_active', true)
                .single();

            if (eventErr || !eventData) {
                setError('Event not found.');
                return;
            }

            setEvent(eventData);

            const { data: photosData } = await supabase
                .from('photos')
                .select('id, photo_url, created_at')
                .eq('event_id', eventData.id)
                .order('created_at', { ascending: false });

            setPhotos(photosData || []);
        };

        fetchGallery();
    }, [eventSlug]);

    // Realtime: listen for new photos
    useEffect(() => {
        if (!event?.id) return;

        const channel = supabase
            .channel(`gallery_${event.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'photos',
                filter: `event_id=eq.${event.id}`,
            }, (payload) => {
                setPhotos(prev => [payload.new, ...prev]);
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [event?.id]);

    const handleDownload = useCallback(async (photoUrl, index) => {
        try {
            const res = await fetch(photoUrl);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `pixenzebooth-${eventSlug}-${index + 1}.jpg`;
            link.click();
            URL.revokeObjectURL(url);
        } catch {
            // Fallback: open in new tab
            window.open(photoUrl, '_blank');
        }
    }, [eventSlug]);

    const handleShare = useCallback(async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: event?.event_name || 'PixenzeBooth Gallery',
                    text: `Check out photos from ${event?.event_name}!`,
                    url: galleryUrl,
                });
            } catch { /* user cancelled */ }
        } else {
            await navigator.clipboard.writeText(galleryUrl);
            alert('Gallery link copied!');
        }
    }, [event, galleryUrl]);

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        });
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <Camera className="w-16 h-16 text-rose-500 mx-auto mb-4 animate-pulse" />
                    <p className="text-white/70 font-mono text-sm">Loading gallery...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !event) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <ImageIcon className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Event Not Found</h1>
                    <p className="text-white/50 mb-6">The gallery you're looking for doesn't exist or has been deactivated.</p>
                    <a href="/" className="inline-block px-6 py-3 bg-rose-500 text-white rounded-xl font-semibold hover:bg-rose-600 transition">
                        Go Home
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <a href="/" className="text-white/50 hover:text-white transition">
                            <ChevronLeft size={24} />
                        </a>
                        <div>
                            <h1 className="text-lg md:text-xl font-bold truncate max-w-[200px] md:max-w-none">
                                {event.event_name}
                            </h1>
                            {event.event_date && (
                                <p className="text-xs text-white/50 flex items-center gap-1">
                                    <Clock size={12} /> {formatDate(event.event_date)}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowQr(true)}
                            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
                            title="Show QR Code"
                        >
                            <QrCode size={20} />
                        </button>
                        <button
                            onClick={handleShare}
                            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
                            title="Share Gallery"
                        >
                            <Share2 size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Photo Count */}
            <div className="max-w-7xl mx-auto px-4 pt-6 pb-2">
                <p className="text-white/40 text-sm font-mono">
                    {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
                    {event.description && <span className="ml-4 text-white/30">• {event.description}</span>}
                </p>
            </div>

            {/* Photo Grid */}
            {photos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 px-4">
                    <Camera className="w-16 h-16 text-gray-600 mb-4" />
                    <p className="text-white/40 text-lg">No photos yet</p>
                    <p className="text-white/20 text-sm mt-1">Photos will appear here in real-time</p>
                </div>
            ) : (
                <div className="max-w-7xl mx-auto px-4 pb-12">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                        {photos.map((photo, idx) => (
                            <motion.div
                                key={photo.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05, duration: 0.3 }}
                                className="group relative aspect-[3/4] bg-gray-800 rounded-xl overflow-hidden cursor-pointer border border-white/5 hover:border-white/20 transition-all"
                                onClick={() => setSelectedPhoto(photo)}
                            >
                                <img
                                    src={photo.photo_url}
                                    alt={`Photo ${idx + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    loading="lazy"
                                />

                                {/* Hover overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                                    <span className="text-xs text-white/70 font-mono">#{idx + 1}</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDownload(photo.photo_url, idx); }}
                                        className="p-2 bg-white/20 backdrop-blur rounded-lg hover:bg-white/30 transition"
                                        aria-label={`Download photo ${idx + 1}`}
                                    >
                                        <Download size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Lightbox Modal */}
            <AnimatePresence>
                {selectedPhoto && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
                        onClick={() => setSelectedPhoto(null)}
                    >
                        <button
                            onClick={() => setSelectedPhoto(null)}
                            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white z-10"
                            aria-label="Close lightbox"
                        >
                            <X size={32} />
                        </button>

                        <motion.img
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            src={selectedPhoto.photo_url}
                            alt="Full size photo"
                            className="max-w-full max-h-[85vh] object-contain rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                        />

                        <div className="absolute bottom-6 flex gap-3">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDownload(selectedPhoto.photo_url, 0); }}
                                className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-semibold flex items-center gap-2 transition"
                            >
                                <Download size={18} /> Download
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* QR Code Modal */}
            <AnimatePresence>
                {showQr && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                        onClick={() => setShowQr(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.8 }}
                            className="bg-white p-8 rounded-2xl text-center max-w-sm w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{event.event_name}</h3>
                            <p className="text-gray-500 text-sm mb-6">Scan to view this gallery</p>
                            <div className="flex justify-center mb-6">
                                <QRCodeCanvas value={galleryUrl} size={200} level="H" includeMargin />
                            </div>
                            <p className="text-xs text-gray-400 break-all font-mono">{galleryUrl}</p>
                            <button
                                onClick={() => setShowQr(false)}
                                className="mt-4 px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
                            >
                                Close
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Footer */}
            <footer className="text-center py-8 border-t border-white/5">
                <p className="text-white/20 text-xs font-mono">
                    Powered by <span className="text-rose-400">PixenzeBooth</span>
                </p>
            </footer>
        </div>
    );
};

export default Gallery;
