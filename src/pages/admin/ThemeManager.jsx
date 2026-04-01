import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../context/AlertContext';
import { Palette, Music, Save, RefreshCw, UploadCloud, Paintbrush, Loader2 } from 'lucide-react';
import { uploadToGitHub } from '../../lib/github';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { Separator } from '../../components/ui/separator';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../lib/cn';

const ThemeManager = () => {
    const { showAlert } = useAlert();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [themeConfig, setThemeConfig] = useState({
        active_theme: 'default', audio_url: '', primary_color: '#ba1c16', secondary_color: '#face10',
        bg_image_url: '', custom_logo_url: '', payment_enabled: false, payment_amount: 15000,
        midtrans_client_key: '', is_midtrans_production: false
    });

    const [currentSettingsId, setCurrentSettingsId] = useState(null);

    useEffect(() => { loadSettings(); }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const { data: tenantId, error: rpcErr } = await supabase.rpc('get_my_tenant_id');
            if (rpcErr || !tenantId) throw new Error("Could not determine your Tenant ID");
            const { data, error } = await supabase.from('tenant_settings').select('*').eq('tenant_id', tenantId).maybeSingle();
            if (error) console.error("No tenant settings found:", error);
            else if (data) {
                setCurrentSettingsId(data.id);
                setThemeConfig({
                    active_theme: data.active_theme || 'default', audio_url: data.audio_url || '',
                    primary_color: data.primary_color || '#ba1c16', secondary_color: data.secondary_color || '#face10',
                    bg_image_url: data.bg_image_url || '', custom_logo_url: data.custom_logo_url || '',
                    payment_enabled: data.payment_enabled || false, payment_amount: data.payment_amount || 15000,
                    midtrans_client_key: data.midtrans_client_key || '', is_midtrans_production: data.is_midtrans_production || false
                });
            }
        } catch (err) { console.error("Error fetching theme settings:", err); }
        finally { setLoading(false); }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { data: tenantId } = await supabase.rpc('get_my_tenant_id');
            if (!tenantId) throw new Error("Could not determine tenant ID");
            const { error } = await supabase.from('tenant_settings').upsert({
                tenant_id: tenantId, ...themeConfig
            }, { onConflict: 'tenant_id' });
            if (error) throw error;
            showAlert("Theme settings updated successfully!", "success");
        } catch (err) {
            showAlert(`Failed to save: ${err.message}`, "error");
        } finally { setSaving(false); }
    };

    const handleReset = () => {
        setThemeConfig({
            active_theme: 'default', audio_url: '', primary_color: '#ba1c16', secondary_color: '#face10',
            bg_image_url: '', custom_logo_url: '', payment_enabled: false, payment_amount: 15000,
            midtrans_client_key: '', is_midtrans_production: false
        });
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        setUploading(true);
        try {
            const cdnUrl = await uploadToGitHub(file, 'logos');
            setThemeConfig(prev => ({ ...prev, custom_logo_url: cdnUrl }));
            showAlert("Logo uploaded!", "success");
        } catch (err) { showAlert("Failed: " + err.message, "error"); }
        finally { setUploading(false); e.target.value = ''; }
    };

    const handleBgUpload = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        setUploading(true);
        try {
            const cdnUrl = await uploadToGitHub(file, 'backgrounds');
            setThemeConfig(prev => ({ ...prev, bg_image_url: cdnUrl }));
            showAlert("Background uploaded!", "success");
        } catch (err) { showAlert("Failed: " + err.message, "error"); }
        finally { setUploading(false); e.target.value = ''; }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-96 w-full rounded-xl" />
            </div>
        );
    }

    const themes = [
        { id: 'default', label: 'Default (Blue)', color: 'bg-blue-500' },
        { id: 'valentine', label: 'Valentine (Pink)', color: 'bg-pink-500' },
        { id: 'mu', label: 'Manchester United', color: 'bg-red-600' },
        { id: 'custom', label: 'Custom', color: 'bg-gradient-to-r from-orange-400 via-pink-400 to-indigo-400' }
    ];

    return (
        <div className="relative max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold tracking-tight mb-8">Global Theme Manager</h1>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Palette className="text-primary" size={20} />
                        Booth Appearance & Sound
                    </CardTitle>
                    <CardDescription>
                        Control the active theme and background music across all connected photobooths in real-time.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSave} className="space-y-6">
                        {/* Theme Selection */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium">Active Event Theme</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {themes.map(t => (
                                    <label key={t.id} className={cn(
                                        "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                                        themeConfig.active_theme === t.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                                    )}>
                                        <input type="radio" name="active_theme" value={t.id} checked={themeConfig.active_theme === t.id}
                                            onChange={(e) => setThemeConfig(prev => ({ ...prev, active_theme: e.target.value }))}
                                            className="w-4 h-4 text-primary focus:ring-primary" />
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-4 h-4 rounded-full", t.color)}></div>
                                            <span className="font-medium text-sm">{t.label}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <Separator />

                        {/* Custom Colors */}
                        <div className={cn("space-y-4 transition-opacity", themeConfig.active_theme !== 'custom' && 'opacity-50 pointer-events-none')}>
                            <div className="flex items-center gap-2">
                                <Paintbrush size={16} className="text-primary" />
                                <label className="text-sm font-medium">Custom Branding Colors</label>
                                <span className="text-xs text-muted-foreground">(Requires "Custom" theme)</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">Primary Color</label>
                                    <div className="flex gap-2">
                                        <input type="color" value={themeConfig.primary_color} onChange={(e) => setThemeConfig(prev => ({ ...prev, primary_color: e.target.value }))}
                                            disabled={themeConfig.active_theme !== 'custom'} className="w-10 h-9 rounded cursor-pointer disabled:cursor-not-allowed border" />
                                        <Input value={themeConfig.primary_color} onChange={(e) => setThemeConfig(prev => ({ ...prev, primary_color: e.target.value }))}
                                            disabled={themeConfig.active_theme !== 'custom'} className="flex-1 font-mono uppercase" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">Secondary Color</label>
                                    <div className="flex gap-2">
                                        <input type="color" value={themeConfig.secondary_color} onChange={(e) => setThemeConfig(prev => ({ ...prev, secondary_color: e.target.value }))}
                                            disabled={themeConfig.active_theme !== 'custom'} className="w-10 h-9 rounded cursor-pointer disabled:cursor-not-allowed border" />
                                        <Input value={themeConfig.secondary_color} onChange={(e) => setThemeConfig(prev => ({ ...prev, secondary_color: e.target.value }))}
                                            disabled={themeConfig.active_theme !== 'custom'} className="flex-1 font-mono uppercase" />
                                    </div>
                                </div>
                                <div className="col-span-full space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">Background Image URL</label>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <Input type="url" placeholder="https://example.com/bg.jpg" value={themeConfig.bg_image_url}
                                            onChange={(e) => setThemeConfig(prev => ({ ...prev, bg_image_url: e.target.value }))}
                                            disabled={themeConfig.active_theme !== 'custom' || uploading} className="flex-1" />
                                        <div className="relative">
                                            <input type="file" accept="image/png, image/webp, image/jpeg, image/gif" onChange={handleBgUpload}
                                                disabled={themeConfig.active_theme !== 'custom' || uploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                                            <Button type="button" variant="outline" disabled={themeConfig.active_theme !== 'custom' || uploading}>
                                                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                                                {!uploading && 'Upload'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Custom Logo */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium">🖼️ Custom Homepage Logo</label>
                            <p className="text-xs text-muted-foreground">Replace the default logo with your custom brand logo (PNG/WebP transparent recommended).</p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Input type="url" placeholder="e.g. https://cdn.jsdelivr.net/gh/..." value={themeConfig.custom_logo_url}
                                    onChange={(e) => setThemeConfig(prev => ({ ...prev, custom_logo_url: e.target.value }))} disabled={uploading} className="flex-1" />
                                <div className="relative">
                                    <input type="file" accept="image/png, image/webp, image/jpeg, image/gif" onChange={handleLogoUpload}
                                        disabled={uploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                                    <Button type="button" variant="outline" disabled={uploading}>
                                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                                        {uploading ? 'Uploading...' : 'Upload Logo'}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Audio */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Music size={16} className="text-muted-foreground" /> Background Audio URL (Optional)
                            </label>
                            <Input type="url" placeholder="e.g. https://music.youtube.com/watch?v=..." value={themeConfig.audio_url}
                                onChange={(e) => setThemeConfig(prev => ({ ...prev, audio_url: e.target.value }))} />
                            <p className="text-xs text-muted-foreground">Supports YouTube Music, standard YouTube, and Spotify links.</p>
                        </div>

                        <Separator />

                        {/* Payment */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">💳 Midtrans Payment Gateway</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Enable Payment</span>
                                    <Switch checked={themeConfig.payment_enabled}
                                        onCheckedChange={(checked) => setThemeConfig(prev => ({ ...prev, payment_enabled: checked }))} />
                                </div>
                            </div>
                            <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity", !themeConfig.payment_enabled && 'opacity-50 pointer-events-none')}>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">Payment Amount (IDR)</label>
                                    <Input type="number" min="0" value={themeConfig.payment_amount}
                                        onChange={(e) => setThemeConfig(prev => ({ ...prev, payment_amount: parseInt(e.target.value) || 0 }))}
                                        disabled={!themeConfig.payment_enabled} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">Midtrans Client Key</label>
                                    <Input type="text" placeholder="SB-Mid-client-..." value={themeConfig.midtrans_client_key}
                                        onChange={(e) => setThemeConfig(prev => ({ ...prev, midtrans_client_key: e.target.value }))}
                                        disabled={!themeConfig.payment_enabled} className="font-mono text-sm" />
                                </div>
                                <div className="col-span-full flex items-center gap-2">
                                    <input type="checkbox" id="midtrans-prod" checked={themeConfig.is_midtrans_production}
                                        onChange={(e) => setThemeConfig(prev => ({ ...prev, is_midtrans_production: e.target.checked }))}
                                        disabled={!themeConfig.payment_enabled} className="rounded border-border" />
                                    <label htmlFor="midtrans-prod" className="text-xs font-medium">Use Production Mode (Live Payments)</label>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground bg-muted p-2 rounded border">
                                <b>Note:</b> Server Key must be configured on the frontend environment variables. This panel only stores the public Client Key.
                            </p>
                        </div>

                        <Separator />

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button type="submit" disabled={saving} className="flex-1">
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Save & Broadcast Changes
                            </Button>
                            <Button type="button" variant="outline" onClick={handleReset} disabled={saving}>
                                Revert to Default
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default ThemeManager;
