import { supabase } from '../utils/supabaseClient';

// This service would communicate with a local backend server running yt-dlp
// For now, it mocks the interaction.

const API_BASE_URL = 'http://localhost:3000/api';

const getMockFilename = (url, platform) => {
    try {
        const urlObj = new URL(url);
        const id = urlObj.pathname.split('/').pop() || 'video';
        // Clean ID to be safe for filenames
        const cleanId = id.replace(/[^a-zA-Z0-9-_]/g, '').substring(0, 15);
        const timestamp = new Date().getTime().toString().slice(-4);

        switch (platform) {
            case 'YouTube':
            case 'Shorts':
                return `YouTube_Video_${cleanId}_${timestamp}.mp4`;
            case 'Instagram':
                return `Instagram_Post_${cleanId}_${timestamp}.mp4`;
            case 'TikTok':
                return `TikTok_Video_${cleanId}_${timestamp}.mp4`;
            case 'Facebook':
                return `Facebook_Video_${cleanId}_${timestamp}.mp4`;
            default:
                return `Universal_Download_${timestamp}.mp4`;
        }
    } catch (e) {
        return `video_${new Date().getTime()}.mp4`;
    }
};

export const downloadMedia = async (url, platform, settings, isPlaylist, userId, onUpdate) => {
    console.log(`[API] Requesting download:`, { url, platform, settings, isPlaylist, userId });

    const fileName = getMockFilename(url, platform);
    const fullPath = `${settings.outputPath}/${fileName}`;

    let downloadId = null;

    // Log to Supabase if userId is present
    if (userId) {
        const { data, error } = await supabase.from('downloads').insert({
            user_id: userId,
            platform: platform,
            original_url: url,
            filename: fileName,
            status: 'scanning' // NEW INITIAL STATUS
        }).select();

        if (error) console.error('Error logging download:', error);
        if (data) downloadId = data[0].id;
    }

    if (!downloadId) return { success: false, message: "Failed to initialize download" };

    return new Promise((resolve, reject) => {
        let pollingInterval;
        let channel; // Declare channel here so it's accessible in cleanup

        const handleUpdate = (newData) => {
            console.log("[Update]", newData);

            // Construct payload
            const updatePayload = {
                status: newData.status,
                formats: newData.available_formats,
                percentage: newData.progress || 0,
                downloadId: downloadId
            };

            // Only append log if it's new/different to avoid spam
            if (newData.last_log) {
                updatePayload.log = newData.last_log;
            } else if (newData.status && newData.status !== 'processing' && newData.status !== 'downloading') {
                // Fallback log for status changes if no specific message
                updatePayload.log = `Status: ${newData.status}`;
            }

            onUpdate(updatePayload);

            if (newData.status === 'completed') {
                cleanup();
                resolve({ success: true, message: 'Download completed successfully', fileName: newData.filename, fullPath });
            }
            if (newData.status === 'failed') {
                cleanup();
                reject(new Error(newData.filename || 'Download failed'));
            }
        };

        const cleanup = () => {
            if (pollingInterval) clearInterval(pollingInterval);
            if (channel) supabase.removeChannel(channel);
        };

        // 1. Realtime Subscription
        channel = supabase
            .channel(`download_${downloadId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'downloads', filter: `id=eq.${downloadId}` },
                (payload) => handleUpdate(payload.new)
            )
            .subscribe();

        // 2. Polling Fallback (Every 2 seconds)
        pollingInterval = setInterval(async () => {
            const { data, error } = await supabase
                .from('downloads')
                .select('*')
                .eq('id', downloadId)
                .single();

            if (data) {
                // If status changed to relevant states, trigger update
                if (['waiting_for_selection', 'completed', 'failed'].includes(data.status)) {
                    handleUpdate(data);
                }
            }
        }, 2000);

        // Initial log
        onUpdate({ status: 'scanning', log: 'Scanning video formats...' });
    });
};

// Export function to select format
export const selectFormat = async (downloadId, formatId) => {
    await supabase.from('downloads').update({
        status: 'processing',
        selected_format: formatId
    }).eq('id', downloadId);
};
