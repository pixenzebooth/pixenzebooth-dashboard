import { supabase } from '../lib/supabase';
import { S3Client, ListObjectsV2Command, DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";

// R2 Client Setup - Using environment variables
// Note: In Vite, these must be prefixed with VITE_ to be available in the browser.
const r2Config = {
    region: 'auto',
    endpoint: import.meta.env.VITE_R2_ENDPOINT,
    credentials: {
        accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID,
        secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY,
    },
};

// Initialize S3 client only if credentials exist to avoid errors
const s3 = (r2Config.credentials.accessKeyId && r2Config.credentials.secretAccessKey) 
    ? new S3Client(r2Config) 
    : null;

const BUCKET = import.meta.env.VITE_R2_BUCKET_NAME;

/**
 * Fetch storage statistics from Supabase photos table.
 */
export const getStorageStats = async () => {
    try {
        const { data, error } = await supabase
            .from('photos')
            .select('file_path, file_size, created_at, photo_url');

        if (error) throw error;

        let hotSize = 0;
        let coldSize = 0;
        let supabaseSize = 0;
        let totalCount = data.length;

        data.forEach(photo => {
            const size = photo.file_size || 0;
            const path = photo.file_path || '';
            const url = photo.photo_url || '';
            
            // Check if it's in Supabase Storage or R2
            const isSupabase = url.includes('supabase.co/storage') || !url.includes('r2.cloudflarestorage.com');

            if (isSupabase) {
                supabaseSize += size;
            } else {
                // R2 Classification Logic
                const isExplicitHot = path.includes('/hot/');
                const isExplicitCold = path.includes('/cold/');
                const isLegacyCold = !isExplicitHot && !isExplicitCold && (
                    path.toLowerCase().endsWith('.gif') || 
                    path.toLowerCase().endsWith('.mp4') || 
                    path.toLowerCase().endsWith('.webm') ||
                    path.includes('_raw_')
                );

                if (isExplicitHot) {
                    hotSize += size;
                } else if (isExplicitCold || isLegacyCold) {
                    coldSize += size;
                } else {
                    hotSize += size;
                }
            }
        });

        return {
            hotSize,
            coldSize,
            supabaseSize,
            totalSize: hotSize + coldSize + supabaseSize,
            totalCount,
            avgSize: totalCount > 0 ? (hotSize + coldSize + supabaseSize) / totalCount : 0
        };
    } catch (err) {
        console.error("Error fetching storage stats:", err);
        return { hotSize: 0, coldSize: 0, supabaseSize: 0, totalSize: 0, totalCount: 0, avgSize: 0 };
    }
};

/**
 * List all events with their accumulated storage size.
 */
export const getEventsWithStorage = async () => {
    try {
        const { data: events, error: eErr } = await supabase
            .from('events')
            .select('id, event_name, slug, tenant_id, created_at');

        if (eErr) throw eErr;

        const { data: photos, error: pErr } = await supabase
            .from('photos')
            .select('event_id, file_size, file_path');

        if (pErr) throw pErr;

        return events.map(event => {
            const eventPhotos = photos.filter(p => p.event_id === event.id);
            
            let hot = 0;
            let cold = 0;

            eventPhotos.forEach(p => {
                const size = p.file_size || 0;
                const path = p.file_path;
                
                const isExplicitHot = path.includes('/hot/');
                const isExplicitCold = path.includes('/cold/');
                const isLegacyCold = !isExplicitHot && !isExplicitCold && (
                    path.toLowerCase().endsWith('.gif') || 
                    path.toLowerCase().endsWith('.mp4') || 
                    path.toLowerCase().endsWith('.webm') ||
                    path.includes('_raw_')
                );

                if (isExplicitHot) {
                    hot += size;
                } else if (isExplicitCold || isLegacyCold) {
                    cold += size;
                } else {
                    hot += size; // Legacy photostrips are core
                }
            });
            
            return {
                ...event,
                photoCount: eventPhotos.length,
                hotSize: hot,
                coldSize: cold,
                totalSize: hot + cold
            };
        });
    } catch (err) {
        console.error("Error fetching events with storage:", err);
        return [];
    }
};

/**
 * SCANNERS: Find orphaned files in R2 (Files that exist in storage but not in DB)
 */
export const scanOrphanedFiles = async () => {
    try {
        // 1. Get all file_paths from DB
        const { data: dbPhotos } = await supabase.from('photos').select('file_path');
        const dbPaths = new Set(dbPhotos.map(p => p.file_path));

        // 2. List files from R2 (Scan both gallery and legacy photos prefixes)
        const prefixes = ['gallery/', 'photos/'];
        let allContents = [];

        for (const Prefix of prefixes) {
            const command = new ListObjectsV2Command({
                Bucket: BUCKET,
                Prefix
            });
            const { Contents } = await s3.send(command);
            if (Contents) {
                allContents = [...allContents, ...Contents];
            }
        }

        if (allContents.length === 0) return [];

        // 3. Compare
        const orphans = allContents.filter(item => !dbPaths.has(item.Key)).map(item => ({
            key: item.Key,
            size: item.Size,
            lastModified: item.LastModified
        }));

        return orphans;
    } catch (err) {
        console.error("Orphan scan failed:", err);
        return [];
    }
};

/**
 * ACTIONS: Delete a batch of files from R2
 */
export const deleteFromR2 = async (keys) => {
    if (!keys || keys.length === 0) return;
    
    try {
        const command = new DeleteObjectsCommand({
            Bucket: BUCKET,
            Delete: {
                Objects: keys.map(k => ({ Key: k }))
            }
        });
        return await s3.send(command);
    } catch (err) {
        console.error("Bulk delete failed:", err);
        throw err;
    }
};

/**
 * ACTIONS: Purge Cold Assets for an event
 */
export const purgeColdAssets = async (eventId) => {
    try {
        const { data: photos } = await supabase
            .from('photos')
            .select('id, file_path')
            .eq('event_id', eventId);

        if (!photos || photos.length === 0) return 0;

        // Filter for cold assets (Explicit or Legacy)
        const coldPhotos = photos.filter(p => {
            const path = p.file_path;
            const isExplicitCold = path.includes('/cold/');
            const isLegacyCold = !path.includes('/hot/') && !isExplicitCold && (
                path.toLowerCase().endsWith('.gif') || 
                path.toLowerCase().endsWith('.mp4') || 
                path.toLowerCase().endsWith('.webm') ||
                path.includes('_raw_')
            );
            return isExplicitCold || isLegacyCold;
        });

        if (coldPhotos.length === 0) return 0;

        const keys = coldPhotos.map(p => p.file_path);
        const ids = coldPhotos.map(p => p.id);

        // 1. Delete from R2
        await deleteFromR2(keys);

        // 2. Delete from DB
        const { error } = await supabase.from('photos').delete().in('id', ids);
        if (error) throw error;

        return keys.length;
    } catch (err) {
        console.error("Purge cold assets failed:", err);
        throw err;
    }
};
