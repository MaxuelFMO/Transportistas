import seedData from './seed.json';

const STORAGE_KEY = 'transportistas_data';

let data = null;

function loadData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      data = JSON.parse(stored);
      return;
    } catch (e) {}
  }
  data = JSON.parse(JSON.stringify(seedData));
  persist();
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function nextId(entity) {
  data.counters[entity] = (data.counters[entity] || 0) + 1;
  return data.counters[entity];
}

loadData();

const store = {
  async getDashboardData(date) {
    const d = date || new Date().toISOString().split('T')[0];
    const vehicles = await this.getVehicles();
    const assignments = await this.getAssignments(d);
    const destinations = await this.getDestinations();
    return { vehicles, assignments, destinations };
  },

  async getVehicles() {
    return [...data.vehiculos].sort((a, b) => {
      if (a.last_reset !== b.last_reset) return a.last_reset - b.last_reset;
      return a.id_vehiculo - b.id_vehiculo;
    });
  },

  async getDestinations() {
    return [...data.destinos];
  },

  async getAssignments(fecha) {
    return data.asignaciones
      .filter(a => a.fecha_servicio === fecha)
      .map(a => {
        const v = data.vehiculos.find(v => v.id_vehiculo === a.id_vehiculo);
        const s = data.solicitudes.find(s => s.id_solicitud === a.id_solicitud);
        return {
          ...a,
          placa: v ? v.placa : null,
          id_destino: s ? s.id_destino : null,
          pasajeros: s ? s.pasajeros : 0,
        };
      });
  },

  async getSettings() {
    return { ...data.settings };
  },

  async updateSettings(start_time, end_time) {
    if (start_time) data.settings.start_time = start_time;
    if (end_time) data.settings.end_time = end_time;
    persist();
    return { message: 'Configuración actualizada correctamente' };
  },

  async updateSetting(key, value) {
    data.settings[key] = value;
    persist();
  },

  async createRequest(input) {
    const id_solicitud = nextId('id_solicitud');
    const request = {
      id_solicitud,
      id_usuario: input.id_usuario,
      id_destino: input.id_destino,
      fecha_solicitud: input.fecha_solicitud,
      hora_solicitud: input.hora_solicitud,
      estado: 'PENDIENTE',
      fecha_servicio: null,
      pasajeros: input.pasajeros,
    };
    this.applyHorarioTrigger(request);
    data.solicitudes.push(request);
    persist();
    return { id: id_solicitud, changes: 1 };
  },

  applyHorarioTrigger(request) {
    const start = data.settings.start_time;
    const end = data.settings.end_time;
    if (request.hora_solicitud < start || request.hora_solicitud > end) {
      request.estado = 'REPROGRAMADO';
      const d = new Date(request.fecha_solicitud);
      d.setDate(d.getDate() + 1);
      request.fecha_servicio = d.toISOString().split('T')[0];
    } else {
      request.fecha_servicio = request.fecha_solicitud;
    }
  },

  async getRequestById(id) {
    return data.solicitudes.find(s => s.id_solicitud === id) || null;
  },

  async assignVehicle(id_solicitud, id_vehiculo, fecha_servicio) {
    const solicitud = data.solicitudes.find(s => s.id_solicitud === id_solicitud);
    if (!solicitud) throw new Error('Solicitud no encontrada');

    const existing = data.asignaciones.filter(
      a => a.id_vehiculo === id_vehiculo && a.fecha_servicio === fecha_servicio
    );
    const totalPasajeros = existing.reduce((sum, a) => {
      const s = data.solicitudes.find(s => s.id_solicitud === a.id_solicitud);
      return sum + (s ? s.pasajeros : 0);
    }, 0);

    if (totalPasajeros + solicitud.pasajeros > 4) {
      throw new Error('VEHICULO LLENO');
    }

    const id_asignacion = nextId('id_asignacion');
    const asignacion = {
      id_asignacion,
      id_solicitud,
      id_vehiculo,
      fecha_servicio,
    };
    data.asignaciones.push(asignacion);
    persist();
    return { id: id_asignacion, changes: 1 };
  },

  async updateRequestStatus(id_solicitud, estado) {
    const req = data.solicitudes.find(s => s.id_solicitud === id_solicitud);
    if (req) {
      req.estado = estado;
      persist();
    }
    return { changes: 1 };
  },

  async findAvailableVehicle(id_destino, fecha, requestedPasajeros = 1) {
    const existing = data.asignaciones
      .filter(a => a.fecha_servicio === fecha)
      .map(a => {
        const s = data.solicitudes.find(s => s.id_solicitud === a.id_solicitud);
        return { ...a, id_destino: s ? s.id_destino : null, pasajeros: s ? s.pasajeros : 0 };
      })
      .filter(a => a.id_destino === id_destino)
      .reduce((acc, a) => {
        if (!acc[a.id_vehiculo]) acc[a.id_vehiculo] = 0;
        acc[a.id_vehiculo] += a.pasajeros;
        return acc;
      }, {});

    const vehicleIds = Object.keys(existing).map(Number);
    for (const vid of vehicleIds) {
      const count = existing[vid];
      if (count < 4) {
        const space = 4 - count;
        return { id_vehiculo: vid, space };
      }
    }

    const assignedToday = new Set(data.asignaciones.filter(a => a.fecha_servicio === fecha).map(a => a.id_vehiculo));
    const free = data.vehiculos
      .filter(v => !assignedToday.has(v.id_vehiculo))
      .sort((a, b) => {
        if (a.last_reset !== b.last_reset) return a.last_reset - b.last_reset;
        return a.id_vehiculo - b.id_vehiculo;
      });

    if (free.length > 0) return { id_vehiculo: free[0].id_vehiculo, space: 4 };

    return null;
  },

  async submitRequest(body) {
    const { id_usuario, id_destino, programar_manana, pasajeros } = body;
    const now = new Date();
    const fecha_solicitud = now.toISOString().split('T')[0];
    const settings = await this.getSettings();

    let hora_solicitud = now.toTimeString().split(' ')[0];
    if (programar_manana) {
      const [h, m, s] = settings.end_time.split(':');
      hora_solicitud = `${(parseInt(h) + 1).toString().padStart(2, '0')}:${m}:${s}`;
    }

    let remainingPasajeros = parseInt(pasajeros) || 1;
    let totalAssigned = 0;

    let fecha_servicio = fecha_solicitud;
    if (hora_solicitud < settings.start_time || hora_solicitud > settings.end_time) {
      const d = new Date(fecha_solicitud);
      d.setDate(d.getDate() + 1);
      fecha_servicio = d.toISOString().split('T')[0];
    }

    let firstMessage = null;

    while (remainingPasajeros > 0) {
      const availability = await this.findAvailableVehicle(id_destino, fecha_servicio, remainingPasajeros);

      if (!availability) {
        if (totalAssigned === 0) {
          return { message: 'No hay vehículos disponibles para este destino. VEHICULO LLENO.', status: 'FULL' };
        }
        break;
      }

      const canFit = Math.min(remainingPasajeros, availability.space);

      const result = await this.createRequest({
        id_usuario,
        id_destino,
        fecha_solicitud,
        hora_solicitud,
        pasajeros: canFit,
      });

      if (!firstMessage) firstMessage = result;

      const request = await this.getRequestById(result.id);

      if (request.estado === 'PENDIENTE') {
        await this.assignVehicle(request.id_solicitud, availability.id_vehiculo, request.fecha_servicio);
        await this.updateRequestStatus(request.id_solicitud, 'ASIGNADO');
        totalAssigned += canFit;
      }

      remainingPasajeros -= canFit;
    }

    if (totalAssigned > 0) {
      return { message: `Solicitud procesada: ${totalAssigned} pasajeros asignados.`, totalAssigned };
    }
    return { message: 'Solicitud recibida fuera de horario. Programada para mañana.' };
  },

  async resetVehicle(id_vehiculo, fecha) {
    data.asignaciones = data.asignaciones.filter(
      a => !(a.id_vehiculo === id_vehiculo && a.fecha_servicio === fecha)
    );
    const v = data.vehiculos.find(v => v.id_vehiculo === id_vehiculo);
    if (v) {
      v.last_reset = Date.now();
    }
    persist();
    return { message: 'Vehículo habilitado y prioridad actualizada' };
  },
};

export default store;
