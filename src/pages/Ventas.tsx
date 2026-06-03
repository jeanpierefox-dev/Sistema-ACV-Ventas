import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Sale } from '../types';
import { format } from 'date-fns';
import { DollarSign, Plus, Search, FileText, Trash2, Printer, FileDown, Truck, MoreVertical } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Ventas() {
  const { userProfile } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchingClient, setSearchingClient] = useState(false);
  const [formData, setFormData] = useState({
    animalType: 'POLLO_BB',
    documentType: 'BOLETA',
    documentNumber: '',
    client: '',
    clientAddress: '',
    quantity: 0,
    price: 0,
    sex: 'Mixto',
    tipoAve: 'Brasa',
    peso: 0,
    notes: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'sales'), orderBy('date', 'desc'));
    const unsubSales = onSnapshot(q, (snap) => {
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale)));
    });
    
    const qInv = query(collection(db, 'inventoryLogs'));
    const unsubInv = onSnapshot(qInv, (snap) => {
      setInventoryLogs(snap.docs.map(d => d.data()));
    });
    
    return () => { unsubSales(); unsubInv(); };
  }, []);

  const getProductStock = (type: 'POLLO_BB' | 'POLLO_VIVO') => {
      const typeLogs = inventoryLogs.filter(l => l.animalType === type);
      const totalIngresos = typeLogs.filter(l => l.type === 'INGRESO').reduce((a, b) => a + b.quantity, 0);
      const totalMortalidad = typeLogs.filter(l => l.type === 'MORTALIDAD').reduce((a, b) => a + b.quantity, 0);
      const ventsOfThisType = sales.filter(s => s.animalType === type).reduce((a, b) => a + b.quantity, 0);
      return totalIngresos - totalMortalidad - ventsOfThisType;
  };

  const searchClient = async () => {
    if (!formData.documentNumber) return;
    setSearchingClient(true);
    try {
      const isRuc = formData.documentNumber.length === 11;
      const endpoint = isRuc 
        ? `https://api.apis.net.pe/v1/ruc?numero=${formData.documentNumber}`
        : `https://api.apis.net.pe/v1/dni?numero=${formData.documentNumber}`;
      
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Client not found or API error');
      const data = await res.json();
      
      setFormData(prev => ({ 
        ...prev, 
        client: isRuc ? data.nombre : `${data.nombres} ${data.apellidoPaterno} ${data.apellidoMaterno}`,
        clientAddress: isRuc ? (data.direccion || '') : '',
        documentType: isRuc ? 'FACTURA' : 'BOLETA'
      }));
    } catch (err) {
      alert('No se pudo encontrar el cliente o el servicio está inactivo. Intente ingresarlo manualmente.');
    } finally {
      setSearchingClient(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || formData.price <= 0 || !formData.client) return;
    
    // Si es Pollo BB, cantidad debe ser mayor a 0. Si es Vivo, peso o cantidad mayor a 0.
    if (formData.animalType === 'POLLO_BB' && formData.quantity <= 0) return;
    if (formData.animalType === 'POLLO_VIVO' && formData.quantity <= 0 && formData.peso <= 0) return;

    const currentStock = getProductStock(formData.animalType as any);
    if (formData.quantity > currentStock) {
        alert(`No hay stock suficiente. Saldo actual de ${formData.animalType === 'POLLO_BB' ? 'Pollo Bebé' : 'Pollo Vivo'}: ${currentStock} aves.`);
        return;
    }

    const calculatedTotal = formData.animalType === 'POLLO_BB' ? formData.quantity * formData.price : formData.peso * formData.price;

    try {
      const saleData: any = {
        animalType: formData.animalType,
        documentType: formData.documentType,
        documentNumber: formData.documentNumber,
        date: Date.now(),
        quantity: formData.quantity,
        price: formData.price,
        total: calculatedTotal,
        client: formData.client,
        clientAddress: formData.clientAddress,
        notes: formData.notes,
        createdAt: Date.now(),
        createdBy: userProfile.id
      };

      if (formData.animalType === 'POLLO_BB') {
        saleData.sex = formData.sex;
      } else {
        saleData.tipoAve = formData.tipoAve;
        saleData.peso = formData.peso;
      }

      await addDoc(collection(db, 'sales'), saleData);
      setShowModal(false);
      setFormData({ animalType: 'POLLO_BB', documentType: 'BOLETA', documentNumber: '', client: '', clientAddress: '', quantity: 0, price: 0, sex: 'Mixto', tipoAve: 'Brasa', peso: 0, notes: '' });
    } catch (err) {
      console.error(err);
      alert('Error al registrar venta');
    }
  };

  const totalBB = sales.filter(s => s.animalType === 'POLLO_BB').reduce((acc, curr) => acc + curr.total, 0);
  const totalVivos = sales.filter(s => s.animalType === 'POLLO_VIVO').reduce((acc, curr) => acc + curr.total, 0);

  const handleDelete = async (saleId: string) => {
      if (confirm('¿Está seguro de eliminar esta venta permanentemente?')) {
          try {
              await deleteDoc(doc(db, 'sales', saleId));
          } catch(err) {
              alert('Error al eliminar');
          }
      }
  };

  const generatePDFA4 = (sale: Sale) => {
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.setTextColor('#4f46e5');
    doc.text('CORPORING', 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor('#333333');
    doc.text(`${sale.documentType} DE VENTA`, 105, 30, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor('#666666');
    doc.text(`Fecha: ${format(new Date(sale.date), 'dd/MM/yyyy HH:mm')}`, 14, 45);
    doc.text(`Documento: ${sale.documentNumber || 'S/N'}`, 14, 52);
    doc.text(`Cliente: ${sale.client}`, 14, 59);
    if (sale.clientAddress) doc.text(`Dir: ${sale.clientAddress}`, 14, 66);
    
    const tableData = [
      ['Tipo', sale.animalType === 'POLLO_BB' ? 'Pollo Bebé' : 'Pollo Vivo', ''],
    ];

    if (sale.animalType === 'POLLO_BB') {
        tableData.push(['Sexo', sale.sex || '-', '']);
    } else {
        tableData.push(['Tipo Ave', sale.tipoAve || '-', '']);
        tableData.push(['Peso Total (Kg)', sale.peso?.toString() || '0', '']);
    }

    tableData.push(['Cantidad', sale.quantity.toString(), 'aves']);
    tableData.push(['Precio Unitario', `S/ ${sale.price.toFixed(2)}`, sale.animalType === 'POLLO_BB' ? 'por ave' : 'por Kg']);
    tableData.push(['Total', `S/ ${sale.total.toFixed(2)}`, '']);

    autoTable(doc, {
      startY: 75,
      head: [['Descripción', 'Detalle', 'Unidad']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });
    
    doc.save(`Venta_A4_${sale.documentNumber || sale.id.slice(0,6)}.pdf`);
  };

  const generatePDFTicket = (sale: Sale) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 150]
    });
    
    doc.setFontSize(14);
    doc.text('CORPORING', 40, 10, { align: 'center' });
    doc.setFontSize(8);
    doc.text(`${sale.documentType} DE VENTA`, 40, 15, { align: 'center' });
    doc.text(`Fecha: ${format(new Date(sale.date), 'dd/MM/yyyy HH:mm')}`, 5, 25);
    doc.text(`Doc: ${sale.documentNumber || 'S/N'}`, 5, 30);
    doc.text(`Cliente: ${sale.client}`, 5, 35);
    if (sale.clientAddress) doc.text(`Dir: ${sale.clientAddress}`, 5, 40);

    let y = 50;
    doc.text('CANT', 5, y);
    doc.text('DESCRIPCION', 15, y);
    doc.text('TOTAL', 60, y);
    y += 5;
    
    const desc = sale.animalType === 'POLLO_BB' ? `BB ${sale.sex}` : `Vivo ${sale.tipoAve}`;
    doc.text(`${sale.quantity}`, 5, y);
    doc.text(desc, 15, y);
    doc.text(`S/ ${sale.total.toFixed(2)}`, 60, y);

    y += 10;
    if (sale.animalType === 'POLLO_VIVO') {
        doc.text(`Peso Total: ${sale.peso} Kg`, 5, y);
        y += 5;
    }
    doc.text(`Precio U: S/ ${sale.price.toFixed(2)}`, 5, y);

    y += 15;
    doc.setFontSize(10);
    doc.text(`TOTAL: S/ ${sale.total.toFixed(2)}`, 40, y, { align: 'center' });
    
    doc.save(`Venta_Ticket_${sale.documentNumber || sale.id.slice(0,6)}.pdf`);
  };

  const generateOrdenDespacho = (sale: Sale) => {
    const doc = new jsPDF('landscape');
    
    // Titulo
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ORDEN DE DESPACHO / GUÍA DE REMISIÓN REMITENTE', 148, 15, { align: 'center' });
    doc.text('CORPORING - AGROPECUARIA CAMPO VERDE S.A.', 148, 22, { align: 'center' });
    
    // Rectangulo de N de certificado (Esquina superior derecha)
    doc.rect(230, 8, 50, 10);
    doc.setFontSize(8);
    doc.text('N° de Documento', 255, 12, { align: 'center' });
    doc.text(`OD - ${sale.documentNumber || sale.id.slice(0,5)}`, 255, 16, { align: 'center' });

    let currentY = 30;

    // Tabla de Datos
    // Row 1: DATOS DE LA EMPRESA
    doc.setFillColor(230, 230, 230);
    doc.rect(14, currentY, 270, 7, 'DF');
    doc.setFontSize(9);
    doc.text('DATOS DE LA EMPRESA / REMITENTE', 149, currentY + 5, { align: 'center' });
    currentY += 7;

    // Row 2: Razón Social / RUC
    doc.rect(14, currentY, 150, 8);
    doc.rect(164, currentY, 120, 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('RAZÓN SOCIAL / NOMBRE', 16, currentY + 4);
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 150);
    doc.text('AGROPECUARIA CAMPO VERDE S.A.', 55, currentY + 5);
    
    doc.setTextColor(0,0,0);
    doc.setFontSize(8);
    doc.text('RUC / DNI', 166, currentY + 4);
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 150);
    doc.text('20393069997', 190, currentY + 5);
    doc.setTextColor(0,0,0);
    currentY += 8;

    // Row 3: DATOS DEL DESTINATARIO
    doc.setFillColor(230, 230, 230);
    doc.rect(14, currentY, 270, 7, 'DF');
    doc.setFontSize(9);
    doc.text('DATOS DEL DESTINATARIO / CLIENTE', 149, currentY + 5, { align: 'center' });
    currentY += 7;

    // Row 4: Nombre / Doc
    doc.rect(14, currentY, 150, 8);
    doc.rect(164, currentY, 120, 8);
    doc.setFontSize(8);
    doc.text('CLIENTE:', 16, currentY + 4);
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 150);
    doc.text(sale.client, 35, currentY + 5);
    doc.setTextColor(0,0,0);
    doc.setFontSize(8);
    doc.text('DNI / RUC:', 166, currentY + 4);
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 150);
    doc.text(sale.documentNumber || 'S/N', 185, currentY + 5);
    doc.setTextColor(0,0,0);
    currentY += 8;

    // Row 5: Ubicacion
    doc.rect(14, currentY, 270, 12);
    doc.setFontSize(7);
    doc.text('DIRECCIÓN DE LLEGADA', 16, currentY + 4);
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 150);
    doc.text(sale.clientAddress || 'NO DECLARADO', 16, currentY + 10);
    doc.setTextColor(0,0,0);
    currentY += 12;

    // Row 6: MERCANCIAS
    doc.setFillColor(230, 230, 230);
    doc.rect(14, currentY, 270, 7, 'DF');
    doc.setFontSize(9);
    doc.text('DETALLE DE DESPACHO', 149, currentY + 5, { align: 'center' });
    currentY += 7;

    // Row 7: Detalle mercancias header
    doc.rect(14, currentY, 80, 6);
    doc.rect(94, currentY, 100, 6);
    doc.rect(194, currentY, 45, 6);
    doc.rect(239, currentY, 45, 6);
    doc.setFontSize(8);
    doc.text('FECHA/HORA', 54, currentY + 4, { align: 'center' });
    doc.text('PRODUCTO', 144, currentY + 4, { align: 'center' });
    doc.text('CANT. INTERNA (AVES)', 216.5, currentY + 4, { align: 'center' });
    doc.text('PESO PROMEDIO / TOTAL KG', 261.5, currentY + 4, { align: 'center' });
    currentY += 6;

    // Row 8: Detalle mercancias Content
    doc.rect(14, currentY, 80, 12);
    doc.rect(94, currentY, 100, 12);
    doc.rect(194, currentY, 45, 12);
    doc.rect(239, currentY, 45, 12);
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 150);
    
    const producto = sale.animalType === 'POLLO_BB' ? `Pollo Bebé (${sale.sex})` : `Pollo Vivo (${sale.tipoAve})`;
    
    doc.text(format(new Date(sale.date), 'dd/MM/yyyy HH:mm'), 54, currentY + 8, { align: 'center' });
    doc.text(producto, 144, currentY + 8, { align: 'center' });
    doc.text(sale.quantity.toLocaleString(), 216.5, currentY + 8, { align: 'center' });
    doc.text(sale.animalType === 'POLLO_VIVO' && sale.peso ? sale.peso.toString() : '-', 261.5, currentY + 8, { align: 'center' });
    doc.setTextColor(0,0,0);
    currentY += 12;

    // Footer
    doc.rect(14, currentY, 270, 30);
    
    doc.setFontSize(9);
    doc.text('Lugar de Emisión:', 16, currentY + 15);
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 150);
    doc.text('CAMPO VERDE', 45, currentY + 15);
    doc.setTextColor(0,0,0);
    
    doc.setFontSize(8);
    doc.text('Firma y Sello de Despacho', 120, currentY + 20, { align: 'center' });
    doc.text('Firma de Recepción Cliente', 200, currentY + 20, { align: 'center' });
    
    doc.line(90, currentY + 16, 150, currentY + 16);
    doc.line(170, currentY + 16, 230, currentY + 16);

    doc.save(`Orden_Despacho_${sale.documentNumber || sale.id.slice(0,6)}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Registro de Ventas</h1>
          <p className="text-slate-400">Totalización y detalle de ventas realizadas.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center space-x-2 bg-indigo-500 hover:bg-indigo-400 text-white px-5 py-2.5 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20">
          <Plus className="w-5 h-5" /><span>Nueva Venta</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl flex items-center space-x-4">
          <div className="bg-emerald-500/20 p-4 rounded-2xl border border-emerald-500/20">
            <DollarSign className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Ventas Pollos BB</p>
            <p className="text-3xl font-bold text-emerald-300">S/ {totalBB.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl flex items-center space-x-4">
          <div className="bg-emerald-500/20 p-4 rounded-2xl border border-emerald-500/20">
            <DollarSign className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Ventas Pollos Vivos</p>
            <p className="text-3xl font-bold text-emerald-300">S/ {totalVivos.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Fecha</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Documento</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Cliente</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Detalle</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Subtotal</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {sales.map(sale => (
              <tr key={sale.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-slate-300">{format(sale.date, 'dd/MM/yyyy HH:mm')}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                   <div className="text-white font-medium">{sale.documentType}</div>
                   <div className="text-xs text-slate-400">{sale.documentNumber}</div>
                </td>
                <td className="px-6 py-4 whitespace-normal text-white font-medium min-w-[200px]">{sale.client}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                      <span className={`px-2 py-0.5 inline-flex text-[10px] uppercase tracking-wider font-bold rounded-full w-max ${
                        sale.animalType === 'POLLO_BB' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {sale.animalType === 'POLLO_BB' ? 'Pollo Bebé' : 'Pollo Vivo'}
                      </span>
                      <span className="text-xs text-slate-300">
                          {sale.quantity.toLocaleString()} aves
                          {sale.animalType === 'POLLO_BB' ? ` (${sale.sex})` : ` (${sale.tipoAve} - ${sale.peso}kg)`}
                      </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-bold text-emerald-300">S/ {sale.total.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                   <div className="flex items-center gap-1">
                       <button onClick={() => generatePDFA4(sale)} title="Imprimir A4" className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors">
                           <FileText className="w-4 h-4"/>
                       </button>
                       <button onClick={() => generatePDFTicket(sale)} title="Imprimir Ticket" className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors">
                           <Printer className="w-4 h-4"/>
                       </button>
                       <button onClick={() => generateOrdenDespacho(sale)} title="Orden de Despacho" className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors">
                           <Truck className="w-4 h-4"/>
                       </button>
                       <button onClick={() => handleDelete(sale.id)} title="Eliminar" className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-2">
                           <Trash2 className="w-4 h-4"/>
                       </button>
                   </div>
                </td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                  No hay ventas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto pt-10 pb-20">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl w-full max-w-2xl p-6 relative">
            <h2 className="text-xl font-bold text-white mb-6">Nueva Venta</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="md:col-span-2 flex gap-4">
                    <div className="w-1/3">
                        <label className="block text-sm font-medium text-slate-300 mb-1">Doc. Venta</label>
                        <select 
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 backdrop-blur-md text-white transition-all appearance-none"
                            value={formData.documentType}
                            onChange={e => setFormData({...formData, documentType: e.target.value})}
                        >
                            <option value="BOLETA" className="bg-slate-800">Boleta</option>
                            <option value="FACTURA" className="bg-slate-800">Factura</option>
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-300 mb-1">DNI / RUC</label>
                        <div className="flex">
                            <input 
                            type="text" 
                            className="w-full bg-white/10 border border-white/20 rounded-l-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 text-white transition-all"
                            value={formData.documentNumber}
                            onChange={e => setFormData({...formData, documentNumber: e.target.value})}
                            placeholder="Ingrese DNI o RUC"
                            />
                            <button type="button" onClick={searchClient} disabled={searchingClient} className="bg-indigo-500 hover:bg-indigo-400 px-4 rounded-r-xl transition-colors flex items-center justify-center">
                                {searchingClient ? <span className="animate-spin w-5 h-5 border-2 border-white/20 border-t-white rounded-full" /> : <Search className="w-5 h-5 text-white" />}
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Razón Social / Nombre (Autocompletado)</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 text-white transition-all"
                    value={formData.client}
                    onChange={e => setFormData({...formData, client: e.target.value})}
                    placeholder="Nombre o Razón Social"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Dirección (Opcional)</label>
                  <input 
                    type="text" 
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 text-white transition-all"
                    value={formData.clientAddress}
                    onChange={e => setFormData({...formData, clientAddress: e.target.value})}
                    placeholder="Dirección del cliente"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1">Producto / Tipo de Ave</label>
                    <select 
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 backdrop-blur-md text-white transition-all appearance-none"
                    value={formData.animalType}
                    onChange={e => setFormData({...formData, animalType: e.target.value as any})}
                    >
                    <option value="POLLO_BB" className="bg-slate-800">Pollo Bebé</option>
                    <option value="POLLO_VIVO" className="bg-slate-800">Pollo Vivo (Granja)</option>
                    </select>
                  </div>

                  {formData.animalType === 'POLLO_BB' ? (
                      <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-300 mb-1">Sexo del Ave</label>
                          <select 
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none text-white transition-all appearance-none"
                            value={formData.sex}
                            onChange={e => setFormData({...formData, sex: e.target.value})}
                          >
                              <option value="Mixto" className="bg-slate-800">Mixto</option>
                              <option value="Macho" className="bg-slate-800">Macho</option>
                              <option value="Hembra" className="bg-slate-800">Hembra</option>
                          </select>
                      </div>
                  ) : (
                      <>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Tipo de Ave</label>
                            <select 
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none text-white transition-all appearance-none"
                                value={formData.tipoAve}
                                onChange={e => setFormData({...formData, tipoAve: e.target.value})}
                            >
                                <option value="Brasa" className="bg-slate-800">Brasa</option>
                                <option value="Presa" className="bg-slate-800">Presa</option>
                                <option value="Reproductores" className="bg-slate-800">Reproductores</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Peso Total (Kg)</label>
                            <input 
                                type="number" step="0.01" min="0" required
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white"
                                value={formData.peso || ''}
                                onChange={e => setFormData({...formData, peso: Number(e.target.value)})}
                            />
                        </div>
                      </>
                  )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Cantidad (Aves)</label>
                  <input 
                    type="number" 
                    min="1"
                    required
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 backdrop-blur-md text-white transition-all"
                    value={formData.quantity || ''}
                    onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                      {formData.animalType === 'POLLO_BB' ? 'Precio Venta por Ave (S/)' : 'Precio Venta por Kg (S/)'}
                  </label>
                  <input 
                    type="number" 
                    min="0.01"
                    step="0.01"
                    required
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 backdrop-blur-md text-white transition-all"
                    value={formData.price || ''}
                    onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex justify-between items-center mt-2">
                <span className="text-sm text-emerald-400 font-medium">Total Calculado</span>
                <span className="text-xl font-bold text-white">S/ {(formData.animalType === 'POLLO_BB' ? formData.quantity * formData.price : formData.peso * formData.price).toFixed(2)}</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Notas (Opcional)</label>
                <input 
                  type="text" 
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 backdrop-blur-md text-white transition-all"
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-500 hover:bg-indigo-400 rounded-2xl transition-all shadow-lg shadow-indigo-500/20">Finalizar Venta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
