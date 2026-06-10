import TransportModel from '../models/TransportModel.js';

const TransportController = {
    getDashboardData: async (req, res) => {
        try {
            const date = req.query.date || new Date().toISOString().split('T')[0];
            const vehicles = await TransportModel.getVehicles();
            const assignments = await TransportModel.getAssignments(date);
            const destinations = await TransportModel.getDestinations();

            res.json({ vehicles, assignments, destinations });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    submitRequest: async (req, res) => {
        try {
            const { id_usuario, id_destino, programar_manana, pasajeros } = req.body;
            const now = new Date();
            const fecha_solicitud = now.toISOString().split('T')[0];
            const settings = await TransportModel.getSettings();
            
            let hora_solicitud = now.toTimeString().split(' ')[0];
            if (programar_manana) {
                const [h, m, s] = settings.end_time.split(':');
                hora_solicitud = `${(parseInt(h) + 1).toString().padStart(2, '0')}:${m}:${s}`;
            }

            let remainingPasajeros = parseInt(pasajeros) || 1;
            let firstRequestId = null;
            let totalAssigned = 0;

            while (remainingPasajeros > 0) {
                // 1. Create a partial request
                // We don't know yet how many will fit, but we'll try to find a vehicle first
                // to know the available space.
                
                // For the first iteration, we just need to know the date service to check availability
                // We'll use a temporary request or just check availability directly
                
                // We need to know the fecha_servicio which is set by the trigger trg_validar_horario
                // But we can calculate it here to check availability
                let fecha_servicio = fecha_solicitud;
                if (hora_solicitud < settings.start_time || hora_solicitud > settings.end_time) {
                    const d = new Date(fecha_solicitud);
                    d.setDate(d.getDate() + 1);
                    fecha_servicio = d.toISOString().split('T')[0];
                }

                const availability = await TransportModel.findAvailableVehicle(id_destino, fecha_servicio, remainingPasajeros);
                
                if (!availability) {
                    if (totalAssigned === 0) {
                        return res.json({ message: 'No hay vehículos disponibles para este destino. VEHICULO LLENO.', status: 'FULL' });
                    }
                    break; // No more space for the remaining passengers
                }

                const canFit = Math.min(remainingPasajeros, availability.space);
                
                const result = await TransportModel.createRequest({
                    id_usuario,
                    id_destino,
                    fecha_solicitud,
                    hora_solicitud,
                    pasajeros: canFit
                });

                if (!firstRequestId) firstRequestId = result.id;
                
                const request = await TransportModel.getRequestById(result.id);

                if (request.estado === 'PENDIENTE') {
                    await TransportModel.assignVehicle(request.id_solicitud, availability.id_vehiculo, request.fecha_servicio);
                    await TransportModel.updateRequestStatus(request.id_solicitud, 'ASIGNADO');
                    totalAssigned += canFit;
                }
                
                remainingPasajeros -= canFit;
            }

            if (totalAssigned > 0) {
                res.json({ message: `Solicitud procesada: ${totalAssigned} pasajeros asignados.`, totalAssigned });
            } else {
                res.json({ message: 'Solicitud recibida fuera de horario. Programada para mañana.' });
            }
        } catch (error) {
            console.error('Error in submitRequest:', error);
            res.status(500).json({ error: error.message });
        }
    },

    getSettings: async (req, res) => {
        try {
            const settings = await TransportModel.getSettings();
            res.json(settings);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    updateSettings: async (req, res) => {
        try {
            const { start_time, end_time } = req.body;
            if (start_time) await TransportModel.updateSetting('start_time', start_time);
            if (end_time) await TransportModel.updateSetting('end_time', end_time);
            res.json({ message: 'Configuración actualizada correctamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    resetVehicle: async (req, res) => {
        try {
            const { id_vehiculo, fecha } = req.body;
            await TransportModel.resetVehicle(id_vehiculo, fecha);
            res.json({ message: 'Vehículo habilitado y prioridad actualizada' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

export default TransportController;
