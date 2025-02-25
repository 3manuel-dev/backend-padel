import express from 'express';
import { obtenerPartidos, inscribirJugador, cancelarInscripcion } from '../controllers/partidosController.js';

const router = express.Router();

// Obtener todos los partidos
router.get('/', obtenerPartidos);

// Inscribirse en un partido
router.post('/inscribirse', inscribirJugador);

// Cancelar inscripción en un partido
router.post('/cancelar', cancelarInscripcion);

export default router;