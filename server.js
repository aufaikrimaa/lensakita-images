const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const port = process.env.PORT || 8000;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

app.get("/images/:imageName", (req, res) => {
  const imageName = req.params.imageName;
  const imagePath = path.join(__dirname, "images", imageName);

  fs.stat(imagePath, (err, stats) => {
    if (err) {
      return res.status(404).send("Image not found");
    }

    res.header("Cache-Control", "max-age=31536000, must-revalidate");
    res.header("Last-Modified", stats.mtime.toUTCString());
    res.header("ETag", `W/"${stats.size}-${stats.mtime.getTime()}"`);
    res.header("Accept-Ranges", "bytes");

    res.sendFile(imagePath);
  });
});

function getMimeType(filePath) {
  const ext = path.extname(filePath);
  switch (ext.toLowerCase()) {
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    default:
      return "application/octet-stream"; // default jika tipe tidak dikenali
  }
}

app.get("/videos/:videoName", (req, res) => {
  const videoName = req.params.videoName;
  const videoPath = path.join(__dirname, "videos", videoName);

  fs.stat(videoPath, (err, stats) => {
    if (err) {
      return res.status(404).send("Video not found");
    }

    const range = req.headers.range;
    const fileSize = stats.size;
    const mimeType = getMimeType(videoPath);

    res.header("Cache-Control", "max-age=31536000, must-revalidate");
    res.header("Last-Modified", stats.mtime.toUTCString());
    res.header("ETag", `W/"${stats.size}-${stats.mtime.getTime()}"`);
    res.header("Accept-Ranges", "bytes");
    res.header("Content-Type", mimeType);

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.status(206).header({
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Content-Length": chunkSize,
      });

      const fileStream = fs.createReadStream(videoPath, { start, end });
      fileStream.pipe(res);
    } else {
      res.header("Content-Length", fileSize);
      fs.createReadStream(videoPath).pipe(res);
    }
  });
});

app.get("/", async function (req, res) {
  return await res.status(404).json({
    success: true,
    message: "api ready to use",
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
