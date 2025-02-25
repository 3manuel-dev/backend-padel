import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { google } from 'googleapis';
import { readFile } from 'fs/promises';
import admin from 'firebase-admin';
import Stripe from 'stripe';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
//const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // 🔹 Leer clave desde .env

// Cargar credenciales de Firebase
const serviceAccount = JSON.parse(
  await readFile(new URL('./firebaseServiceAccountKey.json', import.meta.url), 'utf-8')
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Middleware
app.use(cors());
app.use(bodyParser.json());

// 🔹 Google Sheets
const sheets = google.sheets({ version: 'v4' });
const googleSheetsKey = JSON.parse(
  await readFile(new URL(process.env.GOOGLE_SHEETS_CREDENTIALS_PATH, import.meta.url), 'utf-8')
);

const auth = new google.auth.GoogleAuth({
  credentials: googleSheetsKey,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const SPREADSHEET_ID = process.env.SPREADSHEET_ID; // 🔹 Leer ID de hoja desde .env


// **Ruta para obtener todos los partidos**
app.get('/partidos', async (req, res) => {
  try {
    const authClient = await auth.getClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Partidos!A2:G', // Ajusta el rango según tu hoja de cálculo
      auth: authClient,
    });
    res.status(200).json(response.data.values || []);
  } catch (error) {
    console.error("Error obteniendo los partidos:", error);
    res.status(500).json({ error: "Error obteniendo los partidos: " + error.message });
  }
});

// **Ruta para inscribirse en un partido**
app.post('/inscribirse', async (req, res) => {
  const { jugador, partidoId } = req.body;
  try {
    const authClient = await auth.getClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Partidos!A2:G',
      auth: authClient,
    });
    let partidos = response.data.values || [];
    let partidoIndex = partidos.findIndex(p => p[0] === partidoId);
    if (partidoIndex === -1) return res.status(400).json({ error: "Partido no encontrado" });

    let partido = partidos[partidoIndex];
    let jugadores = partido.slice(3, 7).filter(j => j);
    if (jugadores.length < 4) {
      partido[3 + jugadores.length] = jugador;
    } else {
      return res.status(400).json({ error: "El partido ya está lleno" });
    }
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Partidos!A${partidoIndex + 2}:G`,
      valueInputOption: 'RAW',
      resource: { values: [partido] },
      auth: authClient,
    });
    res.status(200).json({ message: "Inscripción exitosa" });
  } catch (error) {
    res.status(500).json({ error: "Error inscribiendo al partido: " + error.message });
  }
});

// **Ruta para cancelar inscripción**
app.post('/cancelar-inscripcion', async (req, res) => {
  const { jugador, partidoId } = req.body;
  try {
    const authClient = await auth.getClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Partidos!A2:G',
      auth: authClient,
    });
    let partidos = response.data.values || [];
    let partidoIndex = partidos.findIndex(p => p[0] === partidoId);
    if (partidoIndex === -1) return res.status(400).json({ error: "Partido no encontrado" });

    let partido = partidos[partidoIndex];
    let jugadores = partido.slice(3, 7);
    let jugadorIndex = jugadores.indexOf(jugador);
    if (jugadorIndex !== -1) {
      partido[3 + jugadorIndex] = "";
    } else {
      return res.status(400).json({ error: "No estás inscrito en este partido" });
    }
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Partidos!A${partidoIndex + 2}:G`,
      valueInputOption: 'RAW',
      resource: { values: [partido] },
      auth: authClient,
    });
    res.status(200).json({ message: "Cancelación exitosa" });
  } catch (error) {
    res.status(500).json({ error: "Error cancelando la inscripción: " + error.message });
  }
});

// **Ruta para recargar el monedero virtual**
app.post('/recargar-monederovirtual', async (req, res) => {
  const { userId, amount } = req.body;
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Stripe usa centavos
      currency: 'eur',
      payment_method: 'pm_card_visa', // Usa un método de pago de prueba
      confirm: true,
    });

    // Actualizar el saldo en Google Sheets
    const authClient = await auth.getClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Usuarios!A2:E', // Ajusta el rango según tu hoja de cálculo
      auth: authClient,
    });
    let usuarios = response.data.values || [];
    let usuarioIndex = usuarios.findIndex(u => u[0] === userId);
    if (usuarioIndex === -1) return res.status(400).json({ error: "Usuario no encontrado" });

    let usuario = usuarios[usuarioIndex];
    usuario[4] = (parseFloat(usuario[4]) || 0) + amount; // Actualizar saldo

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Usuarios!A${usuarioIndex + 2}:E`,
      valueInputOption: 'RAW',
      resource: { values: [usuario] },
      auth: authClient,
    });

    res.status(200).json({ success: true, saldoActualizado: usuario[4] });
  } catch (error) {
    res.status(500).json({ error: "Error recargando el monedero: " + error.message });
  }
});

// **Ruta para obtener el nivel de un jugador**
app.get('/nivel/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const authClient = await auth.getClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Votaciones!A2:D', // Ajusta el rango según tu hoja de cálculo
      auth: authClient,
    });
    let votaciones = response.data.values || [];
    let votos = votaciones.filter(v => v[1] === userId).map(v => parseFloat(v[2]));
    let promedio = votos.length ? (votos.reduce((a, b) => a + b, 0) / votos.length) : 0;

    res.status(200).json({ nivel: promedio.toFixed(2) });
  } catch (error) {
    res.status(500).json({ error: "Error calculando el nivel: " + error.message });
  }
});


app.post('/registrar-usuario', async (req, res) => {
  console.log("📌 Datos recibidos en /registrar-usuario:", req.body);
  const { nickname, email, whatsapp, nivel, categoria, pais, bandera } = req.body;

  if (!nickname || !email) {
    console.error("❌ Error: Datos incompletos en /registrar-usuario.");
    return res.status(400).json({ error: "⚠️ Todos los campos son obligatorios." });
  }

  try {
    const authClient = await auth.getClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Usuarios!A2:G',
      auth: authClient,
    });

    let usuarios = response.data.values || [];
    const usuarioExiste = usuarios.some(user => user[1] === email);

    if (usuarioExiste) {
      return res.status(400).json({ error: "⚠️ Este correo ya está registrado." });
    }

    console.log("✅ Guardando usuario en Google Sheets...");
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Usuarios!A2:G',
      valueInputOption: 'RAW',
      resource: {
        values: [[
          nickname,
          email,
          whatsapp || "",
          nivel || "",
          categoria || "",
          pais || "",
          bandera || "🏳",
        ]],
      },
      auth: authClient,
    });

    console.log("✅ Usuario guardado en Google Sheets.");
    res.status(200).json({ message: "Usuario registrado correctamente en Sheets" });

  } catch (error) {
    console.error("🔥 Error en /registrar-usuario:", error.message);
    res.status(500).json({ error: "🔥 Error guardando usuario en Sheets: " + error.message });
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});