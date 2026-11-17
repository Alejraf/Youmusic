const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Busca index.html automáticamente en raíz, /public o subcarpetas
function findIndexFile(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findIndexFile(fullPath);
      if (found) return found;
    } else if (entry.name.toLowerCase() === "index.html") {
      return fullPath;
    }
  }
  return null;
}

const indexFilePath = findIndexFile(__dirname);
if (indexFilePath) {
  app.use(express.static(path.dirname(indexFilePath)));
}

// Endpoint seguro para buscar en YouTube sin exponer la API Key
app.get("/api/search", async (req, res) => {
  const query = (req.query.q || "").trim();
  if (!query) return res.status(400).json({ error: "Falta el término de búsqueda." });
  if (!YOUTUBE_API_KEY) {
    return res.status(500).json({ error: "Falta configurar YOUTUBE_API_KEY en Render." });
  }

  const endpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=15&q=${encodeURIComponent(query)}&key=${encodeURIComponent(YOUTUBE_API_KEY)}`;

  try {
    const response = await fetch(endpoint);
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || "Error en YouTube API." });
    }
    const items = (data.items || []).map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url
    }));
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: "Error de conexión con YouTube." });
  }
});

// Entrega el reproductor o muestra qué archivos ve Render si falta index.html
app.get("*", (req, res) => {
  if (indexFilePath) {
    return res.sendFile(indexFilePath);
  }
  const files = fs.readdirSync(__dirname);
  res.status(404).send(`No se encontró index.html. Archivos actuales en Render: ${files.join(", ")}`);
});

app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}. HTML encontrado: ${indexFilePath || "NINGUNO"}`);
});
