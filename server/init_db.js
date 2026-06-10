import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../src/db/transport.db');

export const initializeDatabase = () => {
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    const db = new sqlite3.Database(dbPath);

    db.serialize(() => {
        // 1. Create Tables
        db.run(`CREATE TABLE IF NOT EXISTS usuarios (
            id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            rol TEXT CHECK(rol IN ('USER','CONDUCTOR')) NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS destinos (
            id_destino INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS vehiculos (
            id_vehiculo INTEGER PRIMARY KEY AUTOINCREMENT,
            placa TEXT NOT NULL,
            capacidad_max INTEGER DEFAULT 4,
            id_conductor INTEGER,
            last_reset INTEGER DEFAULT 0,
            FOREIGN KEY (id_conductor) REFERENCES usuarios(id_usuario)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS solicitudes (
            id_solicitud INTEGER PRIMARY KEY AUTOINCREMENT,
            id_usuario INTEGER NOT NULL,
            id_destino INTEGER NOT NULL,
            fecha_solicitud TEXT NOT NULL,
            hora_solicitud TEXT NOT NULL,
            estado TEXT CHECK(estado IN ('PENDIENTE','ASIGNADO','REPROGRAMADO')) DEFAULT 'PENDIENTE',
            fecha_servicio TEXT,
            pasajeros INTEGER DEFAULT 1,
            FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
            FOREIGN KEY (id_destino) REFERENCES destinos(id_destino)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS asignaciones (
            id_asignacion INTEGER PRIMARY KEY AUTOINCREMENT,
            id_solicitud INTEGER NOT NULL,
            id_vehiculo INTEGER NOT NULL,
            fecha_servicio TEXT NOT NULL,
            FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud),
            FOREIGN KEY (id_vehiculo) REFERENCES vehiculos(id_vehiculo)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )`);

        // 2. Add missing columns (Migration style)
        db.all("PRAGMA table_info(vehiculos)", (err, rows) => {
            if (!rows.find(r => r.name === 'last_reset')) {
                db.run('ALTER TABLE vehiculos ADD COLUMN last_reset INTEGER DEFAULT 0');
            }
        });

        db.all("PRAGMA table_info(solicitudes)", (err, rows) => {
            if (!rows.find(r => r.name === 'pasajeros')) {
                db.run('ALTER TABLE solicitudes ADD COLUMN pasajeros INTEGER DEFAULT 1');
            }
        });

        // 3. Recreate Triggers
        db.run('DROP TRIGGER IF EXISTS trg_validar_horario');
        db.run(`
            CREATE TRIGGER trg_validar_horario
            AFTER INSERT ON solicitudes
            FOR EACH ROW
            BEGIN
                UPDATE solicitudes
                SET estado = CASE 
                        WHEN NEW.hora_solicitud < (SELECT value FROM settings WHERE key = 'start_time') 
                          OR NEW.hora_solicitud > (SELECT value FROM settings WHERE key = 'end_time') THEN 'REPROGRAMADO'
                        ELSE 'PENDIENTE'
                    END,
                    fecha_servicio = CASE 
                        WHEN NEW.hora_solicitud < (SELECT value FROM settings WHERE key = 'start_time') 
                          OR NEW.hora_solicitud > (SELECT value FROM settings WHERE key = 'end_time') THEN date(NEW.fecha_solicitud, '+1 day')
                        ELSE NEW.fecha_solicitud
                    END
                WHERE id_solicitud = NEW.id_solicitud;
            END;
        `);

        db.run('DROP TRIGGER IF EXISTS trg_validar_capacidad');
        db.run(`
            CREATE TRIGGER trg_validar_capacidad
            BEFORE INSERT ON asignaciones
            FOR EACH ROW
            BEGIN
                SELECT CASE
                    WHEN (
                        SELECT IFNULL(SUM(S.pasajeros), 0) 
                        FROM asignaciones A 
                        JOIN solicitudes S ON A.id_solicitud = S.id_solicitud
                        WHERE A.id_vehiculo = NEW.id_vehiculo AND A.fecha_servicio = NEW.fecha_servicio
                    ) + (SELECT pasajeros FROM solicitudes WHERE id_solicitud = NEW.id_solicitud) > 4
                    THEN RAISE(FAIL, 'VEHICULO LLENO')
                END;
            END;
        `);

        // 4. Seed Data
        db.get("SELECT COUNT(*) as count FROM destinos", (err, row) => {
            if (row && row.count === 0) {
                db.run("INSERT INTO usuarios (nombre, rol) VALUES ('Admin', 'USER')");
                db.run("INSERT INTO destinos (nombre) VALUES ('Punto A'), ('Punto B'), ('Punto C'), ('Punto D')");
                db.run(`INSERT INTO vehiculos (placa) VALUES 
                    ('ABC-101'), ('ABC-102'), ('ABC-103'), ('ABC-104'), ('ABC-105'),
                    ('ABC-106'), ('ABC-107'), ('ABC-108'), ('ABC-109'), ('ABC-110')`);
            }
        });

        db.get("SELECT COUNT(*) as count FROM settings", (err, row) => {
            if (row && row.count === 0) {
                db.run("INSERT INTO settings (key, value) VALUES ('start_time', '08:00:00'), ('end_time', '16:00:00')");
            }
        });

        console.log('Database initialized successfully.');
    });

    return db;
};
