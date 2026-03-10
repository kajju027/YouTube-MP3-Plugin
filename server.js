const express = require("express");
const yts = require("yt-search");
const { exec } = require("child_process");

const app = express();

app.get("/", (req, res) => {
  res.json({ status: "Sayan Music API Running" });
});

app.get("/music", async (req, res) => {
  const song = req.query.song;
  if (!song) return res.json({ status: false });

  try {
    const search = await yts(song);
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
  } catch {
    res.json({ status: false });
  }
});

app.get("/audio", (req, res) => {
  const id = req.query.id;
  const url = `https://youtube.com/watch?v=${id}`;

  exec(`yt-dlp -f bestaudio -g ${url}`, (err, stdout) => {
    if (err) return res.send("Audio error");

    const audio = stdout.trim();
    res.redirect(audio);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));
