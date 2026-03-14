import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAlert } from '../../context/AlertContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { createFrame, updateFrame } from '../../services/frames';
import { ArrowLeft, Save, Plus, Trash2, Move, Maximize2, Sparkles, Palette, Music, PartyPopper, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import { detectSlots } from '../../utils/slotDetector';

const FrameEditor = () => {
    const navigate = useNavigate();
    const { showAlert } = useAlert();
    const { state } = useLocation();
    const editingFrame = state?.frame;

    const [name, setName] = useState(editingFrame?.name || '');
    const [status, setStatus] = useState(editingFrame?.status || 'active');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(editingFrame?.image_url || null);

    const [imageFileB, setImageFileB] = useState(null);
    const [imagePreviewB, setImagePreviewB] = useState(editingFrame?.layout_config?.images?.b || null);

    const [style, setStyle] = useState(editingFrame?.style || 'Custom');
    const [rarity, setRarity] = useState(editingFrame?.rarity || 'Common');
    const [artist, setArtist] = useState(editingFrame?.artist || 'Default');
    const [allowedEmails, setAllowedEmails] = useState(editingFrame?.allowed_emails?.join(', ') || '');
    const [thumbnailFile, setThumbnailFile] = useState(null);
    const [thumbnailPreview, setThumbnailPreview] = useState(editingFrame?.thumbnail_url || null);

    const [themeId, setThemeId] = useState(editingFrame?.theme_id || 'default');
    const [frameAudioUrl, setFrameAudioUrl] = useState(editingFrame?.audio_url || '');
    const [animationType, setAnimationType] = useState(editingFrame?.animation_type || 'none');
    const [isExclusive, setIsExclusive] = useState(editingFrame?.is_exclusive || false);

    // External URL State — Layout A (for jsDelivr CDN)
    const isExistingExternalUrl = editingFrame?.image_url && !editingFrame.image_url.includes('supabase.co');
    const [useExternalUrl, setUseExternalUrl] = useState(isExistingExternalUrl || false);
    const [externalUrl, setExternalUrl] = useState(isExistingExternalUrl ? editingFrame.image_url : '');

    // External URL State — Layout B
    const existingBImage = editingFrame?.layout_config?.images?.b;
    const isExistingExternalUrlB = existingBImage && !existingBImage.includes('supabase.co');
    const [useExternalUrlB, setUseExternalUrlB] = useState(isExistingExternalUrlB || false);
    const [externalUrlB, setExternalUrlB] = useState(isExistingExternalUrlB ? existingBImage : '');

    // Layout Config: Object { a: [], b: [] }
    const [layouts, setLayouts] = useState(() => {
        const config = editingFrame?.layout_config;
        if (Array.isArray(config)) return { a: config, b: [] };
        if (config && typeof config === 'object') return { a: config.a || [], b: config.b || [] };
        return { a: [], b: [] };
    });

    const [activeLayout, setActiveLayout] = useState('a');
    const [activeTab, setActiveTab] = useState('metadata'); // 'metadata' or 'slots'
    const [selectedSlotId, setSelectedSlotId] = useState(null);

    const photoSlots = layouts[activeLayout];

    const containerRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [detecting, setDetecting] = useState(false);

    // Drag state
    const dragState = useRef({
        active: false,
        type: null, // 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br'
        slotId: null,
        startMouseX: 0,
        startMouseY: 0,
        startSlot: null, // { x, y, width, height }
    });

    const handleFileChange = (e, type = 'image') => {
        const file = e.target.files[0];
        if (file) {
            if (type === 'image') {
                setImageFile(file);
                const reader = new FileReader();
                reader.onload = (f) => setImagePreview(f.target.result);
                reader.readAsDataURL(file);
            } else if (type === 'imageB') {
                setImageFileB(file);
                const reader = new FileReader();
                reader.onload = (f) => setImagePreviewB(f.target.result);
                reader.readAsDataURL(file);
            } else {
                setThumbnailFile(file);
                const reader = new FileReader();
                reader.onload = (f) => setThumbnailPreview(f.target.result);
                reader.readAsDataURL(file);
            }
        }
    };

    const updateLayouts = useCallback((newSlots) => {
        setLayouts(prev => ({
            ...prev,
            [activeLayout]: newSlots
        }));
    }, [activeLayout]);

    const addSlot = () => {
        const newSlot = {
            id: Date.now(),
            x: 10,
            y: 10 + photoSlots.length * 25,
            width: 40,
            height: 20
        };
        updateLayouts([...photoSlots, newSlot]);
        setSelectedSlotId(newSlot.id);
    };

    const updateSlot = useCallback((id, updates) => {
        setLayouts(prev => ({
            ...prev,
            [activeLayout]: prev[activeLayout].map(s => s.id === id ? { ...s, ...updates } : s)
        }));
    }, [activeLayout]);

    const deleteSlot = (id) => {
        updateLayouts(photoSlots.filter(s => s.id !== id));
        setSelectedSlotId(null);
    };

    // --- DRAG & RESIZE LOGIC ---
    const getContainerRect = () => {
        if (!containerRef.current) return null;
        return containerRef.current.getBoundingClientRect();
    };

    const handlePointerDown = (e, slotId, type = 'move') => {
        e.preventDefault();
        e.stopPropagation();

        const slot = photoSlots.find(s => s.id === slotId);
        if (!slot) return;

        setSelectedSlotId(slotId);

        dragState.current = {
            active: true,
            type,
            slotId,
            startMouseX: e.clientX,
            startMouseY: e.clientY,
            startSlot: { ...slot }
        };

        // Capture pointer for smooth dragging even outside element
        e.target.setPointerCapture?.(e.pointerId);
    };

    const handlePointerMove = useCallback((e) => {
        const ds = dragState.current;
        if (!ds.active) return;

        const rect = getContainerRect();
        if (!rect) return;

        const deltaXPct = ((e.clientX - ds.startMouseX) / rect.width) * 100;
        const deltaYPct = ((e.clientY - ds.startMouseY) / rect.height) * 100;

        const { startSlot, type, slotId } = ds;

        let updates = {};

        if (type === 'move') {
            updates = {
                x: Math.round(Math.max(0, Math.min(100 - startSlot.width, startSlot.x + deltaXPct))),
                y: Math.round(Math.max(0, Math.min(100 - startSlot.height, startSlot.y + deltaYPct)))
            };
        } else if (type === 'resize-br') {
            updates = {
                width: Math.round(Math.max(5, Math.min(100 - startSlot.x, startSlot.width + deltaXPct))),
                height: Math.round(Math.max(5, Math.min(100 - startSlot.y, startSlot.height + deltaYPct)))
            };
        } else if (type === 'resize-bl') {
            const newW = Math.round(Math.max(5, startSlot.width - deltaXPct));
            updates = {
                x: Math.round(Math.max(0, startSlot.x + startSlot.width - newW)),
                width: newW,
                height: Math.round(Math.max(5, Math.min(100 - startSlot.y, startSlot.height + deltaYPct)))
            };
        } else if (type === 'resize-tr') {
            const newH = Math.round(Math.max(5, startSlot.height - deltaYPct));
            updates = {
                y: Math.round(Math.max(0, startSlot.y + startSlot.height - newH)),
                width: Math.round(Math.max(5, Math.min(100 - startSlot.x, startSlot.width + deltaXPct))),
                height: newH
            };
        } else if (type === 'resize-tl') {
            const newW = Math.round(Math.max(5, startSlot.width - deltaXPct));
            const newH = Math.round(Math.max(5, startSlot.height - deltaYPct));
            updates = {
                x: Math.round(Math.max(0, startSlot.x + startSlot.width - newW)),
                y: Math.round(Math.max(0, startSlot.y + startSlot.height - newH)),
                width: newW,
                height: newH
            };
        }

        updateSlot(slotId, updates);
    }, [updateSlot]);

    const handlePointerUp = useCallback(() => {
        dragState.current.active = false;
    }, []);

    // Attach global listeners for drag
    useEffect(() => {
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [handlePointerMove, handlePointerUp]);

    const handleSave = async () => {
        if (!name || !imagePreview) return showAlert("Please provide name and system image.", "error");
        setUploading(true);

        try {
            const frameData = {
                name,
                status,
                style,
                rarity,
                artist,
                layout_config: layouts,
                file: imageFile,
                imageFileB: imageFileB,
                thumbnailFile: thumbnailFile,
                thumbnail_url: thumbnailPreview,
                externalImage: (useExternalUrl && externalUrl.trim()) ? externalUrl.trim() : null,
                externalImageB: (useExternalUrlB && externalUrlB.trim()) ? externalUrlB.trim() : null,
                allowed_emails: allowedEmails.trim() ? allowedEmails.split(',').map(e => e.trim()).filter(Boolean) : null,
                theme_id: themeId,
                audio_url: frameAudioUrl.trim() || null,
                animation_type: animationType,
                is_exclusive: isExclusive
            };

            if (editingFrame) {
                await updateFrame(editingFrame.id, frameData);
            } else {
                await createFrame(frameData);
            }

            showAlert("Frame Saved Successfully!", "success");
            navigate('/admin/frames');
        } catch (error) {
            console.error(error);
            showAlert("Error saving frame: " + error.message, "error");
        } finally {
            setUploading(false);
        }
    };

    const selectedSlot = photoSlots.find(s => s.id === selectedSlotId);

    // Resize handle component
    const ResizeHandle = ({ slotId, position }) => {
        const cursorMap = {
            'resize-tl': 'nwse-resize',
            'resize-tr': 'nesw-resize',
            'resize-bl': 'nesw-resize',
            'resize-br': 'nwse-resize'
        };
        const posMap = {
            'resize-tl': '-top-1.5 -left-1.5',
            'resize-tr': '-top-1.5 -right-1.5',
            'resize-bl': '-bottom-1.5 -left-1.5',
            'resize-br': '-bottom-1.5 -right-1.5'
        };

        return (
            <div
                onPointerDown={(e) => handlePointerDown(e, slotId, position)}
                className={`absolute ${posMap[position]} w-3 h-3 bg-white border-2 border-yellow-400 rounded-sm z-50 shadow-md hover:scale-125 transition-transform`}
                style={{ cursor: cursorMap[position], touchAction: 'none' }}
            />
        );
    };

    return (
        <div className="min-h-[calc(100vh-6rem)] lg:h-[calc(100vh-5rem)] font-nunito bg-slate-50 text-slate-800 flex flex-col relative w-full max-w-6xl mx-auto">

            <div className="shrink-0 w-full flex items-center justify-between mb-4 z-10 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <button onClick={() => navigate('/admin/frames')} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 hover:-translate-x-1 font-semibold transition-all shadow-sm">
                    <ArrowLeft size={18} /> Back
                </button>
                <div className="flex items-center gap-3">
                    <Maximize2 className="text-blue-600" size={24} />
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{editingFrame ? 'Edit Frame Layout' : 'New Frame Layout'}</h1>
                </div>
                <button
                    onClick={handleSave}
                    disabled={uploading}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
                >
                    {uploading ? 'Saving...' : <><Save size={18} /> Save Frame</>}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 w-full z-10 flex-1 min-h-0">

                {/* Controls Panel */}
                <div className="lg:col-span-4 bg-white p-5 lg:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">

                    {/* Tabs */}
                    <div className="shrink-0 flex gap-2 mb-4 border-b border-slate-100 pb-4">
                        <button
                            onClick={() => setActiveTab('metadata')}
                            className={`flex-1 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'metadata' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 hover:-translate-y-0.5' : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-slate-200'}`}
                        >
                            <Sparkles size={18} className={activeTab === 'metadata' ? 'text-white' : 'text-slate-400'} /> Metadata
                        </button>
                        <button
                            onClick={() => setActiveTab('slots')}
                            className={`flex-1 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'slots' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20 hover:-translate-y-0.5' : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-slate-200'}`}
                        >
                            <Move size={18} className={activeTab === 'slots' ? 'text-white' : 'text-slate-400'} /> Slots
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {activeTab === 'metadata' && (
                            <div className="animate-in fade-in zoom-in-95 duration-200">
                                <h2 className="font-extrabold text-slate-900 mb-5 text-lg flex items-center gap-2 tracking-tight">
                                    Frame Details
                                </h2>

                                <div className="space-y-5 mb-8 relative">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Frame Name</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                                            placeholder="e.g. Vintage Polaroid"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
                                        <select
                                            value={status} onChange={e => setStatus(e.target.value)}
                                            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium appearance-none"
                                        >
                                            <option value="active">Active</option>
                                            <option value="coming_soon">Coming Soon</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Style</label>
                                            <input
                                                type="text"
                                                value={style}
                                                onChange={e => setStyle(e.target.value)}
                                                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Rarity</label>
                                            <select
                                                value={rarity} onChange={e => setRarity(e.target.value)}
                                                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium appearance-none"
                                            >
                                                <option value="Common">Common</option>
                                                <option value="Rare">Rare</option>
                                                <option value="Epic">Epic</option>
                                                <option value="Legendary">Legendary</option>
                                                <option value="Event">Event</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Artist / Label</label>
                                        <input
                                            type="text"
                                            value={artist}
                                            onChange={e => setArtist(e.target.value)}
                                            placeholder="e.g. Built-in, Guest Artist"
                                            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Allowed Emails (Comma Separated)</label>
                                        <textarea
                                            value={allowedEmails}
                                            onChange={e => setAllowedEmails(e.target.value)}
                                            placeholder="Leave empty for public frames"
                                            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium min-h-[80px]"
                                        />
                                    </div>

                                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                                        <div>
                                            <label className="font-bold text-amber-900 flex items-center gap-1.5 mb-1"><Crown size={16} className="text-amber-500" /> Exclusive Placement</label>
                                            <p className="text-xs text-amber-700/80 font-medium">Highlight this frame in an exclusive banner separated from general selection.</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                            <input type="checkbox" className="sr-only peer" checked={isExclusive} onChange={e => setIsExclusive(e.target.checked)} />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                                        </label>
                                    </div>

                                    {/* Theme & Audio Section */}
                                    <div className="space-y-4 pt-6 border-t border-slate-100">
                                        <h3 className="font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                                            <Palette size={16} className="text-indigo-500" /> Theme & Audio
                                        </h3>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Frame Theme</label>
                                            <select
                                                value={themeId}
                                                onChange={e => setThemeId(e.target.value)}
                                                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium appearance-none"
                                            >
                                                <option value="default">Default (No Theme Change)</option>
                                                <option value="valentine">💖 Valentine (Pink)</option>
                                                <option value="mu">⚽ Manchester United (Red)</option>
                                            </select>
                                            <p className="text-[11px] text-slate-500 mt-1.5">Selecting a theme will change the booth's visual style when this frame is chosen.</p>
                                        </div>
                                        <div>
                                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1.5">
                                                <Music size={14} className="text-slate-500" /> Background Audio URL
                                            </label>
                                            <input
                                                type="url"
                                                value={frameAudioUrl}
                                                onChange={e => setFrameAudioUrl(e.target.value)}
                                                placeholder="e.g. https://music.youtube.com/watch?v=..."
                                                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                                            />
                                            <p className="text-[11px] text-slate-500 mt-1.5">Supports YouTube Music, standard YouTube, and Spotify links. Leave blank for no music.</p>
                                        </div>
                                        <div>
                                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1.5">
                                                <PartyPopper size={14} className="text-amber-500" /> Frame Animation
                                            </label>
                                            <select
                                                value={animationType}
                                                onChange={e => setAnimationType(e.target.value)}
                                                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium appearance-none"
                                            >
                                                <option value="none">None (No Animation)</option>
                                                <option value="confetti">Confetti</option>
                                                <option value="hearts">Hearts</option>
                                                <option value="sparkles">Sparkles</option>
                                                <option value="snow">Snow</option>
                                                <option value="stars">Stars</option>
                                                <option value="fireworks">Fireworks</option>
                                            </select>
                                            <p className="text-[11px] text-slate-500 mt-1.5">Choose a particle animation that plays when this frame is selected by the user.</p>
                                        </div>
                                    </div>

                                    {/* Image Uploads */}
                                    <div className="space-y-4 pt-6 border-t border-slate-100">
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="block text-sm font-semibold text-slate-700">
                                                    Frame Base Image (Layout {activeLayout.toUpperCase()})
                                                </label>
                                                {activeLayout === 'a' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setUseExternalUrl(!useExternalUrl)}
                                                        className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md"
                                                    >
                                                        {useExternalUrl ? 'Upload Instead' : 'Use External URL'}
                                                    </button>
                                                )}
                                                {activeLayout === 'b' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setUseExternalUrlB(!useExternalUrlB)}
                                                        className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md"
                                                    >
                                                        {useExternalUrlB ? 'Upload Instead' : 'Use External URL'}
                                                    </button>
                                                )}
                                            </div>
                                            {(activeLayout === 'a' ? imagePreview : imagePreviewB) && (
                                                <div className="mb-3 h-28 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden relative">
                                                    <div className="absolute inset-0 pattern-dots text-slate-200/50 bg-white" style={{ backgroundSize: '20px 20px', backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)' }} />
                                                    <img src={activeLayout === 'a' ? imagePreview : imagePreviewB} className="h-full object-contain relative z-10" />
                                                </div>
                                            )}

                                            {activeLayout === 'a' && useExternalUrl ? (
                                                <input
                                                    type="text"
                                                    value={externalUrl}
                                                    onChange={(e) => {
                                                        setExternalUrl(e.target.value);
                                                        setImagePreview(e.target.value);
                                                    }}
                                                    placeholder="https://cdn.jsdelivr.net/.../frame.webp"
                                                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500"
                                                />
                                            ) : activeLayout === 'b' && useExternalUrlB ? (
                                                <input
                                                    type="text"
                                                    value={externalUrlB}
                                                    onChange={(e) => {
                                                        setExternalUrlB(e.target.value);
                                                        setImagePreviewB(e.target.value);
                                                    }}
                                                    placeholder="https://cdn.jsdelivr.net/.../frame-b.webp"
                                                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500"
                                                />
                                            ) : (
                                                <input
                                                    type="file"
                                                    onChange={e => handleFileChange(e, activeLayout === 'a' ? 'image' : 'imageB')}
                                                    className="w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 file:font-semibold cursor-pointer border border-slate-200 rounded-xl bg-white p-1"
                                                />
                                            )}
                                            {activeLayout === 'b' && !imagePreviewB && imagePreview && (
                                                <p className="text-[11px] text-slate-500 font-medium mt-1.5">
                                                    *If not provided, Layout B uses Layout A's image.
                                                </p>
                                            )}
                                        </div>

                                        <div className="pt-2">
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Thumbnail (Optional)</label>
                                            {thumbnailPreview && (
                                                <div className="mb-3 h-20 w-20 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden">
                                                    <img src={thumbnailPreview} className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            <input
                                                type="file"
                                                onChange={e => handleFileChange(e, 'thumbnail')}
                                                className="w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 file:font-semibold cursor-pointer border border-slate-200 rounded-xl bg-white p-1"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'slots' && (
                            <div className="animate-in fade-in zoom-in-95 duration-200">
                                <h2 className="font-extrabold text-slate-900 mb-5 text-lg flex items-center gap-2 tracking-tight">
                                    Layout Coordinates
                                </h2>

                                <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 mb-6 flex gap-1 items-center">
                                    <button
                                        onClick={() => { setActiveLayout('a'); setSelectedSlotId(null); }}
                                        className={`flex-1 py-1.5 text-sm rounded-lg font-bold transition-all shadow-sm ${activeLayout === 'a' ? 'bg-white text-blue-600 border border-slate-200' : 'text-slate-500 hover:text-slate-700 border border-transparent'}`}
                                    >
                                        Layout A
                                    </button>
                                    <button
                                        onClick={() => { setActiveLayout('b'); setSelectedSlotId(null); }}
                                        className={`flex-1 py-1.5 text-sm rounded-lg font-bold transition-all shadow-sm ${activeLayout === 'b' ? 'bg-white text-blue-600 border border-slate-200' : 'text-slate-500 hover:text-slate-700 border border-transparent'}`}
                                    >
                                        Layout B
                                    </button>
                                </div>

                                <div className="mb-5 flex flex-col gap-2.5 border-b border-slate-100 pb-5">
                                    <button
                                        onClick={async () => {
                                            const currentPreview = activeLayout === 'a' ? imagePreview : (imagePreviewB || imagePreview);
                                            if (!currentPreview) return showAlert('Upload a frame image first!', 'error');
                                            setDetecting(true);
                                            try {
                                                const slots = await detectSlots(currentPreview);
                                                if (slots.length === 0) {
                                                    showAlert('No transparent areas detected. Ensure photo areas have alpha = 0.', 'error');
                                                } else {
                                                    updateLayouts(slots);
                                                    setSelectedSlotId(null);
                                                    showAlert(`AI detected ${slots.length} photo slot(s)!`, 'success');
                                                }
                                            } catch (err) {
                                                console.error(err);
                                                showAlert('Detection failed: ' + err.message, 'error');
                                            } finally {
                                                setDetecting(false);
                                            }
                                        }}
                                        disabled={detecting}
                                        className={`py-2 px-3 rounded-xl text-sm flex items-center justify-center gap-2 border transition-all font-bold w-full shadow-sm ${detecting ? 'bg-indigo-50 border-indigo-200 text-indigo-400 cursor-wait animate-pulse' : 'bg-indigo-600 border-indigo-700 text-white hover:bg-indigo-700'}`}
                                    >
                                        <Sparkles size={16} /> {detecting ? 'Detecting Zones...' : 'Auto-Detect Alpha Layers'}
                                    </button>
                                    <button onClick={addSlot} className="py-2 px-3 rounded-xl font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 text-sm flex items-center gap-1.5 flex-1 justify-center transition-colors shadow-sm w-full">
                                        <Plus size={16} /> Add Slot Manually
                                    </button>
                                </div>

                                {/* Slot List — compact cards */}
                                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                    {photoSlots.length === 0 && (
                                        <div className="text-center py-8">
                                            <Move className="mx-auto mb-2 text-slate-300" size={24} />
                                            <p className="text-sm text-slate-500 font-medium">No slots defined for {activeLayout.toUpperCase()}.</p>
                                        </div>
                                    )}
                                    {photoSlots.map((slot, idx) => (
                                        <div
                                            key={slot.id}
                                            onClick={() => setSelectedSlotId(slot.id)}
                                            className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedSlotId === slot.id
                                                ? 'bg-blue-50/50 border-blue-400 shadow-[0_2px_10px_rgba(59,130,246,0.1)]'
                                                : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${selectedSlotId === slot.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>SLOT {idx + 1}</span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteSlot(slot.id); }}
                                                    className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-md transition-colors"
                                                    title="Delete Slot"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-4 gap-2">
                                                {[
                                                    { label: 'Left %', key: 'x' },
                                                    { label: 'Top %', key: 'y' },
                                                    { label: 'Wid %', key: 'width' },
                                                    { label: 'Hei %', key: 'height' }
                                                ].map(({ label, key }) => (
                                                    <div key={key}>
                                                        <label className="text-[10px] text-slate-500 font-bold block mb-1 uppercase tracking-wider">{label}</label>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={100}
                                                            value={slot[key]}
                                                            onChange={(e) => updateSlot(slot.id, { [key]: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                                                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 text-center font-mono outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-shadow"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {photoSlots.length > 0 && (
                                    <p className="mt-5 text-[11px] text-slate-500 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100 inline-block text-center flex items-center justify-center gap-1.5 w-full">
                                        <Move size={14} className="text-amber-500" /> Click & drag slots to move. Use corners to resize.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Preview / Work Area */}
                <div
                    className="lg:col-span-8 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner overflow-auto h-full min-h-0 relative"
                    onClick={() => setSelectedSlotId(null)}
                >
                    <div className="absolute inset-0 pattern-dots text-slate-300/40 z-0" style={{ backgroundSize: '16px 16px', backgroundImage: 'radial-gradient(currentColor 1.5px, transparent 1.5px)' }} />

                    <div className="min-h-full w-full grid place-items-center p-4 sm:p-8 relative z-10">
                        {(activeLayout === 'a' ? imagePreview : (imagePreviewB || imagePreview)) ? (
                            <div
                                className="relative shadow-xl select-none bg-white rounded-md mx-auto z-10 w-full"
                                ref={containerRef}
                                style={{ maxWidth: '500px' }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* The Frame Image */}
                                <img
                                    src={activeLayout === 'a' ? imagePreview : (imagePreviewB || imagePreview)}
                                    className="w-full h-auto pointer-events-none select-none relative z-20 block"
                                    alt={`Frame Layout ${activeLayout}`}
                                    draggable={false}
                                />

                                {/* The Slots Layer */}
                                <div className="absolute inset-0 z-30 pointer-events-none">
                                    {photoSlots.map((slot, idx) => {
                                        const isSelected = selectedSlotId === slot.id;
                                        return (
                                            <div
                                                key={slot.id}
                                                onPointerDown={(e) => handlePointerDown(e, slot.id, 'move')}
                                                style={{
                                                    left: `${slot.x}%`,
                                                    top: `${slot.y}%`,
                                                    width: `${slot.width}%`,
                                                    height: `${slot.height}%`,
                                                    touchAction: 'none'
                                                }}
                                                className={`absolute border-[3px] flex items-center justify-center transition-colors pointer-events-auto ${isSelected
                                                    ? 'bg-blue-500/30 border-blue-500 shadow-[0_0_0_2px_rgba(255,255,255,0.7)] cursor-move z-40'
                                                    : 'bg-emerald-500/20 border-emerald-500/70 hover:bg-emerald-500/30 cursor-pointer z-30'
                                                    }`}
                                            >
                                                <span className={`text-sm font-black drop-shadow-md pointer-events-none select-none ${isSelected ? 'text-white' : 'text-white/80'}`}>
                                                    {idx + 1}
                                                </span>

                                                {isSelected && (
                                                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded-md shadow-md whitespace-nowrap pointer-events-none z-50">
                                                        {slot.width}×{slot.height}
                                                    </span>
                                                )}

                                                {/* Resize handles */}
                                                {isSelected && (
                                                    <>
                                                        <ResizeHandle slotId={slot.id} position="resize-tl" />
                                                        <ResizeHandle slotId={slot.id} position="resize-tr" />
                                                        <ResizeHandle slotId={slot.id} position="resize-bl" />
                                                        <ResizeHandle slotId={slot.id} position="resize-br" />
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="text-slate-400 flex flex-col items-center justify-center h-full w-full z-10 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200 border-dashed absolute inset-4">
                                <span className="text-5xl mb-3 opacity-50 grayscale">🖼️</span>
                                <p className="font-semibold text-slate-500">Upload a Base Image to Start Calibration</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FrameEditor;
