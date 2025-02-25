// Función para notificar a los reservas
function notificarReservas(partido, jugadorId) {
    const reservas = partido.slice(9, 13).filter(r => r);
    reservas.forEach((reserva, index) => {
      setTimeout(() => {
        console.log(`Notificando a reserva ${index + 1}: ${reserva}`);
        // Aquí se enviaría una notificación real (email, SMS, etc.)
      }, index * 30 * 60 * 1000); // 30 minutos entre cada notificación
    });
  }
  
  export default {
    notificarReservas,
  };