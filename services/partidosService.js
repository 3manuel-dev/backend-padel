import { google } from 'googleapis';
import { readFile } from 'fs/promises';

const SPREADSHEET_ID = '1HGCKbUPG_C5F_tr33XKLEZ4Y86_TTszQkGvpQHAp66g'; // Reemplaza con tu ID de Google Sheets

// Autenticación con Google Sheets API
async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(await readFile('googleSheetsServiceAccountKey.json')),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return auth.getClient();
}

// Obtener todos los partidos
async function obtenerPartidos() {
  const authClient = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Partidos!A2:M', // Ajusta el rango según tu hoja de cálculo
  });
  return response.data.values;
}

export default {
  obtenerPartidos,
  inscribirJugador,
  cancelarInscripcion,
};