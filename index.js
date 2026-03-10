const express = require('express');
const { exec } = require('child_process');
const app = express();
const PORT = process.env.PORT || 3000;

// Helper function to execute shell commands
const execCommand = (cmd) => {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) reject(error);
            resolve(stdout.trim());
        });
    });
};

app.get('/api/search', async (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.status(400).json({ error: 'Please provide a search query (?q=...)' });
    }

    try {
        // ১. YouTube Search এবং Data Extract (এক কমান্ডে)
        // --flat-playlist: দ্রুত সার্চ করে
        // -j: JSON আউটপুট দেয়
        const searchCmd = `yt-dlp "ytsearch1:${query}" --flat-playlist -j`;
        const jsonData = await execCommand(searchCmd);
        
        // JSON পার্স করা
        const videoInfo = JSON.parse(jsonData);
        const videoId = videoInfo.id;
        const videoUrl = videoInfo.url || `https://www.youtube.com/watch?v=${videoId}`;

        // ২. Audio URL Extract (MP3/M4A format)
        // -g: Direct URL দেয়, -f bestaudio: সেরা অডিও সিলেক্ট করে
        const audioCmd = `yt-dlp -g -f "bestaudio" "${videoUrl}"`;
        const audioUrl = await execCommand(audioCmd);

        // ৩. Response JSON তৈরি
        const response = {
            title: videoInfo.title,
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            views: videoInfo.view_count || 0,
            upload_date: videoInfo.upload_date || "Unknown",
            video_url: videoUrl,
            mp3_url: audioUrl
        };

        res.json(response);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch data', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
