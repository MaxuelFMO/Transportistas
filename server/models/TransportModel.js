import { query, run } from '../config/db.js';

const TransportModel = {
    getVehicles: async () => {
        return await query('SELECT * FROM vehiculos ORDER BY last_reset ASC, id_vehiculo ASC');
    },

    resetVehicle: async (id_vehiculo, fecha) => {
        // 1. Delete assignments for this vehicle on this date
        await run('DELETE FROM asignaciones WHERE id_vehiculo = ? AND fecha_servicio = ?', [id_vehiculo, fecha]);
        // 2. Update last_reset to move it to the end of the priority queue
        return await run('UPDATE vehiculos SET last_reset = ? WHERE id_vehiculo = ?', [Date.now(), id_vehiculo]);
    },

    getDestinations: async () => {
        return await query('SELECT * FROM destinos');
    },

    getAssignments: async (fecha) => {
        return await query(`
            SELECT A.*, V.placa, S.id_destino, S.pasajeros 
            FROM asignaciones A
            JOIN vehiculos V ON A.id_vehiculo = V.id_vehiculo
            JOIN solicitudes S ON A.id_solicitud = S.id_solicitud
            WHERE A.fecha_servicio = ?
        `, [fecha]);
    },

    createRequest: async (data) => {
        const { id_usuario, id_destino, fecha_solicitud, hora_solicitud, pasajeros } = data;
        return await run(`
            INSERT INTO solicitudes (id_usuario, id_destino, fecha_solicitud, hora_solicitud, pasajeros)
            VALUES (?, ?, ?, ?, ?)
        `, [id_usuario, id_destino, fecha_solicitud, hora_solicitud, pasajeros]);
    },

    getRequestById: async (id) => {
        const rows = await query('SELECT * FROM solicitudes WHERE id_solicitud = ?', [id]);
        return rows[0];
    },

    assignVehicle: async (id_solicitud, id_vehiculo, fecha_servicio) => {
        return await run(`
            INSERT INTO asignaciones (id_solicitud, id_vehiculo, fecha_servicio)
            VALUES (?, ?, ?)
        `, [id_solicitud, id_vehiculo, fecha_servicio]);
    },

    updateRequestStatus: async (id_solicitud, estado) => {
        return await run('UPDATE solicitudes SET estado = ? WHERE id_solicitud = ?', [estado, id_solicitud]);
    },

    findAvailableVehicle: async (id_destino, fecha, requestedPasajeros = 1) => {
        // Find a vehicle already assigned to this destination today that has at least 1 space
        // We order by count DESC to "fill the first one" (the one closest to being full)
        const existing = await query(`
            SELECT V.id_vehiculo, IFNULL(SUM(S.pasajeros), 0) as count
            FROM vehiculos V
            JOIN asignaciones A ON V.id_vehiculo = A.id_vehiculo
            JOIN solicitudes S ON A.id_solicitud = S.id_solicitud
            WHERE S.id_destino = ? AND A.fecha_servicio = ?
            GROUP BY V.id_vehiculo
            HAVING count < 4
            ORDER BY count DESC
            LIMIT 1
        `, [id_destino, fecha]);

        if (existing.length > 0) {
            const spaceAvailable = 4 - existing[0].count;
            return { id_vehiculo: existing[0].id_vehiculo, space: spaceAvailable };
        }

        // If no vehicle assigned to this destination has space, find a vehicle not assigned at all today
        const free = await query(`
            SELECT id_vehiculo FROM vehiculos
            WHERE id_vehiculo NOT IN (
                SELECT id_vehiculo FROM asignaciones WHERE fecha_servicio = ?
            )
            ORDER BY last_reset ASC, id_vehiculo ASC
            LIMIT 1
        `, [fecha]);

        if (free.length > 0) return { id_vehiculo: free[0].id_vehiculo, space: 4 };

        return null; // No vehicle available
    },

    getSettings: async () => {
        const rows = await query('SELECT * FROM settings');
        const settings = {};
        rows.forEach(r => settings[r.key] = r.value);
        return settings;
    },

    updateSetting: async (key, value) => {
        return await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
    }
};

export default TransportModel;
