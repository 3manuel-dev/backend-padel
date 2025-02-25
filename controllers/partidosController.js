import { obtenerPartidosDesdeGoogleSheets, actualizarPartidoEnGoogleSheets } from '../services/googleSheetsService.js';

// Obtener todos los partidos
export const obtenerPartidos = async (req, res) => {
  try {
    const partidos = await obtenerPartidosDesdeGoogleSheets();
    res.status(200).json(partidos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Inscribir a un jugador en un partido
export const inscribirJugador = async (req, res) => {
  const { jugador, partidoId } = req.body;
  try {
    const partidos = await obtenerPartidosDesdeGoogleSheets();
    const partido = partidos.find(p => p.id === partidoId);

    if (!partido) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }

    // Lógica de inscripción
    if (partido.jugadores.length < 4) {
      partido.jugadores.push(jugador);
    } else if (partido.reservas.length < 4) {
      partido.reservas.push(jugador);
    } else {
      return res.status(400).json({ error: 'El partido ya está lleno' });
    }

    await actualizarPartidoEnGoogleSheets(partido);
    res.status(200).json({ message: 'Inscripción exitosa', partido });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Cancelar la inscripción de un jugador en un partido
export const cancelarInscripcion = async (req, res) => {
  const { jugador, partidoId } = req.body;
  try {
    const partidos = await obtenerPartidosDesdeGoogleSheets();
    const partido = partidos.find(p => p.id === partidoId);

    if (!partido) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }

    // Lógica de cancelación
    partido.jugadores = partido.jugadores.filter(j => j !== jugador);
    partido.reservas = partido.reservas.filter(r => r !== jugador);

    await actualizarPartidoEnGoogleSheets(partido);
    res.status(200).json({ message: 'Cancelación exitosa', partido });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};