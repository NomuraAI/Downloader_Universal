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

    // Log to Supabase if userId is present
    if (userId) {
        const { error } = await supabase.from('downloads').insert({
            user_id: userId,
            platform: platform,
            original_url: url,
            filename: fileName,
            status: 'processing'
        });
        if (error) console.error('Error logging download:', error);
    }

    // Simulate a streaming process with multiple steps
    const steps = [
        { progress: 5, message: 'Connecting to server...' },
        { progress: 10, message: `Resolving URL for ${platform}...` },
        { progress: 15, message: 'Extracting video information...' },
        { progress: 20, message: `[info] Title: ${fileName.replace('.mp4', '')}` },
        { progress: 25, message: `[download] Destination: ${fileName}` },
        { progress: 30, message: 'Starting download...' },
        { progress: 45, message: '[download]  25.4% of 15.40MiB at 2.50MiB/s ETA 00:03' },
        { progress: 60, message: '[download]  52.1% of 15.40MiB at 3.10MiB/s ETA 00:02' },
        { progress: 75, message: '[download]  88.9% of 15.40MiB at 4.20MiB/s ETA 00:00' },
        { progress: 90, message: '[download] 100% of 15.40MiB in 00:04' },
        { progress: 95, message: '[ffmpeg] Merging formats into "' + fileName + '"' },
        { progress: 100, message: `[download] Finished downloading ${fileName}` }
    ];

    return new Promise((resolve, reject) => {
        let currentStep = 0;

        const interval = setInterval(async () => {
            if (currentStep >= steps.length) {
                clearInterval(interval);

                // Update status to completed
                if (userId) {
                    await supabase.from('downloads').update({ status: 'completed' })
                        .eq('user_id', userId)
                        .eq('filename', fileName);
                }

                resolve({ success: true, message: 'Download completed successfully', fileName, fullPath });
                return;
            }

            const step = steps[currentStep];

            // Call the callback with the current status
            onUpdate({
                progress: step.progress,
                log: step.message,
                status: 'downloading'
            });

            currentStep++;
        }, 800); // 800ms delay between steps to simulate time
    });
};
