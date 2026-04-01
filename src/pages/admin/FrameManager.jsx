import React, { useEffect, useState } from 'react';
import { useAlert } from '../../context/AlertContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit, Crown, GripVertical, Move, Loader2, Image as ImageIcon } from 'lucide-react';
import * as Icons from 'lucide-react';
import { motion, Reorder } from 'framer-motion';
import { updateFrameOrder, getFrames, deleteFrame, updateFrame } from '../../services/frames';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../lib/cn';

const FrameManager = () => {
    const navigate = useNavigate();
    const { showAlert } = useAlert();
    const [frames, setFrames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isReordering, setIsReordering] = useState(false);
    const [originalOrder, setOriginalOrder] = useState([]);
    const [tenantId, setTenantId] = useState(null);

    useEffect(() => {
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

    const setFrameStatus = async (frame, newStatus) => {
        try {
            const updated = await updateFrame(frame.id, { status: newStatus });
            setFrames(frames.map(f => f.id === frame.id ? updated : f));
            showAlert(`Frame is now ${newStatus.replace('_', ' ')}`, "success");
        } catch (error) {
            console.error(error);
            showAlert("Failed to update status.", "error");
        }
    };

    return (
        <div className="relative">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Frames</h1>
                    <p className="text-sm text-muted-foreground mt-1">{frames.length} total frames</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {isReordering ? (
                        <>
                            <Button
                                variant="default"
                                onClick={async () => {
                                    setLoading(true);
                                    await updateFrameOrder(frames);
                                    setLoading(false);
                                    setIsReordering(false);
                                    showAlert("Order Saved!", "success");
                                }}
                            >
                                Save Order
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setFrames(originalOrder);
                                    setIsReordering(false);
                                }}
                            >
                                Cancel
                            </Button>
                        </>
                    ) : (
                        <Button
                            variant="outline"
                            onClick={() => {
                                setOriginalOrder([...frames]);
                                setIsReordering(true);
                            }}
                        >
                            <Move className="h-4 w-4" />
                            Reorder
                        </Button>
                    )}
                    <Button onClick={() => navigate('/frames/new')} disabled={isReordering}>
                        <Plus className="h-4 w-4" />
                        New Frame
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <Card key={i} className="p-4 space-y-4">
                            <Skeleton className="aspect-[2/3] w-full rounded-lg" />
                            <Skeleton className="h-5 w-2/3" />
                            <Skeleton className="h-4 w-1/3" />
                        </Card>
                    ))}
                </div>
            ) : isReordering ? (
                <Reorder.Group axis="y" values={frames} onReorder={setFrames} className="space-y-2 max-w-3xl mx-auto">
                    {frames.map((frame) => (
                        <Reorder.Item key={frame.id} value={frame} className="bg-card p-4 rounded-xl border flex items-center gap-4 cursor-move relative group hover:border-primary/30 transition-colors">
                            <div className="text-muted-foreground group-hover:text-primary transition-colors"><GripVertical size={20} /></div>
                            <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                                <img src={frame.image_url} alt={frame.name} className="w-full h-full object-contain" />
                            </div>
                            <div className="flex-1">
                                <div className="font-medium">{frame.name}</div>
                                <div className="text-xs text-muted-foreground capitalize mt-0.5">{frame.status.replace('_', ' ')}</div>
                            </div>
                        </Reorder.Item>
                    ))}
                </Reorder.Group>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {frames.map((frame, index) => (
                        <motion.div
                            key={frame.id}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Card className={cn("p-4 flex flex-col gap-4 relative group hover:shadow-md transition-all", frame.status === 'deactive' && 'opacity-60 grayscale')}>
                                <div className="aspect-[2/3] bg-muted rounded-lg overflow-hidden relative flex items-center justify-center">
                                    <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
                                    <img src={frame.image_url} className="w-full h-full object-contain relative z-10 p-2" alt={frame.name} />

                                    {frame.is_exclusive && (
                                        <Badge className="absolute top-2 right-2 z-30 bg-amber-500 hover:bg-amber-500 text-white gap-1">
                                            <Crown size={10} /> Exclusive
                                        </Badge>
                                    )}

                                    {frame.status === 'deactive' && (
                                        <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-20 flex items-center justify-center">
                                            <Badge variant="secondary">Deactivated</Badge>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold truncate" title={frame.name}>{frame.name}</h3>
                                        <p className="text-xs text-muted-foreground mt-1">{new Date(frame.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => navigate(`/frames/edit/${frame.id}`, { state: { frame } })}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            onClick={() => handleDelete(frame.id, frame.image_url)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="mt-auto pt-3 border-t space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("w-2 h-2 rounded-full", frame.status === 'active' ? 'bg-emerald-500' : 'bg-muted-foreground/30')}></div>
                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{frame.status.replace('_', ' ')}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-lg">
                                        <Button
                                            variant={frame.status === 'active' ? 'secondary' : 'ghost'}
                                            size="sm"
                                            className={cn("text-xs h-7", frame.status === 'active' && 'bg-background shadow-sm text-emerald-600')}
                                            onClick={() => setFrameStatus(frame, 'active')}
                                        >
                                            Active
                                        </Button>
                                        <Button
                                            variant={frame.status === 'deactive' ? 'secondary' : 'ghost'}
                                            size="sm"
                                            className={cn("text-xs h-7", frame.status === 'deactive' && 'bg-background shadow-sm text-destructive')}
                                            onClick={() => setFrameStatus(frame, 'deactive')}
                                        >
                                            Deactive
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))}

                    {frames.length === 0 && (
                        <div className="col-span-full py-16 flex flex-col items-center justify-center text-muted-foreground bg-card border border-dashed rounded-xl gap-3">
                            <ImageIcon className="text-muted-foreground/30" size={48} />
                            <div className="text-center">
                                <p className="font-medium text-foreground">No frames found</p>
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
