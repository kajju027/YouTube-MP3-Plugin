const express = require("express");
const yts = require("yt-search");
const { exec } = require("child_process");

const app = express();

app.get("/", (req, res) => {
  res.send("Sayan Music API Running");
});

app.get("/music", async (req, res) => {
  const query = req.query.song;
  if (!query) {
    return res.json({ status: false, message: "Song name required" });
  }

  try {
    const search = await yts(query);
    const video = search.videos[0];

    res.json({
      status: true,
      result: {
        title: video.title,
        duration: video.timestamp,
        views: video.views,
        thumbnail: video.thumbnail,
        audio: `/audio?id=${video.videoId}`
      }
    });

  } catch (e) {
    res.json({ status: false, message: "Search error" });
  }
});

app.get("/audio", (req, res) => {
  const id = req.query.id;
  if (!id) return res.send("No video id");

  const url = `https://youtube.com/watch?v=${id}`;

  exec(`yt-dlp -f bestaudio -g ${url}`, (err, stdout) => {
    if (err) return res.send("Audio error");

    const audioUrl = stdout.trim();
    res.redirect(audioUrl);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));
