const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Servir archivos estáticos desde la carpeta "public"
app.use(express.static(path.join(__dirname, "public")));

// Endpoint seguro para buscar en YouTube sin exponer la API Key al navegador
app.get("/api/search", async (req, res) => {
  const query = (req.query.q || "").trim();

  if (!query) {
    return res.status(400).json({ error: "Falta el término de búsqueda." });
  }

  if (!YOUTUBE_API_KEY) {
    return res.status(500).json({
      error: "Falta configurar YOUTUBE_API_KEY en las variables de entorno de Render."
    });
  }

  const endpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=15&q=${encodeURIComponent(query)}&key=${encodeURIComponent(YOUTUBE_API_KEY)}`;

  try {
    const response = await fetch(endpoint);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "Error al consultar la API de YouTube."
      });
    }

    const items = (data.items || []).map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url
    }));

    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: "Error interno al conectar con YouTube." });
  }
});

// Fallback a index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});
