import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
    console.warn("Supabase credentials missing. Running in local/mock mode.");
}

export { supabase };

// Helper to check if backend is available
export const isBackendAvailable = () => !!supabase;

/**
 * Generates an optimized URL for Supabase Storage images.
 * appends ?width=X to the URL if it's a Supabase URL.
 * 
 * @param {string} url - The original image URL
 * @param {number} width - The desired width
 * @returns {string} - The optimized URL
 */
export const getOptimizedUrl = (url, width = 300) => {
    if (!url) return '';
    if (!url.includes('supabase.co')) return url; // basic check, adjust if using custom domain

    // Check if it already has query params
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}width=${width}&resize=contain&quality=80`;
};
