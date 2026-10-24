const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10kb" }));

// Solo se sirve la carpeta /public (antes se exponía todo el proyecto, incluido server.js)
app.use(express.static(path.join(__dirname, "public")));

// ---------- Persistencia (MEJORA) ----------
// En Azure App Service (Linux) usa DATA_DIR=/home/data para que sobreviva a reinicios.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "mensajes.json");
const MAX_MENSAJES = 500;

let mensajes = [];
let siguienteId = 1;

function cargar() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      if (Array.isArray(data)) {
        mensajes = data.slice(-MAX_MENSAJES);
        siguienteId = mensajes.reduce((max, m) => Math.max(max, m.id || 0), 0) + 1;
      }
    }
  } catch (err) {
    console.error("No se pudo cargar el historial:", err.message);
  }
}

let guardando = Promise.resolve();
function guardar() {
  // Cola de escrituras para no pisar el archivo; se escribe a .tmp y se renombra
  guardando = guardando
    .then(async () => {
      const tmp = DATA_FILE + ".tmp";
      await fs.promises.writeFile(tmp, JSON.stringify(mensajes));
      await fs.promises.rename(tmp, DATA_FILE);
    })
    .catch((err) => console.error("No se pudo guardar:", err.message));
}

cargar();

// ---------- Rutas ----------
app.get("/health", (req, res) => res.json({ ok: true }));

// GET /mensajes            -> todos
// GET /mensajes?desde=12   -> solo los de id > 12 (carga incremental)
app.get("/mensajes", (req, res) => {
  const desde = parseInt(req.query.desde, 10);
  res.json(Number.isNaN(desde) ? mensajes : mensajes.filter((m) => m.id > desde));
});

app.post("/mensaje", (req, res) => {
  const usuario = typeof req.body.usuario === "string" ? req.body.usuario.trim() : "";
  const mensaje = typeof req.body.mensaje === "string" ? req.body.mensaje.trim() : "";

  if (!usuario || !mensaje) {
    return res.status(400).json({ error: "Escribe tu nombre y un mensaje." });
  }
  if (usuario.length > 30 || mensaje.length > 500) {
    return res.status(400).json({ error: "Nombre máx. 30 y mensaje máx. 500 caracteres." });
  }

  const nuevo = { id: siguienteId++, usuario, mensaje, fecha: new Date().toISOString() };
  mensajes.push(nuevo);
  if (mensajes.length > MAX_MENSAJES) mensajes = mensajes.slice(-MAX_MENSAJES);
  guardar();

  res.status(201).json(nuevo);
});

// JSON inválido u otros errores -> respuesta JSON en vez de HTML
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 500).json({ error: "Solicitud inválida." });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Servidor corriendo en puerto " + port);
});
