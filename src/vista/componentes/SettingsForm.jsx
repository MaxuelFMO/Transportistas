import React, { useState, useEffect } from 'react';

const SettingsForm = ({ onSettingsUpdated }) => {
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            setStartTime(data.start_time);
            setEndTime(data.end_time);
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ start_time: startTime, end_time: endTime })
            });
            const data = await res.json();
            setMessage(data.message);
            if (onSettingsUpdated) onSettingsUpdated();
        } catch (error) {
            setMessage('Error al actualizar configuración');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto p-6 bg-white border border-black mb-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-xl font-bold mb-4 uppercase tracking-tighter">Personalizar Horario</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold uppercase mb-1">Hora Inicio</label>
                        <input 
                            type="time" 
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full border border-black p-2 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-black"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase mb-1">Hora Fin</label>
                        <input 
                            type="time" 
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full border border-black p-2 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-black"
                        />
                    </div>
                </div>
                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-black text-white p-2 text-xs font-bold uppercase hover:bg-gray-800 disabled:bg-gray-400 transition-colors border border-black"
                >
                    {loading ? 'Guardando...' : 'Actualizar Horario'}
                </button>
            </form>
            {message && (
                <div className="mt-4 p-2 text-xs border border-black bg-gray-50 font-medium">
                    {message}
                </div>
            )}
        </div>
    );
};

export default SettingsForm;
