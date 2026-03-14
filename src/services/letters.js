import { supabase } from '../lib/supabase';
import { uploadToGitHub } from '../lib/github';

// Fetch all letters
export const getLetters = async () => {
    const { data, error } = await supabase
        .from('letters')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};

// Create a new letter
export const createLetter = async (letterData) => {
    const { data, error } = await supabase
        .from('letters')
        .insert([{
            title: letterData.title,
            content: letterData.content,
            is_active: letterData.is_active,
            allowed_emails: letterData.allowed_emails,
            music_url: letterData.music_url,
            photo_urls: letterData.photo_urls,
            photo_messages: letterData.photo_messages,
            theme_override: letterData.theme_override || 'none'
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

// Update a letter
export const updateLetter = async (id, updates) => {
    const { data, error } = await supabase
        .from('letters')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

// Delete a letter
export const deleteLetter = async (id) => {
    const { error } = await supabase
        .from('letters')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
};

// Upload a photo for letters (auto-compress logic is handled before this)
export const uploadLetterPhoto = async (file) => {
    // Jika VITE_GITHUB_TOKEN terbaca di .env, maka alihkan semua upload otomatis ke GitHub & CDN
    if (import.meta.env.VITE_GITHUB_TOKEN) {
        return await uploadToGitHub(file, 'letters');
    }

    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;

    // Attempt to upload to 'letters' bucket
    const { data, error } = await supabase.storage.from('letters').upload(fileName, file, { cacheControl: '31536000' });

    if (error) {
        // Fallback to 'frames' bucket if 'letters' bucket doesn't exist
        const fallback = await supabase.storage.from('frames').upload(`letters/${fileName}`, file, { cacheControl: '31536000' });
        if (fallback.error) throw fallback.error;
        const { data: publicUrlData } = supabase.storage.from('frames').getPublicUrl(`letters/${fileName}`);
        return publicUrlData.publicUrl;
    }

    const { data: publicUrlData } = supabase.storage.from('letters').getPublicUrl(fileName);
    return publicUrlData.publicUrl;
};
