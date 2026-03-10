import express from "express";
import { exec } from "child_process";

const app = express();

app.get("/extract", (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.json({error: "No URL"});
  }

  const command = `yt-dlp -x --audio-format mp3 -o "%(title)s.%(ext)s" ${url}`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      return res.json({error: "Extraction failed"});
    }

    res.json({
      status: "done",
      message: "MP3 created"
    });
  });
});

app.listen(3000, () => {
  console.log("Server running");
});
