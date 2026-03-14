import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../context/AlertContext';
import { Upload, Trash2, Plus, Zap, Loader, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseCubeLUT, createLUTTexture, createFilterProgram, createQuadValues } from '../../utils/lutUtils';
import { uploadToGitHub } from '../../lib/github';

const FilterManager = () => {
    const { showAlert } = useAlert();
    const [filters, setFilters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    // Preview Generation Canvas
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
        if (!gl) {
            console.error("WebGL2 not supported for preview generation");
            return;
        }
        glRef.current = gl;
    };

    const fetchFilters = async () => {
        try {
                const { data, error } = await supabase
                    .from('luts')
                    .select()
                    .order('created_at', { ascending: false });

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
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
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
            // 1. Read file
            const text = await file.text();

            // 2. Generate Thumbnail (Client-side WebGL)
            const thumbnailBlob = await generateThumbnail(text);

            let storagePath, thumbnailUrl;

            if (import.meta.env.VITE_GITHUB_TOKEN) {
                // 3 & 4. Upload to GitHub instead
                storagePath = await uploadToGitHub(file, 'luts');
                thumbnailUrl = await uploadToGitHub(new File([thumbnailBlob], `thumb_${file.name}.jpg`, { type: 'image/jpeg' }), 'luts');
            } else {
                // 3. Upload .cube to Storage
                const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
                const { error: uploadError } = await supabase.storage
                    .from('luts')
                    .upload(fileName, file, { cacheControl: '31536000' });
                if (uploadError) throw uploadError;

                // 4. Upload Thumbnail to Storage
                const thumbName = `thumb_${fileName}.jpg`;
                const { error: thumbError } = await supabase.storage
                    .from('luts')
                    .upload(thumbName, thumbnailBlob, { cacheControl: '31536000' });
                if (thumbError) throw thumbError;

                // 5. Get Public URLs
                const { data: publicUrlData1 } = supabase.storage.from('luts').getPublicUrl(fileName);
                const { data: publicUrlData2 } = supabase.storage.from('luts').getPublicUrl(thumbName);
                storagePath = publicUrlData1.publicUrl;
                thumbnailUrl = publicUrlData2.publicUrl;
            }

            // 6. Save to DB
            const { error: dbError } = await supabase.from('luts').insert({
                name: file.name.replace('.cube', ''),
                storage_path: storagePath,
                lut_url: storagePath, // Tetap isi lut_url untuk kompatibilitas & menghindari error not-null
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
            if (!gl || !canvas) {
                resolve(null); // Fallback if no WebGL
                return;
            }

            // Load a default base image for preview
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            // Use a base64 placeholder or fetch a public asset
            img.src = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&q=80';

            img.onload = () => {
                // Resize canvas
                canvas.width = 300;
                canvas.height = 300;
                gl.viewport(0, 0, 300, 300);

                // Parse LUT
                const { size, data } = parseCubeLUT(lutText);

                // Create Texture for Image
                const imgTexture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, imgTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

                // Create Texture for LUT
                const lutTexture = createLUTTexture(gl, { size, data });

                // Create Shader
                const program = createFilterProgram(gl);
                gl.useProgram(program);

                // Setup geometry
                const { vao, count } = createQuadValues(gl);
                gl.bindVertexArray(vao);

                // Uniforms
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

                // Draw
                gl.drawArrays(gl.TRIANGLES, 0, count);

                // Convert to Blob
                canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.8);

                // Cleanup
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
            const { error } = await supabase
                .from('luts')
                .update({ is_active: !currentStatus })
                .eq('id', id);
            if (error) throw error;

            setFilters(prev => prev.map(f =>
                f.id === id ? { ...f, is_active: !currentStatus } : f
            ));
        } catch (error) {
            showAlert(error.message, 'error');
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                        <Zap className="text-blue-500" size={24} />
                        Filter Manager
                    </h1>
                    <p className="text-slate-500 mt-1">Upload and manage .cube LUT filters for the photobooth.</p>
                </div>
            </div>

            {/* Upload Zone */}
            <div
                className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${dragActive ? 'border-blue-400 bg-blue-50 scale-[1.01]' : 'border-slate-300 bg-white hover:border-slate-400'
                    }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                {uploading ? (
                    <div className="flex flex-col items-center gap-4 py-4">
                        <Loader className="animate-spin text-blue-500" size={40} />
                        <p className="text-lg font-semibold text-slate-700 animate-pulse">Generating preview & uploading...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3 py-2">
                        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-1">
                            <Upload size={28} className="text-blue-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Drag & Drop .cube file here</h3>
                        <p className="text-slate-500 text-sm">or</p>
                        <label className="mt-2 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg cursor-pointer hover:bg-blue-700 transition shadow-sm">
                            Browse Files
                            <input type="file" accept=".cube" className="hidden" onChange={(e) => handleFileUpload(e.target.files[0])} />
                        </label>
                    </div>
                )}
            </div>

            {/* Hidden Canvas for Processing */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Filter List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                    <Loader className="animate-spin" size={28} />
                    <p className="font-medium">Loading filters...</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {filters.map((filter) => (
                        <div key={filter.id} className={`bg-white border rounded-2xl overflow-hidden transition-all shadow-sm flex flex-col group ${!filter.is_active ? 'opacity-60 grayscale-[30%] border-slate-200' : 'border-slate-200 hover:border-blue-300 hover:shadow-md'}`}>
                            {/* Preview Image */}
                            <div className="aspect-square bg-slate-100 relative border-b border-slate-100">
                                {filter.thumbnail_url ? (
                                    <img src={filter.thumbnail_url} alt={filter.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <ImageIcon size={40} />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleDelete(filter.id)}
                                        className="p-1.5 bg-white/90 text-rose-500 rounded-md shadow-sm hover:bg-rose-50 hover:scale-105 transition"
                                        title="Delete Filter"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-4 flex flex-col flex-1">
                                <h3 className="font-bold text-slate-800 truncate mb-3" title={filter.name}>{filter.name}</h3>
                                <div className="mt-auto">
                                    <button
                                        onClick={() => handleToggleActive(filter.id, filter.is_active)}
                                        className={`w-full py-2 rounded-lg font-semibold text-xs tracking-wide transition-colors ${filter.is_active
                                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                                            }`}
                                    >
                                        {filter.is_active ? 'ACTIVE' : 'INACTIVE'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filters.length === 0 && (
                        <div className="col-span-full py-16 text-center text-slate-500 bg-white border border-dashed border-slate-300 rounded-2xl">
                            <ImageIcon className="mx-auto mb-3 text-slate-300" size={40} />
                            <p className="font-medium">No filters found</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FilterManager;
