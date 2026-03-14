import { supabase } from '../lib/supabase';

export const getLinks = async () => {
    const { data, error } = await supabase
        .from('pixenze_links')
        .select('*')
        .order('order', { ascending: true });

    if (error) throw error;
    return data;
};

export const addLink = async (link) => {
    const { data, error } = await supabase
        .from('pixenze_links')
        .insert([link])
        .select();

    if (error) throw error;
    return data[0];
};

export const updateLink = async (id, updates) => {
    const { data, error } = await supabase
        .from('pixenze_links')
        .update(updates)
        .eq('id', id)
        .select();

    if (error) throw error;
    return data[0];
};

export const deleteLink = async (id) => {
    const { error } = await supabase
        .from('pixenze_links')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
};
