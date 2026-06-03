import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { InventoryLog, InventoryLogItem } from '../types';
import { format } from 'date-fns';
import { Plus, Activity, AlertTriangle, Trash2, ArrowDown } from 'lucide-react';

export default function InventarioVivos() {
  const { userProfile } = useAuth();
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<{
    type: 'INGRESO' | 'MORTALIDAD';
    notes: string;
    items: InventoryLogItem[];
  }>({
    type: 'INGRESO',
    notes: '',
    items: [{ plantel: 'EVP-01', ubicacion: 'Galpón 01', hembras: 0, machos: 0, precioCosto: 0, cantidad: 0 }]
  });

  useEffect(() => {
    const q = query(
      collection(db, 'inventoryLogs'),
      where('animalType', '==', 'POLLO_VIVO'),
      orderBy('date', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryLog)));
    });
    return unsub;
  }, []);

  const openModal = (type: 'INGRESO' | 'MORTALIDAD') => {
      setFormData({
          type,
          notes: '',
          items: [{ plantel: 'EVP-01', ubicacion: 'Galpón 01', hembras: 0, machos: 0, precioCosto: 0, cantidad: 0 }]
      });
      setShowModal(true);
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { plantel: 'EVP-01', ubicacion: 'Galpón 01', hembras: 0, machos: 0, precioCosto: 0, cantidad: 0 }]
    });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index: number, field: keyof InventoryLogItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || formData.items.length === 0) return;
    
    let totalQuantity = 0;
    if (formData.type === 'INGRESO') {
      totalQuantity = formData.items.reduce((acc, item) => acc + ((item.hembras || 0) + (item.machos || 0)), 0);
    } else {
      totalQuantity = formData.items.reduce((acc, item) => acc + (item.cantidad || 0), 0);
    }

    if (totalQuantity <= 0) {
        alert('La cantidad total debe ser mayor a 0');
        return;
    }

    try {
      await addDoc(collection(db, 'inventoryLogs'), {
        type: formData.type, // 'MORTALIDAD' deducts structurally in reports
        animalType: 'POLLO_VIVO',
        date: Date.now(),
        quantity: totalQuantity,
        items: formData.items,
        notes: formData.notes,
        createdAt: Date.now(),
        createdBy: userProfile.id
      });
      setShowModal(false);
    } catch (err: any) {
      console.error(err);
      alert('Error al registrar inventario: ' + err.message);
    }
  };

  const totalIngresos = logs.filter(l => l.type === 'INGRESO').reduce((acc, curr) => acc + curr.quantity, 0);
  const totalMortalidad = logs.filter(l => l.type === 'MORTALIDAD').reduce((acc, curr) => acc + curr.quantity, 0);
  const totalDisponible = totalIngresos - totalMortalidad;

  const handleDelete = async (logId: string) => {
      if (confirm('¿Está seguro de eliminar este registro permanentemente?')) {
          try {
              await deleteDoc(doc(db, 'inventoryLogs', logId));
          } catch(err) {
              alert('Error al eliminar');
          }
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventario de Pollos Vivos</h1>
          <p className="text-slate-400">Gestión de traslados a granja y mortalidad.</p>
        </div>
        <div className="flex gap-3">
            <button onClick={() => openModal('MORTALIDAD')} className="flex items-center space-x-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-5 py-2.5 rounded-2xl font-bold transition-all">
                <ArrowDown className="w-5 h-5" /><span>Informar Mortalidad</span>
            </button>
            <button onClick={() => openModal('INGRESO')} className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-white px-5 py-2.5 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/20">
                <Plus className="w-5 h-5" /><span>Registrar Ingreso</span>
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl flex items-center space-x-4">
          <div className="bg-indigo-500/20 p-4 rounded-2xl border border-indigo-500/20">
            <Activity className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Aves Disponibles</p>
            <p className="text-3xl font-bold text-white">{totalDisponible.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl flex items-center space-x-4">
          <div className="bg-emerald-500/20 p-4 rounded-2xl border border-emerald-500/20">
            <Activity className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Total Aves Ingresadas</p>
            <p className="text-3xl font-bold text-white">{totalIngresos.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl flex items-center space-x-4">
          <div className="bg-red-500/20 p-4 rounded-2xl border border-red-500/20">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Mortalidad / Bajas</p>
            <p className="text-3xl font-bold text-white">{totalMortalidad.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Fecha</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Tipo</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Detalle</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Cantidad Neta</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Notas</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {logs.map(log => (
              <tr key={log.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-slate-300">{format(log.date, 'dd/MM/yyyy HH:mm')}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 inline-flex text-[10px] uppercase tracking-wider font-bold rounded-full ${
                    log.type === 'INGRESO' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20' : 'bg-red-500/20 text-red-300 border border-red-500/20'
                  }`}>
                    {log.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-300 text-xs">
                    {log.items?.map((item, idx) => (
                        <div key={idx} className="mb-1">
                            <span className={`font-bold ${log.type === 'INGRESO' ? 'text-indigo-300' : 'text-red-300'}`}>{item.plantel} - {item.ubicacion}:</span>{' '}
                            {log.type === 'INGRESO' ? (
                                `Hembras: ${item.hembras} | Machos: ${item.machos} | Costo Unit: S/ ${item.precioCosto}`
                            ) : (
                                `Bajas / Mortalidad: ${item.cantidad} aves`
                            )}
                        </div>
                    ))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-white">{log.quantity.toLocaleString()}</td>
                <td className="px-6 py-4 text-slate-300 text-sm truncate max-w-xs">{log.notes || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                   <button onClick={() => handleDelete(log.id)} title="Eliminar" className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                       <Trash2 className="w-4 h-4"/>
                   </button>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                  No hay registros de inventario.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto pt-10 pb-20">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl w-full max-w-4xl p-6 relative">
            <h2 className="text-xl font-bold text-white mb-6">
                {formData.type === 'INGRESO' ? 'Nuevo Ingreso a Granja' : 'Informar Mortalidad (Bajas)'} - Pollos Vivos
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-300 mb-1">Notas (Opcional)</label>
                    <input 
                    type="text" 
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 backdrop-blur-md text-white transition-all"
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    placeholder="Detalles adicionales..."
                    />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider">Detalle del {formData.type}</h3>
                    <button type="button" onClick={handleAddItem} className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                        <Plus className="w-4 h-4"/> Añadir Galpón
                    </button>
                </div>

                {formData.items.map((item, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-wrap gap-4 items-end relative">
                        <div className="absolute top-4 right-4">
                           {formData.items.length > 1 && (
                               <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-400 hover:text-red-300">
                                   <Trash2 className="w-5 h-5"/>
                               </button>
                           )}
                        </div>
                        
                        <div className="w-40">
                            <label className="block text-xs font-medium text-slate-400 mb-1">Plantel</label>
                            <select 
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 backdrop-blur-md text-white transition-all appearance-none"
                            value={item.plantel}
                            onChange={e => handleItemChange(idx, 'plantel', e.target.value)}
                            >
                                {['EVP-01', 'EVP-02'].map(p => (
                                    <option key={p} value={p} className="bg-slate-800">{p}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="w-48">
                            <label className="block text-xs font-medium text-slate-400 mb-1">Galpón</label>
                            <select 
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 backdrop-blur-md text-white transition-all appearance-none"
                            value={item.ubicacion}
                            onChange={e => handleItemChange(idx, 'ubicacion', e.target.value)}
                            >
                                {['Galpón 01', 'Galpón 02', 'Galpón 03', 'Galpón 04'].map(inc => (
                                    <option key={inc} value={inc} className="bg-slate-800">{inc}</option>
                                ))}
                            </select>
                        </div>

                        {formData.type === 'INGRESO' ? (
                            <>
                                <div className="flex-1 min-w-[120px]">
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Pollos Hembras</label>
                                    <input 
                                    type="number" min="0" required
                                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 text-white"
                                    value={item.hembras || ''}
                                    onChange={e => handleItemChange(idx, 'hembras', Number(e.target.value))}
                                    />
                                </div>
                                <div className="flex-1 min-w-[120px]">
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Pollos Machos</label>
                                    <input 
                                    type="number" min="0" required
                                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 ring-emerald-500/50 text-white"
                                    value={item.machos || ''}
                                    onChange={e => handleItemChange(idx, 'machos', Number(e.target.value))}
                                    />
                                </div>
                                <div className="flex-1 min-w-[120px]">
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Costo Unit (S/)</label>
                                    <input 
                                    type="number" min="0" step="0.01" required
                                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 text-white"
                                    value={item.precioCosto || ''}
                                    onChange={e => handleItemChange(idx, 'precioCosto', Number(e.target.value))}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 min-w-[120px]">
                                <label className="block text-xs font-medium text-slate-400 mb-1">Aves Muertas / Bajas</label>
                                <input 
                                type="number" min="1" required
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 ring-red-500/50 text-white"
                                value={item.cantidad || ''}
                                onChange={e => handleItemChange(idx, 'cantidad', Number(e.target.value))}
                                />
                            </div>
                        )}
                    </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all">Cancelar</button>
                <button type="submit" className={`px-5 py-2.5 text-sm font-bold text-white ${formData.type === 'INGRESO' ? 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20' : 'bg-red-500 hover:bg-red-400 shadow-red-500/20'} rounded-2xl transition-all shadow-lg`}>
                    Confirmar {formData.type === 'INGRESO' ? 'Ingreso' : 'Mortalidad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
