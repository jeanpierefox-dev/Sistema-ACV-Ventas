import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DispatchOrder } from '../types';
import { PackageOpen, Activity, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function DashboardHome() {
  const [recentOrders, setRecentOrders] = useState<DispatchOrder[]>([]);
  const [stats, setStats] = useState({
    totalBb: 0,
    totalVivos: 0,
  });

  useEffect(() => {
    // Escuchar ultimas ordenes
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(10));
    const unsub = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DispatchOrder));
      setRecentOrders(orders);
      
      let bb = 0;
      let vivos = 0;
      orders.forEach(o => {
        if (o.type === 'POLLO_BB') bb += o.totalQuantity;
        if (o.type === 'POLLO_VIVO') vivos += o.totalQuantity;
      });
      setStats({ totalBb: bb, totalVivos: vivos });
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel de Control</h1>
        <p className="text-slate-400">Resumen de la actividad comercial reciente.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl flex items-center space-x-4">
          <div className="bg-indigo-500/20 p-4 rounded-2xl border border-indigo-500/20">
            <PackageOpen className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Pollos Bebés Vendidos</p>
            <p className="text-3xl font-bold text-white">{stats.totalBb.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl flex items-center space-x-4">
          <div className="bg-blue-500/20 p-4 rounded-2xl border border-blue-500/20">
            <Activity className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Pollos Vivos Vendidos</p>
            <p className="text-3xl font-bold text-white">{stats.totalVivos.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-indigo-300">Últimas Órdenes de Despacho</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Cantidad Aves</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                    No hay registros de ventas recientes.
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                      {format(order.date, 'dd MMM yyyy - HH:mm', { locale: es })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-[10px] uppercase tracking-wider font-bold rounded-full ${
                        order.type === 'POLLO_BB' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/20' : 'bg-blue-500/20 text-blue-300 border border-blue-500/20'
                      }`}>
                        {order.type === 'POLLO_BB' ? 'Pollo BB' : 'Pollo Vivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-white">
                      {order.clientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-300 font-mono">
                      {order.totalQuantity.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-[10px] uppercase tracking-wider font-bold rounded-full ${
                        order.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20' :
                        order.status === 'CANCELLED' ? 'bg-red-500/20 text-red-300 border border-red-500/20' :
                        'bg-yellow-500/20 text-yellow-300 border border-yellow-500/20'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
