import { supabase } from '../lib/supabase';

/**
 * Service to handle real-time global monitoring for Superadmins.
 * Subscribes to global photo uploads and device status changes.
 */

/**
 * Fetch initial global stats for today.
 */
export const getGlobalPulseStats = async () => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [photosRes, devicesRes] = await Promise.all([
            supabase
                .from('photos')
                .select('id', { count: 'exact', head: true })
                .gte('created_at', today.toISOString()),
            supabase
                .from('devices')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'active')
        ]);

        return {
            todayPhotos: photosRes.count || 0,
            activeDevices: devicesRes.count || 0
        };
    } catch (err) {
        console.error("Pulse stats fetch failed:", err);
        return { todayPhotos: 0, activeDevices: 0 };
    }
};

/**
 * Fetch latest global photos for the masonry feed.
 */
export const getLatestGlobalPhotos = async (limit = 20) => {
    const { data, error } = await supabase
        .from('photos')
        .select(`
            id, 
            photo_url, 
            created_at, 
            event_id,
            events (event_name, slug),
            tenants (name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data || [];
};

/**
 * Fetch all devices globally with their tenant info.
 */
export const getGlobalDevices = async () => {
    const { data, error } = await supabase
        .from('devices')
        .select(`
            *,
            tenants (name)
        `)
        .order('last_seen_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

/**
 * Subscribe to global photo uploads.
 */
export const subscribeToGlobalPhotos = (onInsert) => {
    return supabase
        .channel('global_photos_pulse')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'photos'
        }, async (payload) => {
            // Fetch complete record with joins
            const { data } = await supabase
                .from('photos')
                .select('*, events(event_name, slug), tenants(name)')
                .eq('id', payload.new.id)
                .single();
            
            if (data) onInsert(data);
        })
        .subscribe();
};

/**
 * Subscribe to global device status changes.
 */
export const subscribeToGlobalDevices = (onUpdate) => {
    return supabase
        .channel('global_devices_pulse')
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'devices'
        }, (payload) => {
            onUpdate(payload.new);
        })
        .subscribe();
};
