import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Client } from '../types';
import { Search, Plus, UserCircle2 } from 'lucide-react';

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ documentType: 'DNI', documentNumber: '', name: '', address: '', phone: '' });
  const [loadingSearch, setLoadingSearch] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'clients'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
    });
    return () => unsub();
  }, []);

  // Simula consulta a SUNAT
  const searchSunat = () => {
    if (formData.documentNumber.length < 8) return;
    setLoadingSearch(true);
    setTimeout(() => {
      if (formData.documentType === 'DNI') {
        setFormData(prev => ({ ...prev, name: 'JUAN PEREZ SIMULADO', address: 'Av. Las Palmas 123' }));
      } else {
        setFormData(prev => ({ ...prev, name: 'EMPRESA EJEMPLO S.A.C.', address: 'Jr. Comercio 456, Ucayali' }));
      }
      setLoadingSearch(false);
    }, 1000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'clients'), {
        ...formData,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      setShowModal(false);
      setFormData({ documentType: 'DNI', documentNumber: '', name: '', address: '', phone: '' });
    } catch (error) {
      console.error("Error al guardar cliente:", error);
      alert("Error al guardar el cliente");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Directorio de Clientes</h1>
          <p className="text-slate-400">Gestione sus clientes de ventas.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 bg-indigo-500 hover:bg-indigo-400 text-white px-5 py-2.5 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Documento</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Razón Social / Nombre</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Dirección</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Teléfono</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {clients.map(client => (
                <tr key={client.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                    <span className="font-medium text-white">{client.documentType}:</span> {client.documentNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-white">
                    {client.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                    {client.address || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                    {client.phone || '-'}
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                    <UserCircle2 className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                    No hay clientes registrados aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg p-6 flex flex-col">
            <h2 className="text-xl font-bold mb-4 text-white">Registrar Nuevo Cliente</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex gap-4">
                <div className="w-1/3">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Tipo</label>
                  <select
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm flex items-center focus:outline-none focus:ring-2 ring-indigo-500/50 backdrop-blur-md text-white transition-all appearance-none"
                    value={formData.documentType}
                    onChange={(e) => setFormData(prev => ({ ...prev, documentType: e.target.value as any }))}
                  >
                    <option value="DNI" className="bg-slate-800 text-white">DNI</option>
                    <option value="RUC" className="bg-slate-800 text-white">RUC</option>
                  </select>
                </div>
                <div className="w-2/3">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Número de Documento</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 backdrop-blur-md text-white transition-all"
                      value={formData.documentNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, documentNumber: e.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={searchSunat}
                      className="bg-indigo-500 hover:bg-indigo-400 px-4 py-3 rounded-xl text-white transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center outline-none"
                      title="Consultar RENIEC/SUNAT"
                    >
                      {loadingSearch ? <span className="animate-spin w-5 h-5 border-2 border-white/20 border-t-white rounded-full" /> : <Search className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Razón Social / Nombres</label>
                <input
                  type="text"
                  required
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 backdrop-blur-md text-white transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Dirección</label>
                <input
                  type="text"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 backdrop-blur-md text-white transition-all"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Teléfono (Opcional)</label>
                <input
                  type="text"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 backdrop-blur-md text-white transition-all"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-500 hover:bg-indigo-400 rounded-2xl transition-all shadow-lg shadow-indigo-500/20"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
