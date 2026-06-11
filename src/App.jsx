import React, { useState, useEffect } from 'react';
import VehicleGrid from './vista/VehicleGrid';
import RequestForm from './vista/RequestForm';
import SettingsForm from './vista/componentes/SettingsForm';
import store from './data/store';

function App() {
    const [data, setData] = useState({ vehicles: [], assignments: [], destinations: [] });
    const [settings, setSettings] = useState({ start_time: '08:00', end_time: '16:00' });
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const json = await store.getDashboardData();
            setData(json);
            const settingsJson = await store.getSettings();
            setSettings(settingsJson);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white font-mono">
            <span className="text-xs uppercase tracking-widest animate-pulse">Cargando Sistema...</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 font-mono text-black p-8">
            <header className="mb-12 border-b border-black pb-4 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-bold tracking-tighter uppercase">Transporte Institucional</h1>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">
                        Horario de Atención: {settings.start_time.substring(0,5)} - {settings.end_time.substring(0,5)}
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-xs font-bold uppercase">{new Date().toLocaleDateString()}</span>
                </div>
            </header>

            <main className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    <RequestForm
                        destinations={data.destinations}
                        onRequestCreated={fetchData}
                    />
                    <SettingsForm 
                        onSettingsUpdated={fetchData}
                    />
                </div>

                <section>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold uppercase tracking-tight">Estado de Vehículos</h2>
                        <span className="text-[10px] bg-black text-white px-2 py-1 uppercase">10 Unidades</span>
                    </div>
                    <VehicleGrid
                        vehicles={data.vehicles}
                        assignments={data.assignments}
                        destinations={data.destinations}
                        onReset={fetchData}
                    />
                </section>
            </main>

            <footer className="mt-20 border-t border-black pt-4 text-[10px] text-gray-400 uppercase tracking-widest text-center">
                Sistema de Gestión de Movilidad &copy; 2026
            </footer>
        </div>
    );
}

export default App;
