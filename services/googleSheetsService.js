import { google } from 'googleapis';
import { readFile } from 'fs/promises';

const SPREADSHEET_ID = '1HGCKbUPG_C5F_tr33XKLEZ4Y86_TTszQkGvpQHAp66';

// Autenticación con Google Sheets API
async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(await readFile('googleSheetsServiceAccountKey.json')),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return auth.getClient();
}

// Obtener partidos desde Google Sheets
export const obtenerPartidosDesdeGoogleSheets = async () => {
  const authClient = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Partidos!A2:M',
  });

  return response.data.values.map(row => ({
    id: row[0],
    lugar: row[1],
    horario: row[2],
    fecha: row[3],
    duracion: row[4],
    jugadores: row.slice(5, 9).filter(j => j),
    reservas: row.slice(9, 13).filter(r => r),
  }));
};

// Actualizar un partido en Google Sheets
export const actualizarPartidoEnGoogleSheets = async (partido) => {
  const authClient = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  const values = [
    partido.id,
    partido.lugar,
    partido.horario,
    partido.fecha,
    partido.duracion,
    ...partido.jugadores,
    ...partido.reservas,
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Partidos!A${partido.id + 1}:M`,
    valueInputOption: 'RAW',
    resource: { values: [values] },
  });
};