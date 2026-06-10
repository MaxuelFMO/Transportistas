import React, { useState } from 'react';

const RequestForm = ({ destinations, onRequestCreated }) => {
    const [destinationId, setDestinationId] = useState('');
    const [passengerCount, setPassengerCount] = useState(1);
    const [isTomorrow, setIsTomorrow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!destinationId) return;

        setLoading(true);
        try {
            const res = await fetch('/api/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    id_usuario: 1, 
                    id_destino: parseInt(destinationId),
                    programar_manana: isTomorrow,
                    pasajeros: passengerCount
                })
            });
            const data = await res.json();
            setMessage(data.message);
            onRequestCreated();
        } catch (error) {
            setMessage('Error al conectar con el servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto p-6 bg-white border border-black mb-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-xl font-bold mb-4 uppercase tracking-tighter">Solicitar Transporte</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <label className="block text-xs font-bold uppercase mb-1">Destino</label>
                        <select
                            value={destinationId}
                            onChange={(e) => setDestinationId(e.target.value)}
                            className="w-full border border-black p-2 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-black"
                        >
                            <option value="">Seleccione un destino</option>
                            {destinations.map(d => (
                                <option key={d.id_destino} value={d.id_destino}>{d.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase mb-1">Pasajeros</label>
                        <select
                            value={passengerCount}
                            onChange={(e) => setPassengerCount(parseInt(e.target.value))}
                            className="w-full border border-black p-2 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-black"
                        >
                            {[1, 2, 3, 4].map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-center justify-between p-2 border border-black bg-gray-50">
                    <span className="text-xs font-bold uppercase">Programar para Mañana</span>
                    <button
                        type="button"
                        onClick={() => setIsTomorrow(!isTomorrow)}
                        className={`w-12 h-6 border border-black flex items-center px-1 transition-colors ${isTomorrow ? 'bg-black' : 'bg-white'}`}
                    >
                        <div className={`w-4 h-4 border border-black transition-transform ${isTomorrow ? 'translate-x-5 bg-white' : 'translate-x-0 bg-black'}`} />
                    </button>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-black text-white p-2 text-xs font-bold uppercase hover:bg-gray-800 disabled:bg-gray-400 transition-colors border border-black"
                >
                    {loading ? 'Procesando...' : 'Enviar Solicitud'}
                </button>
            </form>
            {message && (
                <div className="mt-4 p-2 text-xs border border-black bg-gray-50 font-medium animate-in fade-in slide-in-from-top-1">
                    {message}
                </div>
            )}
        </div>
    );
};

export default RequestForm;
