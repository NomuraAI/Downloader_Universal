export const detectPlatform = (url) => {
    if (!url) return 'Universal';

    const patterns = {
        YouTube: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/i,
        Shorts: /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/.+$/i,
        Instagram: /^(https?:\/\/)?(www\.)?instagram\.com\/.+$/i,
        Threads: /^(https?:\/\/)?(www\.)?threads\.net\/.+$/i,
        Facebook: /^(https?:\/\/)?(www\.)?(facebook\.com|fb\.watch)\/.+$/i,
        TikTok: /^(https?:\/\/)?(www\.)?(tiktok\.com|vm\.tiktok\.com)\/.+$/i,
    };

    // Check Shorts first as it's a subset of YouTube domain often
    if (patterns.Shorts.test(url)) return 'Shorts';

    for (const [platform, regex] of Object.entries(patterns)) {
        if (regex.test(url)) return platform;
    }

    return 'Universal';
};

export const isPlaylist = (url) => {
    if (!url) return false;
    try {
        const urlObj = new URL(url);
        return urlObj.searchParams.has('list');
    } catch (e) {
        return false;
    }
};
