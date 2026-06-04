import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DispatchOrder, Client } from '../types';
import { useAuth } from '../context/AuthContext';
import { Plus, Printer, CheckCircle, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function PollosVivos() {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<DispatchOrder | null>(null);
  
  const [formData, setFormData] = useState({
    clientId: '',
    plateNumber: '',
    hInicio: '',
    hFinal: '',
    observaciones: '',
    associatedSaleDocument: '',
  });

  const [items, setItems] = useState([
    { plantel: 'EVP-01', galpon: '01', jabas: 0, avesPorJaba: 0, tipoPollo: 'BRASA' as any, sexo: 'M' as any, pesoPromedio: 0 }
  ]);

  useEffect(() => {
    const q = query(collection(db, 'orders'), where('type', '==', 'POLLO_VIVO'));
    const unsub = onSnapshot(q, snap => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as DispatchOrder))));
    
    const qc = query(collection(db, 'clients'));
    const unsubc = onSnapshot(qc, snap => setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client))));

    return () => { unsub(); unsubc() };
  }, []);

  const handleAddItem = () => {
    setItems([...items, { plantel: 'EVP-01', galpon: '01', jabas: 0, avesPorJaba: 0, tipoPollo: 'BRASA', sexo: 'M', pesoPromedio: 0 }]);
  };

  const handleOpenEdit = (order: DispatchOrder) => {
    setEditingOrder(order);
    setFormData({
      clientId: order.clientId,
      plateNumber: order.plateNumber || '',
      hInicio: '',
      hFinal: '',
      observaciones: '',
      associatedSaleDocument: order.associatedSaleDocument || '',
    });
    if (order.plantelDetails && order.plantelDetails.length > 0) {
      setItems(order.plantelDetails.map(it => ({
        ...it,
        tipoPollo: it.tipoPollo || 'BRASA'
      })));
    } else {
      setItems([{ plantel: 'EVP-01', galpon: '01', jabas: 0, avesPorJaba: 0, tipoPollo: 'BRASA', sexo: 'M', pesoPromedio: 0 }]);
    }
    setShowModal(true);
  };

  const handleOpenNew = () => {
    setEditingOrder(null);
    setFormData({ clientId: '', plateNumber: '', hInicio: '', hFinal: '', observaciones: '', associatedSaleDocument: '' });
    setItems([{ plantel: 'EVP-01', galpon: '01', jabas: 0, avesPorJaba: 0, tipoPollo: 'BRASA', sexo: 'M', pesoPromedio: 0 }]);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar esta orden de despacho?')) {
      try {
        await deleteDoc(doc(db, 'orders', id));
      } catch (e) {
        alert("Error al eliminar");
      }
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId) return alert("Seleccione un cliente");
    
    const client = clients.find(c => c.id === formData.clientId);
    const totalAves = items.reduce((acc, it) => acc + (it.jabas * it.avesPorJaba), 0);
    const totalJabas = items.reduce((acc, it) => acc + Number(it.jabas), 0);

    const baseData = {
      clientId: client?.id,
      clientName: client?.name,
      plateNumber: formData.plateNumber,
      associatedSaleDocument: formData.associatedSaleDocument,
      plantelDetails: items.map(it => ({
        ...it,
        cantidad: it.jabas * it.avesPorJaba
      })),
      totalQuantity: totalAves,
      totalBoxesOrCrates: totalJabas,
    };

    try {
      if (editingOrder) {
         await updateDoc(doc(db, 'orders', editingOrder.id), baseData);
      } else {
         const docData = {
           ...baseData,
           type: 'POLLO_VIVO',
           serialNumber: `OPV-${Date.now().toString().slice(-6)}`,
           date: Date.now(),
           status: 'PENDING',
           createdAt: Date.now(),
           createdBy: currentUser?.uid || 'UNKNOWN'
         };
         await addDoc(collection(db, 'orders'), docData);
      }
      setShowModal(false);
      setFormData({ clientId: '', plateNumber: '', hInicio: '', hFinal: '', observaciones: '', associatedSaleDocument: '' });
      setItems([{ plantel: 'EVP-01', galpon: '01', jabas: 0, avesPorJaba: 0, tipoPollo: 'BRASA', sexo: 'M', pesoPromedio: 0 }]);
      setEditingOrder(null);
    } catch (e) {
      console.error(e);
      alert("Error al generar orden");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Despacho de Pollos Vivos</h1>
          <p className="text-slate-400">Gestión de venta, pesaje y remisión de aves de granja.</p>
        </div>
        <button onClick={handleOpenNew} className="flex items-center space-x-2 bg-indigo-500 hover:bg-indigo-400 text-white px-5 py-2.5 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20">
          <Plus className="w-5 h-5" /><span>Nueva Orden</span>
        </button>
      </div>

      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Orden</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Fecha</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Doc. Venta</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Cliente</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Aves</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Detalle Operativo (Plantel, Galpón, Promedio)</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-indigo-300 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {orders.map(o => (
              <tr key={o.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-white">{o.serialNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-slate-300">{format(o.date, 'dd/MM/yyyy HH:mm')}</td>
                <td className="px-6 py-4 whitespace-nowrap text-slate-300">{o.associatedSaleDocument || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-white">{o.clientName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-slate-300">{o.totalQuantity.toLocaleString()} Und. ({o.totalBoxesOrCrates} jabas)</td>
                <td className="px-6 py-4 text-slate-400 text-xs">
                  {o.plantelDetails?.map((d, i) => (
                    <div key={i}>
                      {d.plantel} G:{d.galpon} | {d.jabas} jb x {d.avesPorJaba} av | Pm: {d.pesoPromedio} Kg
                    </div>
                  ))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                  <button onClick={() => handleOpenEdit(o)} className="text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 p-2 rounded-lg transition-colors" title="Editar"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(o.id)} className="text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/20 p-2 rounded-lg transition-colors" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                  <button className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-colors border border-white/10" title="Imprimir Despacho"><Printer className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                  No hay órdenes generadas aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-white/10 bg-white/5 rounded-t-3xl text-left">
              <h2 className="text-xl font-bold text-white">Orden Despacho de Aves - ACV</h2>
            </div>
            
            <form onSubmit={handleCreateOrder} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Cliente</label>
                  <select required className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 backdrop-blur-md text-white transition-all appearance-none" value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})}>
                    <option value="" className="bg-slate-800 text-slate-300">Seleccione cliente...</option>
                    {clients.map(c => <option key={c.id} value={c.id} className="bg-slate-800 text-white">{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Placa Camión</label>
                  <input type="text" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 backdrop-blur-md text-white transition-all" value={formData.plateNumber} onChange={e => setFormData({...formData, plateNumber: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Boleta / Factura</label>
                  <input type="text" placeholder="Ej: F001-000032" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 backdrop-blur-md text-white transition-all" value={formData.associatedSaleDocument} onChange={e => setFormData({...formData, associatedSaleDocument: e.target.value})} />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold border-b border-white/10 text-indigo-300 uppercase tracking-wider pb-2 mb-4">Detalle de Aves (Jabas x Ave)</h3>
                <div className="space-y-3">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-white/5 p-3 rounded-2xl border border-white/10 shadow-sm overflow-x-auto whitespace-nowrap scrollbar-hide">
                      <select className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 text-white appearance-none w-28" value={it.plantel} onChange={e => { const ni = [...items]; ni[idx].plantel = e.target.value; setItems(ni); }}>
                        <option value="EVP-01" className="bg-slate-800 text-white">EVP-01</option>
                        <option value="EVP-02" className="bg-slate-800 text-white">EVP-02</option>
                      </select>
                      <input type="text" placeholder="Galpon" className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 text-white w-20 text-center" value={it.galpon} onChange={e => { const ni = [...items]; ni[idx].galpon = e.target.value; setItems(ni); }} />
                      <input type="number" placeholder="Jabas" className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 text-white w-20 text-center" value={it.jabas || ''} onChange={e => { const ni = [...items]; ni[idx].jabas = Number(e.target.value); setItems(ni); }} />
                      <span className="text-xs font-bold text-slate-500">X</span>
                      <input type="number" placeholder="Aves/Jaba" className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 text-white w-24 text-center" value={it.avesPorJaba || ''} onChange={e => { const ni = [...items]; ni[idx].avesPorJaba = Number(e.target.value); setItems(ni); }} />
                      <span className="text-xs font-bold w-16 text-center text-indigo-300">={(it.jabas * it.avesPorJaba).toLocaleString()}</span>
                      <select className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 text-white appearance-none w-28" value={it.tipoPollo} onChange={e => { const ni = [...items]; ni[idx].tipoPollo = e.target.value as any; setItems(ni); }}>
                        <option value="BRASA" className="bg-slate-800 text-white">Brasa</option>
                        <option value="PRESA" className="bg-slate-800 text-white">Presa</option>
                        <option value="TIPO" className="bg-slate-800 text-white">Tipo</option>
                      </select>
                      <select className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 text-white appearance-none w-16 text-center" value={it.sexo} onChange={e => { const ni = [...items]; ni[idx].sexo = e.target.value as any; setItems(ni); }}>
                        <option value="M" className="bg-slate-800 text-white">M</option>
                        <option value="H" className="bg-slate-800 text-white">H</option>
                      </select>
                      <input type="number" step="0.01" placeholder="Peso Prov." className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 text-white w-24 text-center" value={it.pesoPromedio || ''} onChange={e => { const ni = [...items]; ni[idx].pesoPromedio = Number(e.target.value); setItems(ni); }} />
                    </div>
                  ))}
                  <button type="button" onClick={handleAddItem} className="text-indigo-400 text-sm font-bold hover:text-indigo-300 transition-colors mt-2 flex items-center gap-1"><Plus className="w-4 h-4"/> Agregar Fila</button>
                </div>
              </div>
            </form>
            
            <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end gap-3 rounded-b-3xl mt-auto">
              <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all">Cancelar</button>
              <button onClick={handleCreateOrder} className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-500 hover:bg-indigo-400 rounded-2xl transition-all shadow-lg shadow-indigo-500/20">Generar Documentos</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
