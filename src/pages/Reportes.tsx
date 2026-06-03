import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { InventoryLog, Sale } from '../types';
import { format } from 'date-fns';
import { Activity, Egg, Bird, AlertCircle, FileText, DollarSign, TrendingUp, Download, LayoutDashboard, Database, ShoppingCart } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Reportes() {
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'INVENTARIO' | 'VENTAS'>('GENERAL');

  useEffect(() => {
    const unsubLogs = onSnapshot(query(collection(db, 'inventoryLogs'), orderBy('date', 'desc')), (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryLog)));
    });
    
    const unsubSales = onSnapshot(query(collection(db, 'sales'), orderBy('date', 'desc')), (snap) => {
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale)));
    });

    return () => {
        unsubLogs();
        unsubSales();
    };
  }, []);

  const totalBB = logs.filter(l => l.animalType === 'POLLO_BB' && l.type === 'INGRESO').reduce((a, b) => a + b.quantity, 0)
    - logs.filter(l => l.animalType === 'POLLO_BB' && l.type === 'MORTALIDAD').reduce((a, b) => a + b.quantity, 0);

  const totalVivos = logs.filter(l => l.animalType === 'POLLO_VIVO' && l.type === 'INGRESO').reduce((a, b) => a + b.quantity, 0)
    - logs.filter(l => l.animalType === 'POLLO_VIVO' && l.type === 'MORTALIDAD').reduce((a, b) => a + b.quantity, 0);

  // Calcular la inversión/Costo
  let totalInversionBB = 0;
  let totalInversionVivos = 0;

  logs.forEach(log => {
      if (log.type === 'INGRESO' && log.items) {
          log.items.forEach(item => {
              if (log.animalType === 'POLLO_BB') {
                  const cant = (item.pollosNacidos || 0) + (item.huevosIngresados || 0);
                  totalInversionBB += cant * (item.precioCosto || 0);
              } else if (log.animalType === 'POLLO_VIVO') {
                  const cant = (item.hembras || 0) + (item.machos || 0);
                  totalInversionVivos += cant * (item.precioCosto || 0);
              }
          });
      }
  });

  const totalVentasTotales = sales.reduce((a, b) => a + b.total, 0);
  const totalInversionGlobal = totalInversionBB + totalInversionVivos;
  const utilidadGeneral = totalVentasTotales - totalInversionGlobal;

  const generateReportInfo = () => {
      const doc = new jsPDF();
      
      doc.setFontSize(22);
      doc.setTextColor('#4f46e5');
      doc.text('CORPORING', 105, 20, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setTextColor('#333333');
      doc.text('REPORTE GERENCIAL CONSOLIDADO', 105, 30, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor('#666666');
      doc.text(`Fecha de Emisión: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 45);

      let currentY = 55;

      // Seccion Resumen Financiero
      doc.setFontSize(12);
      doc.setTextColor('#4f46e5');
      doc.text('RESUMEN FINANCIERO GLOBAL', 14, currentY);
      currentY += 10;
      
      autoTable(doc, {
          startY: currentY,
          head: [['Concepto', 'Monto']],
          body: [
              ['Costo / Inversión (Compras y Nacimientos)', `S/ ${totalInversionGlobal.toLocaleString(undefined, {minimumFractionDigits: 2})}`],
              ['Total Recaudado (Ventas)', `S/ ${totalVentasTotales.toLocaleString(undefined, {minimumFractionDigits: 2})}`],
              ['Utilidad Bruta General', `S/ ${utilidadGeneral.toLocaleString(undefined, {minimumFractionDigits: 2})}`]
          ],
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229] }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;

      // Seccion Planta / Incubacion
      doc.setFontSize(12);
      doc.setTextColor('#4f46e5');
      doc.text('ESTADO: PLANTA DE INCUBACIÓN (POLLO BEBÉ)', 14, currentY);
      currentY += 10;

      const ingresosBB = logs.filter(l => l.animalType === 'POLLO_BB' && l.type === 'INGRESO').reduce((a, b) => a + b.quantity, 0);
      const mortBB = logs.filter(l => l.animalType === 'POLLO_BB' && l.type === 'MORTALIDAD').reduce((a, b) => a + b.quantity, 0);
      const ventasBB = sales.filter(s => s.animalType === 'POLLO_BB').reduce((a, b) => a + b.quantity, 0);
      const ventasBBSoles = sales.filter(s => s.animalType === 'POLLO_BB').reduce((acc, curr) => acc + curr.total, 0);

      autoTable(doc, {
          startY: currentY,
          head: [['Indicador', 'Cantidad', 'Importe']],
          body: [
              ['Histórico Ingresados / Nacidos', `${ingresosBB.toLocaleString()} aves`, `S/ ${totalInversionBB.toLocaleString(undefined, {minimumFractionDigits: 2})}`],
              ['Mortalidad / Bajas (-)', `${mortBB.toLocaleString()} aves`, '-'],
              ['Ventas Realizadas (-)', `${ventasBB.toLocaleString()} aves`, `S/ ${ventasBBSoles.toLocaleString(undefined, {minimumFractionDigits: 2})}`],
              ['Activo Físico Disponible (=)', `${totalBB.toLocaleString()} aves`, '-'],
          ],
          theme: 'grid',
          headStyles: { fillColor: [16, 185, 129] }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;

      // Seccion Granja / Vivos
      doc.setFontSize(12);
      doc.setTextColor('#4f46e5');
      doc.text('ESTADO: GRANJA (POLLO VIVO)', 14, currentY);
      currentY += 10;

      const ingresosVivo = logs.filter(l => l.animalType === 'POLLO_VIVO' && l.type === 'INGRESO').reduce((a, b) => a + b.quantity, 0);
      const mortVivo = logs.filter(l => l.animalType === 'POLLO_VIVO' && l.type === 'MORTALIDAD').reduce((a, b) => a + b.quantity, 0);
      const ventasVivo = sales.filter(s => s.animalType === 'POLLO_VIVO').reduce((a, b) => a + b.quantity, 0);
      const ventasVivoSoles = sales.filter(s => s.animalType === 'POLLO_VIVO').reduce((acc, curr) => acc + curr.total, 0);

      autoTable(doc, {
          startY: currentY,
          head: [['Indicador', 'Cantidad', 'Importe']],
          body: [
              ['Histórico Recepcionados', `${ingresosVivo.toLocaleString()} aves`, `S/ ${totalInversionVivos.toLocaleString(undefined, {minimumFractionDigits: 2})}`],
              ['Mortalidad / Bajas (-)', `${mortVivo.toLocaleString()} aves`, '-'],
              ['Ventas Realizadas (-)', `${ventasVivo.toLocaleString()} aves`, `S/ ${ventasVivoSoles.toLocaleString(undefined, {minimumFractionDigits: 2})}`],
              ['Activo Físico Disponible (=)', `${totalVivos.toLocaleString()} aves`, '-'],
          ],
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] }
      });

      doc.save('Reporte_Gerencial_Corporing.pdf');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center sm:flex-row flex-col gap-4 text-center sm:text-left">
        <div>
          <h1 className="text-2xl font-bold text-white">Reporte Consolidado</h1>
          <p className="text-slate-400">Resumen y trazabilidad de ingresos, mortalidad y utilidades del negocio.</p>
        </div>
        <button onClick={generateReportInfo} className="flex items-center space-x-2 bg-indigo-500 hover:bg-indigo-400 text-white px-5 py-2.5 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20">
           <Download className="w-5 h-5" /><span>Descargar Reporte Gerencial PDF</span>
        </button>
      </div>

      <div className="flex space-x-2 bg-white/5 p-1 rounded-2xl border border-white/10 w-fit">
        <button 
          onClick={() => setActiveTab('GENERAL')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'GENERAL' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
        >
          <LayoutDashboard className="w-4 h-4" /><span>General</span>
        </button>
        <button 
          onClick={() => setActiveTab('INVENTARIO')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'INVENTARIO' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
        >
          <Database className="w-4 h-4" /><span>Inventario</span>
        </button>
        <button 
          onClick={() => setActiveTab('VENTAS')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'VENTAS' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
        >
          <ShoppingCart className="w-4 h-4" /><span>Ventas</span>
        </button>
      </div>

      {activeTab === 'GENERAL' && (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl flex items-center space-x-4 relative overflow-hidden">
            <div className="bg-blue-500/20 p-4 rounded-2xl border border-blue-500/20">
                <DollarSign className="w-8 h-8 text-blue-400" />
            </div>
            <div>
                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Costo / Inversión</p>
                <p className="text-3xl font-bold text-white">S/ {totalInversionGlobal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl flex items-center space-x-4 relative overflow-hidden">
            <div className="bg-emerald-500/20 p-4 rounded-2xl border border-emerald-500/20">
                <TrendingUp className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Total Recaudado (Ventas)</p>
                <p className="text-3xl font-bold text-white">S/ {totalVentasTotales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl flex items-center space-x-4 relative overflow-hidden">
            <div className={`${utilidadGeneral >= 0 ? 'bg-indigo-500/20 border-indigo-500/20 text-indigo-400' : 'bg-red-500/20 border-red-500/20 text-red-400'} p-4 rounded-2xl border`}>
                <Activity className="w-8 h-8" />
            </div>
            <div>
                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Utilidad General</p>
                <p className={`text-3xl font-bold ${utilidadGeneral >= 0 ? 'text-indigo-300' : 'text-red-400'}`}>S/ {utilidadGeneral.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl flex items-center space-x-4 relative overflow-hidden">
            <div className="bg-indigo-500/20 p-4 rounded-2xl border border-indigo-500/20">
                <Egg className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Activo Incubación</p>
                <p className="text-xl font-bold text-white">{totalBB.toLocaleString()} aves <span className="text-xs font-normal text-slate-500 block">Inv: S/ {totalInversionBB.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
            </div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl flex items-center space-x-4 relative overflow-hidden">
            <div className="bg-blue-500/20 p-4 rounded-2xl border border-blue-500/20">
                <Bird className="w-8 h-8 text-blue-400" />
            </div>
            <div>
                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Activo en Granja</p>
                <p className="text-xl font-bold text-white">{totalVivos.toLocaleString()} aves <span className="text-xs font-normal text-slate-500 block">Inv: S/ {totalInversionVivos.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
            </div>
            </div>
        </div>
      </div>
      )}

      {activeTab === 'INVENTARIO' && (
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden mt-8">
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <FileText className="w-5 h-5 text-indigo-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-indigo-300">Historial Detallado - Bitácora de Inventario</h2>
        </div>
        
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/5">
                <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">División</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Cantidad Aves</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Costo Asociado</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
                {logs.map(log => {
                    let logCost = 0;
                    if (log.type === 'INGRESO' && log.items) {
                        log.items.forEach(item => {
                            if (log.animalType === 'POLLO_BB') {
                                logCost += ((item.pollosNacidos || 0) + (item.huevosIngresados || 0)) * (item.precioCosto || 0);
                            } else {
                                logCost += ((item.hembras || 0) + (item.machos || 0)) * (item.precioCosto || 0);
                            }
                        })
                    }

                    return (
                        <tr key={log.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-slate-300">{format(log.date, 'dd/MM/yyyy HH:mm')}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-[10px] uppercase tracking-wider font-bold rounded-full ${
                                log.animalType === 'POLLO_BB' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/20' : 'bg-blue-500/20 text-blue-300 border border-blue-500/20'
                            }`}>
                                {log.animalType === 'POLLO_BB' ? 'Incubación' : 'Granja'}
                            </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-[10px] uppercase tracking-wider font-bold rounded-full ${
                                log.type === 'INGRESO' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20' : 'bg-red-500/20 text-red-300 border border-red-500/20'
                            }`}>
                                {log.type}
                            </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-white">{log.quantity.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                                {logCost > 0 ? `S/ ${logCost.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-'}
                            </td>
                        </tr>
                    )
                })}
                {logs.length === 0 && (
                <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                    No hay movimientos registrados.
                    </td>
                </tr>
                )}
            </tbody>
            </table>
        </div>
      </div>
      )}

      {activeTab === 'VENTAS' && (
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden mt-8">
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <ShoppingCart className="w-5 h-5 text-indigo-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-indigo-300">Resumen Detallado - Ventas Historicas</h2>
        </div>
        
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/5">
                <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">División</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Cantidad</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Soles Recaudados</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
                {sales.map(sale => (
                    <tr key={sale.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-slate-300">{format(sale.date, 'dd/MM/yyyy HH:mm')}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-white font-medium">{sale.client}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 inline-flex text-[10px] uppercase tracking-wider font-bold rounded-full w-max ${
                                sale.animalType === 'POLLO_BB' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-blue-500/20 text-blue-300'
                            }`}>
                                {sale.animalType === 'POLLO_BB' ? 'Pollo Bebé' : 'Pollo Vivo'}
                            </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-300">{sale.quantity.toLocaleString()} aves</td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-emerald-300">S/ {sale.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    </tr>
                ))}
                {sales.length === 0 && (
                <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                    No hay ventas registradas.
                    </td>
                </tr>
                )}
            </tbody>
            </table>
        </div>
      </div>
      )}
    </div>
  );
}
