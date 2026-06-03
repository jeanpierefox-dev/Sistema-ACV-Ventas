import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DispatchOrder, Client } from '../types';
import { useAuth } from '../context/AuthContext';
import { Plus, Printer } from 'lucide-react';
import { format } from 'date-fns';

export default function PollosBebes() {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    clientId: '',
    plateNumber: '',
  });

  const [items, setItems] = useState([
    { incubadora: '01', cajas: 0, avesPorCaja: 100, sexo: 'H', tipo: 'B' }
  ]);

  useEffect(() => {
    const q = query(collection(db, 'orders'), where('type', '==', 'POLLO_BB'));
    const unsub = onSnapshot(q, snap => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as DispatchOrder))));
    const qc = query(collection(db, 'clients'));
    const unsubc = onSnapshot(qc, snap => setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client))));
    return () => { unsub(); unsubc() };
  }, []);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId) return alert("Seleccione un cliente");
    
    const client = clients.find(c => c.id === formData.clientId);
    const totalAves = items.reduce((acc, it) => acc + (it.cajas * it.avesPorCaja), 0);
    const totalCajas = items.reduce((acc, it) => acc + Number(it.cajas), 0);

    const docData = {
      type: 'POLLO_BB',
      serialNumber: `OBB-${Date.now().toString().slice(-6)}`,
      clientId: client?.id,
      clientName: client?.name,
      plateNumber: formData.plateNumber,
      date: Date.now(),
      status: 'PENDING',
      incubatorDetails: items.map(it => ({
        ...it,
        cantidad: it.cajas * it.avesPorCaja
      })),
      totalQuantity: totalAves,
      totalBoxesOrCrates: totalCajas,
      createdAt: Date.now(),
      createdBy: currentUser?.uid || 'UNKNOWN'
    };

    try {
      await addDoc(collection(db, 'orders'), docData);
      setShowModal(false);
      setFormData({ clientId: '', plateNumber: '' });
      setItems([{ incubadora: '01', cajas: 0, avesPorCaja: 100, sexo: 'H', tipo: 'B' }]);
    } catch (e) {
      console.error(e);
      alert("Error al generar orden");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Despacho de Pollos BB</h1>
          <p className="text-slate-400">Gestión de planta de incubación y despachos.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center space-x-2 bg-indigo-500 hover:bg-indigo-400 text-white px-5 py-2.5 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20">
          <Plus className="w-5 h-5" /><span>Nueva Orden OPB</span>
        </button>
      </div>

      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Orden</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Fecha</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Cliente</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Total Aves</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-indigo-300 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {orders.map(o => (
              <tr key={o.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-white">{o.serialNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-slate-300">{format(o.date, 'dd/MM/yyyy HH:mm')}</td>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-white">{o.clientName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-slate-300">{o.totalQuantity.toLocaleString()} ({o.totalBoxesOrCrates} cajas)</td>
                <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                  <button className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-colors border border-white/10"><Printer className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                  No hay órdenes generadas aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-white/10 bg-white/5 rounded-t-3xl text-left">
              <h2 className="text-xl font-bold text-white">Orden Despacho de Pollo BB</h2>
            </div>
            
            <form onSubmit={handleCreateOrder} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Cliente</label>
                  <select required className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 backdrop-blur-md text-white transition-all appearance-none" value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})}>
                    <option value="" className="bg-slate-800 text-slate-300">Seleccione cliente...</option>
                    {clients.map(c => <option key={c.id} value={c.id} className="bg-slate-800 text-white">{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Nro Placa</label>
                  <input type="text" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 backdrop-blur-md text-white transition-all" value={formData.plateNumber} onChange={e => setFormData({...formData, plateNumber: e.target.value})} />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold border-b border-white/10 text-indigo-300 uppercase tracking-wider pb-2 mb-4">Detalle de Incubación</h3>
                <div className="space-y-3">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-white/5 p-3 rounded-2xl border border-white/10 shadow-sm">
                      <select className="bg-white/10 border border-white/20 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 text-white appearance-none w-28" value={it.incubadora} onChange={e => { const ni = [...items]; ni[idx].incubadora = e.target.value; setItems(ni); }}>
                        <option value="01" className="bg-slate-800 text-white">Incub. 01</option>
                        <option value="02" className="bg-slate-800 text-white">Incub. 02</option>
                        <option value="03" className="bg-slate-800 text-white">Incub. 03</option>
                        <option value="04" className="bg-slate-800 text-white">Incub. 04</option>
                        <option value="05" className="bg-slate-800 text-white">Incub. 05</option>
                        <option value="06" className="bg-slate-800 text-white">Incub. 06</option>
                      </select>
                      <input type="number" placeholder="Cajas" className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 text-white w-20 text-center" value={it.cajas || ''} onChange={e => { const ni = [...items]; ni[idx].cajas = Number(e.target.value); setItems(ni); }} />
                      <span className="text-xs font-bold text-slate-500">X</span>
                      <input type="number" placeholder="Aves/Caja" className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 text-white w-24 text-center" value={it.avesPorCaja || ''} onChange={e => { const ni = [...items]; ni[idx].avesPorCaja = Number(e.target.value); setItems(ni); }} />
                      <span className="text-xs font-bold w-14 text-center text-indigo-300">={(it.cajas * it.avesPorCaja).toLocaleString()}</span>
                      
                      <select className="bg-white/10 border border-white/20 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 text-white appearance-none w-16 text-center" value={it.sexo} onChange={e => { const ni = [...items]; ni[idx].sexo = e.target.value as any; setItems(ni); }}>
                        <option value="M" className="bg-slate-800 text-white">M</option>
                        <option value="H" className="bg-slate-800 text-white">H</option>
                      </select>
                    </div>
                  ))}
                  <button type="button" onClick={() => setItems([...items, { incubadora: '01', cajas: 0, avesPorCaja: 100, sexo: 'H', tipo: 'B' }])} className="text-indigo-400 text-sm font-bold hover:text-indigo-300 transition-colors mt-2 flex items-center gap-1"><Plus className="w-4 h-4"/> Agregar Fila</button>
                </div>
              </div>
            </form>
            
            <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end gap-3 rounded-b-3xl mt-auto">
              <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all">Cancelar</button>
              <button onClick={handleCreateOrder} className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-500 hover:bg-indigo-400 rounded-2xl transition-all shadow-lg shadow-indigo-500/20">Generar OPB y Documentos</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
