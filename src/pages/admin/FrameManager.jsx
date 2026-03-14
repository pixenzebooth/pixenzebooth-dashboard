import React, { useEffect, useState } from 'react';
import { useAlert } from '../../context/AlertContext';
// Removed duplicate getFrames import if it was there earlier, or just ensuring consistency.
// The previous block handles imports.

import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit, Home, AlertCircle, Sparkles, Gift, RefreshCw, Trophy, Users, Image as ImageIcon, X, Link as LinkIcon } from 'lucide-react';
import * as Icons from 'lucide-react';
import { motion, Reorder } from 'framer-motion';
import { updateFrameOrder, getFrames, deleteFrame, updateFrame } from '../../services/frames';
import { supabase } from '../../lib/supabase';

const FrameManager = () => {
    const navigate = useNavigate();
    const { showAlert } = useAlert();
    const [frames, setFrames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isReordering, setIsReordering] = useState(false);
    const [originalOrder, setOriginalOrder] = useState([]);
    const [tenantId, setTenantId] = useState(null);

    useEffect(() => {
        // Resolve tenant_id on mount
        const init = async () => {
            const { data: tid } = await supabase.rpc('get_my_tenant_id');
            if (tid) setTenantId(tid);
            loadFrames(tid);
        };
        init();
    }, []);

    const loadFrames = async (tid) => {
        try {
            const data = await getFrames(tid || tenantId);
            setFrames(data);
        } catch (error) {
            console.error("Failed to load frames:", error);
            showAlert("Failed to load frames. Check console.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, imageUrl) => {
        if (!confirm("Are you sure you want to delete this frame?")) return;
        try {
            await deleteFrame(id, imageUrl);
            setFrames(frames.filter(f => f.id !== id));
        } catch (error) {
            console.error(error);
            showAlert("Failed to delete.", "error");
        }
    };

    const toggleStatus = async (frame) => {
        const newStatus = frame.status === 'active' ? 'coming_soon' : 'active';
        try {
            const updated = await updateFrame(frame.id, { status: newStatus });
            setFrames(frames.map(f => f.id === frame.id ? updated : f));
        } catch (error) {
            console.error(error);
            showAlert("Failed to update status.", "error");
        }
    };

    return (
        <div className="relative">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Frames</h1>
                <div className="flex flex-wrap items-center gap-2">
                    {isReordering ? (
                        <>
                            <button
                                onClick={async () => {
                                    setLoading(true);
                                    await updateFrameOrder(frames);
                                    setLoading(false);
                                    setIsReordering(false);
                                    showAlert("Order Saved!", "success");
                                }}
                                className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 shadow-sm transition-colors"
                            >
                                Save Order
                            </button>
                            <button
                                onClick={() => {
                                    setFrames(originalOrder);
                                    setIsReordering(false);
                                }}
                                className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 shadow-sm transition-colors"
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => {
                                setOriginalOrder([...frames]);
                                setIsReordering(true);
                            }}
                            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <Icons.Move size={16} /> Reorder
                        </button>
                    )}
                    <button
                        onClick={() => navigate('/frames/new')}
                        className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
                        disabled={isReordering}
                    >
                        <Icons.Plus size={16} /> New Frame
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                    <Icons.Loader2 className="animate-spin" size={32} />
                    <p className="font-medium text-slate-500">Loading frame data...</p>
                </div>
            ) : isReordering ? (
                <Reorder.Group axis="y" values={frames} onReorder={setFrames} className="space-y-3 max-w-3xl mx-auto">
                    {frames.map((frame) => (
                        <Reorder.Item key={frame.id} value={frame} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4 cursor-move shadow-sm relative group hover:border-blue-300 transition-colors">
                            <div className="text-slate-400 group-hover:text-blue-500 transition-colors"><Icons.GripVertical size={20} /></div>
                            <div className="h-14 w-14 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 overflow-hidden">
                                <img src={frame.image_url} alt={frame.name} className="w-full h-full object-contain" />
                            </div>
                            <div className="flex-1">
                                <div className="font-semibold text-slate-900">{frame.name}</div>
                                <div className="text-xs text-slate-500 capitalize mt-0.5">{frame.status.replace('_', ' ')}</div>
                            </div>
                        </Reorder.Item>
                    ))}
                </Reorder.Group>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {frames.map((frame, index) => (
                        <motion.div
                            key={frame.id}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: index * 0.05 }}
                            className={`bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 relative group shadow-sm hover:shadow-md transition-all ${frame.status === 'coming_soon' ? 'opacity-80 grayscale-[20%]' : ''}`}
                        >
                            <div className="aspect-[2/3] bg-slate-50 rounded-xl overflow-hidden relative border border-slate-100 flex items-center justify-center">
                                {/* Transparent checkerboard pattern subtle */}
                                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000000 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
                                <img src={frame.image_url} className="w-full h-full object-contain relative z-10 p-2" alt={frame.name} />

                                {frame.is_exclusive && (
                                    <div className="absolute top-3 right-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-black px-2.5 py-1 rounded-md shadow-[0_2px_10px_rgba(245,158,11,0.3)] flex items-center gap-1 z-30 uppercase tracking-widest border border-amber-300">
                                        <Icons.Crown size={12} fill="currentColor" /> Exclusive
                                    </div>
                                )}

                                {frame.status === 'coming_soon' && (
                                    <div className="absolute inset-x-0 bottom-4 flex justify-center z-20">
                                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-3 py-1 rounded-full border border-amber-200 shadow-sm uppercase tracking-wider">
                                            Coming Soon
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-start gap-2">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-900 truncate" title={frame.name}>{frame.name}</h3>
                                    <p className="text-xs text-slate-500 mt-1">{new Date(frame.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                    <button
                                        onClick={() => navigate(`/frames/edit/${frame.id}`, { state: { frame } })}
                                        className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 border border-transparent hover:border-blue-100 transition-colors"
                                        title="Edit Frame"
                                    >
                                        <Icons.Edit size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(frame.id, frame.image_url)}
                                        className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-rose-50 hover:text-rose-600 border border-transparent hover:border-rose-100 transition-colors"
                                        title="Delete Frame"
                                    >
                                        <Icons.Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${frame.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                    <span className="text-xs font-medium text-slate-600 capitalize">{frame.status.replace('_', ' ')}</span>
                                </div>
                                <button
                                    onClick={() => toggleStatus(frame)}
                                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wide transition-colors"
                                >
                                    {frame.status === 'active' ? 'Hide' : 'Activate'}
                                </button>
                            </div>

                        </motion.div>
                    ))}

                    {frames.length === 0 && (
                        <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-500 bg-white border border-dashed border-slate-300 rounded-2xl gap-3">
                            <Icons.Image className="text-slate-300" size={48} />
                            <div className="text-center">
                                <p className="font-medium text-slate-700">No frames found</p>
                                <p className="text-sm mt-1">Upload a new frame to get started</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FrameManager;

