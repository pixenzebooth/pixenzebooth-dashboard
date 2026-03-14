import { supabase } from '../lib/supabase';

/**
 * Checks if the Lucky Giveway Campaign is ACTIVE and HAS SLOTS.
 * Returns { active: boolean, remaining: number }
 */
export const checkCampaignStatus = async () => {
    if (!supabase) return { active: false, remaining: 0 };

    try {
        const { data, error } = await supabase
            .from('campaign_settings')
            .select('*')
            .eq('id', 1)
            .single();

        if (error) throw error;

        if (!data.is_active) {
            return { active: false, remaining: 0 };
        }

        const remaining = data.max_winners - data.current_winners;
        if (remaining <= 0) {
            return { active: false, remaining: 0 };
        }

        return { active: true, remaining };
    } catch (err) {
        console.error("Error checking campaign:", err);
        return { active: false, remaining: 0 };
    }
};

/**
 * Submits a winner to the database and increments the counter.
 * Using RPC (Stored Procedure) is safer for concurrency, but for <100 users, 
 * client-side update is acceptable MVP. Ideally, we use a trigger.
 */
export const submitWinner = async (winnerData) => {
    if (!supabase) return { success: false, message: "DB Error" };

    try {
        // 1. Re-check availability (Race condition protection)
        const status = await checkCampaignStatus();
        if (!status.active) {
            return { success: false, message: "Maaf, kuota sudah penuh!" };
        }

        // 2. Insert Winner
        const { error: insertError } = await supabase
            .from('campaign_winners')
            .insert([{
                ...winnerData,
                created_at: new Date()
            }]);

        if (insertError) throw insertError;

        // 3. Increment Counter manually (Optimistic)
        // Note: A trigger in SQL is better, but this works for MVP.
        const { data: settings } = await supabase
            .from('campaign_settings')
            .select('current_winners')
            .single();

        await supabase
            .from('campaign_settings')
            .update({ current_winners: (settings?.current_winners || 0) + 1 })
            .eq('id', 1);

        return { success: true };

    } catch (err) {
        console.error("Winner submission failed:", err);
        return { success: false, message: "Gagal menyimpan data. Coba lagi." };
    }
};

/**
 * ADMIN: Toggle Campaign Status On/Off
 */
export const toggleCampaign = async (isActive) => {
    if (!supabase) return;
    return await supabase
        .from('campaign_settings')
        .update({ is_active: isActive })
        .eq('id', 1);
};

/**
 * ADMIN: Reset Counter (New Round)
 */
export const resetCampaign = async () => {
    if (!supabase) return;
    return await supabase
        .from('campaign_settings')
        .update({ current_winners: 0, is_active: false }) // Reset and pause
        .eq('id', 1);
};

/**
 * ADMIN: Get List of Winners
 */
export const getWinners = async () => {
    if (!supabase) return [];
    const { data } = await supabase
        .from('campaign_winners')
        .select('*')
        .order('created_at', { ascending: false });
    return data || [];
};
