import React from 'react';
import SeatIcon from './SeatIcon';

const VehicleGrid = ({ vehicles, assignments, destinations, onReset }) => {
    const handleReset = async (id_vehiculo) => {
        const fecha = new Date().toISOString().split('T')[0];
        try {
            await fetch('/api/vehicles/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_vehiculo, fecha })
            });
            if (onReset) onReset();
        } catch (error) {
            console.error('Error resetting vehicle:', error);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4">
            {vehicles.map((v) => {
                const vehicleAssignments = assignments.filter(a => a.id_vehiculo === v.id_vehiculo);
                const totalPassengers = vehicleAssignments.reduce((sum, a) => sum + (a.pasajeros || 0), 0);
                const seats = [1, 2, 3, 4];
                const isFull = totalPassengers >= 4;
                
                const destination = vehicleAssignments.length > 0 
                    ? destinations.find(d => d.id_destino === vehicleAssignments[0].id_destino)
                    : null;

                return (
                    <div key={v.id_vehiculo} className="border border-black p-4 flex flex-col items-center bg-white shadow-sm transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className="font-bold text-sm mb-1">{v.placa}</div>
                        <div className="text-[9px] font-bold text-gray-500 mb-2 uppercase tracking-tight">
                            {destination ? destination.nombre : 'Sin Destino'}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            {seats.map((s, index) => (
                                <SeatIcon key={index} index={index} occupied={index < totalPassengers} />
                            ))}
                        </div>
                        
                        <div className="w-full text-center">
                            <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">
                                {totalPassengers}/4 Ocupados
                            </div>
                            
                            {isFull ? (
                                <button
                                    onClick={() => handleReset(v.id_vehiculo)}
                                    className="w-full bg-black text-white py-1 px-2 text-[10px] font-bold uppercase hover:bg-gray-800 transition-colors border border-black"
                                >
                                    Habilitar de nuevo
                                </button>
                            ) : (
                                <div className="text-[10px] text-gray-300 font-bold py-1">DISPONIBLE</div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default VehicleGrid;
