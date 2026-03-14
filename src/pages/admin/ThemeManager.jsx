import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../context/AlertContext';
import { Palette, Music, Save, RefreshCw, UploadCloud, Paintbrush } from 'lucide-react';
import { uploadToGitHub } from '../../lib/github';

const ThemeManager = () => {
    const { showAlert } = useAlert();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [themeConfig, setThemeConfig] = useState({
        active_theme: 'default',
        audio_url: '',
        primary_color: '#ba1c16',
        secondary_color: '#face10',
        bg_image_url: '',
        custom_logo_url: '',
        payment_enabled: false,
        payment_amount: 15000,
        midtrans_client_key: '',
        is_midtrans_production: false
    });

    const [uploading, setUploading] = useState(false);

    const [currentSettingsId, setCurrentSettingsId] = useState(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            // Because tenant_settings is publicly readable (so the SaaS web app can see colors),
            // we MUST explicitly filter by OUR tenant_id when in the dashboard.
            // Otherwise, `maybeSingle()` returns multiple rows and crashes with 406 Error.
            const { data: tenantId, error: rpcErr } = await supabase.rpc('get_my_tenant_id');
            if (rpcErr || !tenantId) throw new Error("Could not determine your Tenant ID");

            const { data, error } = await supabase
                .from('tenant_settings')
                .select('*')
                .eq('tenant_id', tenantId)
                .maybeSingle();

            if (error) {
                console.error("No tenant settings found:", error);
            } else if (data) {
                setCurrentSettingsId(data.id);
                setThemeConfig({
                    active_theme: data.active_theme || 'default',
                    audio_url: data.audio_url || '',
                    primary_color: data.primary_color || '#ba1c16',
                    secondary_color: data.secondary_color || '#face10',
                    bg_image_url: data.bg_image_url || '',
                    custom_logo_url: data.custom_logo_url || '',
                    payment_enabled: data.payment_enabled || false,
                    payment_amount: data.payment_amount || 15000,
                    midtrans_client_key: data.midtrans_client_key || '',
                    is_midtrans_production: data.is_midtrans_production || false
                });
            }
        } catch (err) {
            console.error("Error fetching theme settings:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const { data: tenantId } = await supabase.rpc('get_my_tenant_id');
            if (!tenantId) throw new Error("Could not determine tenant ID");

            // Use upsert instead of update to handle new tenants who don't have settings yet
            const { error } = await supabase
                .from('tenant_settings')
                .upsert({
                    tenant_id: tenantId,
                    active_theme: themeConfig.active_theme,
                    audio_url: themeConfig.audio_url,
                    primary_color: themeConfig.primary_color,
                    secondary_color: themeConfig.secondary_color,
                    bg_image_url: themeConfig.bg_image_url,
                    custom_logo_url: themeConfig.custom_logo_url,
                    payment_enabled: themeConfig.payment_enabled,
                    payment_amount: themeConfig.payment_amount,
                    midtrans_client_key: themeConfig.midtrans_client_key,
                    is_midtrans_production: themeConfig.is_midtrans_production
                    // updated_at is handled automatically by DB trigger
                }, { onConflict: 'tenant_id' });

            if (error) {
                console.error("Supabase Save Error Details:", error);
                throw error;
            }

            showAlert("Theme settings updated successfully! Your Photobooth will refresh automatically.", "success");
        } catch (err) {
            console.error("Save error catch:", err);
            showAlert(`Failed to save: ${err.message || 'Unknown error'}`, "error");
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setThemeConfig({
            active_theme: 'default',
            audio_url: '',
            primary_color: '#ba1c16',
            secondary_color: '#face10',
            bg_image_url: '',
            custom_logo_url: '',
            payment_enabled: false,
            payment_amount: 15000,
            midtrans_client_key: '',
            is_midtrans_production: false
        });
    };
    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const cdnUrl = await uploadToGitHub(file, 'logos');
            setThemeConfig(prev => ({ ...prev, custom_logo_url: cdnUrl }));
            showAlert("Logo uploaded to GitHub!", "success");
        } catch (err) {
            console.error(err);
            showAlert("Failed to upload: " + err.message, "error");
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleBgUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const cdnUrl = await uploadToGitHub(file, 'backgrounds');
            setThemeConfig(prev => ({ ...prev, bg_image_url: cdnUrl }));
            showAlert("Background image uploaded to GitHub!", "success");
        } catch (err) {
            console.error(err);
            showAlert("Failed to upload: " + err.message, "error");
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                <RefreshCw className="animate-spin" size={28} />
                <p className="font-medium text-slate-500">Loading Theme Settings...</p>
            </div>
        );
    }

    return (
        <div className="relative max-w-4xl mx-auto">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-8">Global Theme Manager</h1>

            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 sm:p-8 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
                    <Palette size={180} />
                </div>

                <div className="relative z-10">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Palette className="text-indigo-500" size={24} /> Booth Appearance & Sound
                        </h2>
                        <p className="text-slate-500 font-medium mt-1">
                            Control the active theme and background music across all connected photobooths in real-time.
                        </p>
                    </div>

                    <form onSubmit={handleSave} className="space-y-6">
                        {/* Theme Selection */}
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Active Event Theme</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {[
                                    { id: 'default', label: 'Default (Blue)', color: 'bg-blue-500' },
                                    { id: 'valentine', label: 'Valentine (Pink)', color: 'bg-pink-500' },
                                    { id: 'mu', label: 'Manchester United (Red)', color: 'bg-red-600' },
                                    { id: 'custom', label: 'Custom (Your Colors)', color: 'bg-gradient-to-r from-orange-400 via-pink-400 to-indigo-400' }
                                ].map(t => (
                                    <label
                                        key={t.id}
                                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${themeConfig.active_theme === t.id
                                            ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                                            : 'border-slate-200 bg-white hover:border-indigo-200'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="active_theme"
                                            value={t.id}
                                            checked={themeConfig.active_theme === t.id}
                                            onChange={(e) => setThemeConfig(prev => ({ ...prev, active_theme: e.target.value }))}
                                            className="w-5 h-5 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div className="flex items-center gap-2">
                                            <div className={`w-4 h-4 rounded-full ${t.color}`}></div>
                                            <span className="font-semibold text-slate-700">{t.label}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Custom Colors Configuration */}
                        <div className={`p-5 rounded-xl border transition-all ${themeConfig.active_theme === 'custom' ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                                <Paintbrush size={16} className={themeConfig.active_theme === 'custom' ? 'text-indigo-500' : 'text-slate-500'} />
                                Custom Branding Colors <span className="text-xs font-normal text-slate-500 ml-1">(Requires "Custom" theme)</span>
                            </label>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Primary Color (Buttons/Accents)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={themeConfig.primary_color}
                                            onChange={(e) => setThemeConfig(prev => ({ ...prev, primary_color: e.target.value }))}
                                            disabled={themeConfig.active_theme !== 'custom'}
                                            className="w-12 h-12 rounded cursor-pointer disabled:cursor-not-allowed"
                                        />
                                        <input
                                            type="text"
                                            value={themeConfig.primary_color}
                                            onChange={(e) => setThemeConfig(prev => ({ ...prev, primary_color: e.target.value }))}
                                            disabled={themeConfig.active_theme !== 'custom'}
                                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 uppercase font-mono"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Secondary Color (Highlights/Borders)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={themeConfig.secondary_color}
                                            onChange={(e) => setThemeConfig(prev => ({ ...prev, secondary_color: e.target.value }))}
                                            disabled={themeConfig.active_theme !== 'custom'}
                                            className="w-12 h-12 rounded cursor-pointer disabled:cursor-not-allowed"
                                        />
                                        <input
                                            type="text"
                                            value={themeConfig.secondary_color}
                                            onChange={(e) => setThemeConfig(prev => ({ ...prev, secondary_color: e.target.value }))}
                                            disabled={themeConfig.active_theme !== 'custom'}
                                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 uppercase font-mono"
                                        />
                                    </div>
                                </div>
                                <div className="col-span-full">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Background Image URL (Overrides gradient)</label>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <input
                                            type="url"
                                            placeholder="https://example.com/bg.jpg"
                                            value={themeConfig.bg_image_url}
                                            onChange={(e) => setThemeConfig(prev => ({ ...prev, bg_image_url: e.target.value }))}
                                            disabled={themeConfig.active_theme !== 'custom' || uploading}
                                            className="flex-1 px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 font-medium"
                                        />
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept="image/png, image/webp, image/jpeg, image/gif"
                                                onChange={handleBgUpload}
                                                disabled={themeConfig.active_theme !== 'custom' || uploading}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                            />
                                            <button
                                                type="button"
                                                disabled={themeConfig.active_theme !== 'custom' || uploading}
                                                className={`w-full sm:w-auto px-4 py-3 rounded-lg border-2 font-bold flex items-center justify-center gap-2 transition-all ${(themeConfig.active_theme === 'custom' && !uploading)
                                                    ? 'border-indigo-500 text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                                                    : 'border-slate-200 text-slate-400 bg-slate-50 opacity-60'
                                                    }`}
                                            >
                                                {uploading ? <RefreshCw size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                                                {uploading ? '' : 'Upload'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Custom Logo Configuration */}
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                                <span role="img" aria-label="image">🖼️</span> Custom Homepage Logo
                            </label>
                            <p className="text-xs text-slate-500 mb-4">
                                Ganti tulisan (PIXENZE BOOTH) di halaman depan dengan logo kustom Anda (Format PNG/WebP transparan direkomendasikan).
                            </p>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    type="url"
                                    placeholder="e.g. https://cdn.jsdelivr.net/gh/..."
                                    value={themeConfig.custom_logo_url}
                                    onChange={(e) => setThemeConfig(prev => ({ ...prev, custom_logo_url: e.target.value }))}
                                    disabled={uploading}
                                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                />
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/png, image/webp, image/jpeg, image/gif"
                                        onChange={handleLogoUpload}
                                        disabled={uploading}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                    />
                                    <button
                                        type="button"
                                        disabled={uploading}
                                        className={`w-full sm:w-auto px-4 py-3 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${!uploading
                                            ? 'border-indigo-500 text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                                            : 'border-slate-200 text-slate-400 bg-slate-50 opacity-60'
                                            }`}
                                    >
                                        {uploading ? <RefreshCw size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                                        {uploading ? 'Uploading...' : 'Upload Logo'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Audio Configuration */}
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                                <Music size={16} className="text-slate-500" />
                                Background Audio URL (Optional)
                            </label>
                            <input
                                type="url"
                                placeholder="e.g. https://music.youtube.com/watch?v=M2B3YXsE1Hk"
                                value={themeConfig.audio_url}
                                onChange={(e) => setThemeConfig(prev => ({ ...prev, audio_url: e.target.value }))}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
                            />
                            <p className="text-xs text-slate-500 mt-2">
                                Supports YouTube Music, standard YouTube, and Spotify links. Leave blank to disable music.
                            </p>
                        </div>

                        {/* Payment Gateway: Midtrans Configuration */}
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                    <span role="img" aria-label="credit-card">💳</span> Midtrans Payment Gateway
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <span className="text-xs font-semibold text-slate-500">Enable Payment</span>
                                    <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${themeConfig.payment_enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={themeConfig.payment_enabled}
                                            onChange={(e) => setThemeConfig(prev => ({ ...prev, payment_enabled: e.target.checked }))}
                                        />
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${themeConfig.payment_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </div>
                                </label>
                            </div>

                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 transition-all ${themeConfig.payment_enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Payment Amount (IDR)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={themeConfig.payment_amount}
                                        onChange={(e) => setThemeConfig(prev => ({ ...prev, payment_amount: parseInt(e.target.value) || 0 }))}
                                        disabled={!themeConfig.payment_enabled}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Midtrans Client Key</label>
                                    <input
                                        type="text"
                                        placeholder="SB-Mid-client-..."
                                        value={themeConfig.midtrans_client_key}
                                        onChange={(e) => setThemeConfig(prev => ({ ...prev, midtrans_client_key: e.target.value }))}
                                        disabled={!themeConfig.payment_enabled}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium font-mono text-sm"
                                    />
                                </div>
                                <div className="col-span-full">
                                    <label className="flex items-center gap-2 cursor-pointer mt-2 w-max text-xs font-bold text-slate-600">
                                        <input
                                            type="checkbox"
                                            checked={themeConfig.is_midtrans_production}
                                            onChange={(e) => setThemeConfig(prev => ({ ...prev, is_midtrans_production: e.target.checked }))}
                                            disabled={!themeConfig.payment_enabled}
                                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                        />
                                        Use Production Mode (Live Payments)
                                    </label>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-4 bg-slate-100 p-2 rounded border border-slate-200">
                                <b>Note:</b> Server Key must be configured securely on the frontend Cloudflare/Vite environment variables (`MIDTRANS_SERVER_KEY`). This panel only stores the public Client Key.
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-70"
                            >
                                {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                                Save & Broadcast Changes
                            </button>

                            <button
                                type="button"
                                onClick={handleReset}
                                disabled={saving}
                                className="px-6 py-3.5 rounded-xl font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all text-center disabled:opacity-70"
                            >
                                Revert to Default
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ThemeManager;
