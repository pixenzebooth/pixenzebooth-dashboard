import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../context/AlertContext';
import { Upload, Trash2, Zap, Loader2, Image as ImageIcon } from 'lucide-react';
import { parseCubeLUT, createLUTTexture, createFilterProgram, createQuadValues } from '../../utils/lutUtils';
import { uploadToGitHub } from '../../lib/github';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../lib/cn';

const FilterManager = () => {
    const { showAlert } = useAlert();
    const [filters, setFilters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const canvasRef = useRef(null);
    const glRef = useRef(null);

    useEffect(() => {
        fetchFilters();
        initWebGL();
    }, []);

    const initWebGL = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
        if (!gl) { console.error("WebGL2 not supported"); return; }
        glRef.current = gl;
    };

    const fetchFilters = async () => {
        try {
            const { data, error } = await supabase.from('luts').select().order('created_at', { ascending: false });
            if (error) throw error;
            setFilters(data || []);
        } catch (error) {
            showAlert(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
        else if (e.type === 'dragleave') setDragActive(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const files = [...e.dataTransfer.files];
        if (files.length > 0) handleFileUpload(files[0]);
    };

    const handleFileUpload = async (file) => {
        if (!file.name.endsWith('.cube')) {
            showAlert('Please upload a .cube file', 'error');
            return;
        }
        setUploading(true);
        try {
            const text = await file.text();
            const thumbnailBlob = await generateThumbnail(text);
            let storagePath, thumbnailUrl;

            if (import.meta.env.VITE_GITHUB_TOKEN) {
                storagePath = await uploadToGitHub(file, 'luts');
                thumbnailUrl = await uploadToGitHub(new File([thumbnailBlob], `thumb_${file.name}.jpg`, { type: 'image/jpeg' }), 'luts');
            } else if (import.meta.env.PROD) {
                throw new Error("GitHub upload is disabled in production for security.");
            } else {
                const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
                const { error: uploadError } = await supabase.storage.from('luts').upload(fileName, file, { cacheControl: '31536000' });
                if (uploadError) throw uploadError;
                const thumbName = `thumb_${fileName}.jpg`;
                const { error: thumbError } = await supabase.storage.from('luts').upload(thumbName, thumbnailBlob, { cacheControl: '31536000' });
                if (thumbError) throw thumbError;
                const { data: publicUrlData1 } = supabase.storage.from('luts').getPublicUrl(fileName);
                const { data: publicUrlData2 } = supabase.storage.from('luts').getPublicUrl(thumbName);
                storagePath = publicUrlData1.publicUrl;
                thumbnailUrl = publicUrlData2.publicUrl;
            }

            const { error: dbError } = await supabase.from('luts').insert({
                name: file.name.replace('.cube', ''),
                storage_path: storagePath,
                lut_url: storagePath,
                thumbnail_url: thumbnailUrl,
                is_active: true
            });
            if (dbError) throw dbError;
            showAlert('Filter uploaded successfully!', 'success');
            fetchFilters();
        } catch (error) {
            console.error(error);
            showAlert('Failed to upload filter: ' + error.message, 'error');
        } finally {
            setUploading(false);
        }
    };

    const generateThumbnail = async (lutText) => {
        return new Promise((resolve) => {
            const gl = glRef.current;
            const canvas = canvasRef.current;
            if (!gl || !canvas) { resolve(null); return; }
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&q=80';
            img.onload = () => {
                canvas.width = 300; canvas.height = 300;
                gl.viewport(0, 0, 300, 300);
                const { size, data } = parseCubeLUT(lutText);
                const imgTexture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, imgTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                const lutTexture = createLUTTexture(gl, { size, data });
                const program = createFilterProgram(gl);
                gl.useProgram(program);
                const { vao, count } = createQuadValues(gl);
                gl.bindVertexArray(vao);
                const uImage = gl.getUniformLocation(program, 'u_image');
                const uLut = gl.getUniformLocation(program, 'u_lut');
                const uIntensity = gl.getUniformLocation(program, 'u_intensity');
                const uUseLUT = gl.getUniformLocation(program, 'u_useLUT');
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, imgTexture);
                gl.uniform1i(uImage, 0);
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_3D, lutTexture);
                gl.uniform1i(uLut, 1);
                gl.uniform1f(uIntensity, 1.0);
                gl.uniform1i(uUseLUT, 1);
                gl.drawArrays(gl.TRIANGLES, 0, count);
                canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.8);
                gl.deleteTexture(imgTexture);
                gl.deleteTexture(lutTexture);
                gl.deleteProgram(program);
            };
            img.onerror = () => resolve(null);
        });
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this filter?')) return;
        try {
            const { error } = await supabase.from('luts').delete().eq('id', id);
            if (error) throw error;
            setFilters(prev => prev.filter(f => f.id !== id));
            showAlert('Filter deleted', 'success');
        } catch (error) {
            showAlert(error.message, 'error');
        }
    };

    const handleToggleActive = async (id, currentStatus) => {
        try {
            const { error } = await supabase.from('luts').update({ is_active: !currentStatus }).eq('id', id);
            if (error) throw error;
            setFilters(prev => prev.map(f => f.id === id ? { ...f, is_active: !currentStatus } : f));
        } catch (error) {
            showAlert(error.message, 'error');
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Zap className="text-primary" size={24} />
                        Filter Manager
                    </h1>
                    <p className="text-muted-foreground mt-1">Upload and manage .cube LUT filters for the photobooth.</p>
                </div>
            </div>

            {/* Upload Zone */}
            <Card
                className={cn(
                    "border-2 border-dashed p-10 text-center transition-all cursor-pointer",
                    dragActive ? 'border-primary bg-primary/5 scale-[1.01]' : 'hover:border-muted-foreground/30'
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                {uploading ? (
                    <div className="flex flex-col items-center gap-4 py-4">
                        <Loader2 className="animate-spin text-primary" size={40} />
                        <p className="text-lg font-semibold animate-pulse">Generating preview & uploading...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3 py-2">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                            <Upload size={28} className="text-primary" />
                        </div>
                        <h3 className="text-xl font-bold">Drag & Drop .cube file here</h3>
                        <p className="text-muted-foreground text-sm">or</p>
                        <label>
                            <Button asChild variant="default">
                                <span>Browse Files</span>
                            </Button>
                            <input type="file" accept=".cube" className="hidden" onChange={(e) => handleFileUpload(e.target.files[0])} />
                        </label>
                    </div>
                )}
            </Card>

            <canvas ref={canvasRef} className="hidden" />

            {/* Filter List */}
            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <Card key={i} className="overflow-hidden">
                            <Skeleton className="aspect-square w-full" />
                            <div className="p-4 space-y-2">
                                <Skeleton className="h-4 w-2/3" />
                                <Skeleton className="h-8 w-full" />
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filters.map((filter) => (
                        <Card key={filter.id} className={cn("overflow-hidden flex flex-col group transition-all", !filter.is_active && 'opacity-60 grayscale-[30%]')}>
                            <div className="aspect-square bg-muted relative">
                                {filter.thumbnail_url ? (
                                    <img src={filter.thumbnail_url} alt={filter.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                                        <ImageIcon size={40} />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        className="h-7 w-7 bg-background/90 backdrop-blur-sm text-destructive hover:text-destructive"
                                        onClick={() => handleDelete(filter.id)}
                                    >
                                        <Trash2 size={14} />
                                    </Button>
                                </div>
                            </div>

                            <div className="p-3 flex flex-col flex-1">
                                <h3 className="font-semibold truncate mb-3 text-sm" title={filter.name}>{filter.name}</h3>
                                <div className="mt-auto">
                                    <Button
                                        variant={filter.is_active ? 'default' : 'outline'}
                                        size="sm"
                                        className="w-full text-xs"
                                        onClick={() => handleToggleActive(filter.id, filter.is_active)}
                                    >
                                        {filter.is_active ? 'ACTIVE' : 'INACTIVE'}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                    {filters.length === 0 && (
                        <div className="col-span-full py-16 text-center text-muted-foreground border border-dashed rounded-xl">
                            <ImageIcon className="mx-auto mb-3 text-muted-foreground/30" size={40} />
                            <p className="font-medium">No filters found</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FilterManager;
