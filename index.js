const express = require('express');
const cors = require('cors');
const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// হোম রুট (চেক করার জন্য)
app.get('/', (req, res) => {
    res.send('Music API is Running Successfully!');
});

// সার্চ এবং ডাউনলোড লিংক পাওয়ার এন্ডপয়েন্ট
app.get('/search', async (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.status(400).json({ error: 'Please provide a song name (?q=...)' });
    }

    try {
        // 1. ইউটিউবে গান সার্চ করা
        const searchResult = await yts(query);
        const firstVideo = searchResult.videos[0];

        if (!firstVideo) {
            return res.status(404).json({ error: 'No song found!' });
        }

        // 2. গানের তথ্য এবং অডিও লিংক তৈরি করা
        // আমরা সরাসরি ডাউনলোড লিংক জেনারেট করব
        const videoUrl = firstVideo.url;
        
        // অডিও স্ট্রিম থেকে ইনফো নেওয়া
        const info = await ytdl.getInfo(videoUrl);
        
        // শুধুমাত্র অডিও ফরম্যাট ফিল্টার করা (MP3/OPUS)
        const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
        
        // সেরা কোয়ালিটির অডিও লিংক বেছে নেওয়া
        const bestAudio = audioFormats.length > 0 ? audioFormats[0] : null;

        if (!bestAudio) {
            return res.status(404).json({ error: 'Audio format not found!' });
        }

        // 3. JSON রেসপন্স তৈরি করা
        const responseData = {
            title: firstVideo.title,
            duration: firstVideo.duration.timestamp,
            thumbnail: firstVideo.thumbnail,
            uploader: firstVideo.author.name,
            // এই লিংকটি সরাসরি MP3 স্ট্রিম করবে
            audio_url: bestAudio.url, 
            // সরাসরি ডাউনলোডের জন্য একটি এন্ডপয়েন্ট
            download_endpoint: `/download?url=${firstVideo.id}`
        };

        res.json(responseData);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong on the server.' });
    }
});

// অপশনাল: সরাসরি ফাইল ডাউনলোড এন্ডপয়েন্ট (বটের জন্য সুবিধাজনক)
app.get('/download', async (req, res) => {
    const videoId = req.query.url;
    if (!videoId) return res.status(400).send('Video ID required');

    try {
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        // হেডার সেট করা যাতে ব্রাউজার বা বট এটি ফাইল হিসেবে ডাউনলোড করে
        res.header('Content-Disposition', `attachment; filename="music_${videoId}.mp3"`);
        
        // স্ট্রিমিং শুরু
        ytdl(url, { filter: 'audioonly', quality: 'highestaudio' }).pipe(res);
    } catch (err) {
        res.status(500).send('Download failed');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
