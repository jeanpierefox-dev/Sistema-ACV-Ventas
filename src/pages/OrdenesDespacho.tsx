import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Sale } from '../types';
import { format } from 'date-fns';
import { Truck, FileText, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function OrdenesDespacho() {
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'sales'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale)));
    });
    return unsub;
  }, []);

  const generateOrdenBB = (sale: Sale) => {
    const doc = new jsPDF('landscape');
    
    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 150);
    doc.text('ACV', 14, 20);
    doc.setFontSize(8);
    doc.text('AGROPECUARIA CAMPO VERDE S.A.', 14, 25);
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('ORDEN DE DESPACHO DE POLLO BB', 148, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text('REGISTRO SENASA NRO. 05891', 148, 22, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(200, 0, 0);
    doc.text(`SERIE 001 - N° ${sale.documentNumber || sale.id.slice(0, 6)}`, 270, 20, { align: 'right' });
    
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 150);
    doc.line(14, 28, 280, 28);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE / CD  :', 14, 38);
    doc.setFont('helvetica', 'normal');
    const clientName = `${sale.client} / DNI: ${sale.documentNumber || ''}`;
    doc.text(clientName, 45, 38);
    doc.line(42, 40, 280, 40);
    
    doc.setFont('helvetica', 'bold');
    doc.text('NRO. DE PLAC :', 14, 48);
    doc.line(42, 50, 150, 50);
    
    doc.text('FECHA              :', 14, 58);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(sale.date), 'dd - MM - yy'), 45, 58);
    doc.line(42, 60, 150, 60);

    let startY = 70;
    
    autoTable(doc, {
        startY,
        margin: { right: 135 },
        theme: 'grid',
        headStyles: { fillColor: [230, 240, 255], textColor: [0, 0, 150], lineColor: [0, 0, 150] },
        styles: { lineColor: [0, 0, 150], fontSize: 10, halign: 'center' },
        head: [['INCUBADORA', 'CAJA X AVE', 'CANTIDAD', 'TIPO', 'SEXO', 'PESO PROM']],
        body: [
            ['', '', (sale.quantity || 0).toString(), '', sale.sex === 'Macho' ? 'M' : sale.sex === 'Hembra' ? 'H' : 'M/H', '']
        ],
        foot: [['TOTALES', '', (sale.quantity || 0).toString(), '', '', '']],
        footStyles: { fillColor: [230, 240, 255], textColor: [0, 0, 150], fontStyle: 'bold' }
    });

    const horaX = 175;
    doc.setDrawColor(0, 0, 150);
    doc.rect(horaX, startY, 50, 15);
    doc.line(horaX, startY + 7.5, horaX + 50, startY + 7.5);
    doc.line(horaX + 25, startY, horaX + 25, startY + 15);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 150);
    doc.text('HORA INICIO', horaX + 2, startY + 5);
    doc.text('HORA FINAL', horaX + 2, startY + 12.5);

    const cajasX = 230;
    doc.rect(cajasX, startY, 55, 22.5);
    doc.line(cajasX, startY + 7.5, cajasX + 55, startY + 7.5);
    doc.line(cajasX, startY + 15, cajasX + 55, startY + 15);
    doc.line(cajasX + 27, startY, cajasX + 27, startY + 22.5);
    doc.text('CAJAS VACIAS', cajasX + 2, startY + 5);
    doc.text('CAJAS LLENAS', cajasX + 2, startY + 12.5);
    doc.text('TOTAL CAJAS', cajasX + 2, startY + 20);

    const tablesMaxY = Math.max((doc as any).lastAutoTable.finalY, startY + 22.5);
    const finalY = tablesMaxY + 15;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('OBSERVACIONES:', 14, finalY);
    doc.line(14, finalY + 5, 280, finalY + 5);
    doc.line(14, finalY + 15, 280, finalY + 15);
    
    const footerY = finalY + 45;
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 150);
    doc.text('JEFE DE PLANTA', 60, footerY, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    doc.text('NOMBRE: ______________________', 60, footerY + 5, { align: 'center' });
    
    doc.setTextColor(0, 0, 150);
    doc.text('ENCARGADO DE DESPACHO', 220, footerY, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    doc.text('NOMBRE: ______________________', 220, footerY + 5, { align: 'center' });
    
    doc.save(`Orden_Despacho_BB_${sale.documentNumber || sale.id.slice(0,6)}.pdf`);
  };

  const generateOrdenVivo = (sale: Sale) => {
    const doc = new jsPDF('landscape');
    
    // Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 150);
    doc.text('ACV', 14, 20);
    doc.setFontSize(9);
    doc.text('AGROPECUARIA CAMPO VERDE S.A.', 14, 25);
    doc.text('Agricultura Sustentable', 14, 29);
    
    doc.setFontSize(16);
    doc.text('ORDEN DESPACHO DE AVES', 148, 18, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(200, 0, 0);
    doc.text(`N° ${sale.documentNumber || sale.id.slice(0, 6)}`, 270, 20, { align: 'right' });
    
    doc.setDrawColor(0, 0, 150);
    doc.line(14, 32, 280, 32);
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE / CD   :', 14, 40);
    doc.setFont('helvetica', 'normal');
    doc.text(sale.client, 45, 40);
    doc.line(42, 42, 160, 42);
    
    doc.setFont('helvetica', 'bold');
    doc.text('N° PLACA         :', 14, 50);
    doc.line(42, 52, 160, 52);
    
    doc.text('FECHA               :', 14, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(sale.date), 'dd - MM - yyyy'), 45, 60);
    doc.line(42, 62, 160, 62);

    // Minor table top right
    const rx = 165;
    doc.setTextColor(0, 0, 150);
    doc.text('H.INICIO', rx, 40);
    doc.text('H.FINAL', rx, 50);
    doc.rect(rx + 15, 35, 20, 7);
    doc.rect(rx + 15, 45, 20, 7);
    
    doc.text('JABAS LLENAS', rx + 40, 40);
    doc.text('JABAS VACIAS', rx + 40, 50);
    doc.text('TOTAL JABAS', rx + 40, 60);
    doc.rect(rx + 70, 35, 15, 7);
    doc.rect(rx + 70, 45, 15, 7);
    doc.rect(rx + 70, 55, 15, 7);

    doc.rect(rx + 90, 35, 30, 27);
    doc.text('PRECINTOS', rx + 105, 40, { align: 'center' });
    doc.line(rx + 90, 42, rx + 120, 42);
    doc.setFontSize(8);
    doc.text('CAMIÓN', rx + 95, 48);
    doc.text('CARRETA', rx + 108, 48);
    doc.line(rx + 90, 50, rx + 120, 50);
    doc.line(rx + 105, 42, rx + 105, 62);

    let startY = 68;
    // Main Table
    autoTable(doc, {
        startY,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 150], lineColor: [0, 0, 150] },
        styles: { lineColor: [0, 0, 150], fontSize: 10, halign: 'center', textColor: [0, 0, 0] },
        head: [['PLANTEL', 'GALPÓN', 'JABAS X AVE', 'CANTIDAD', 'TIPO', 'SEXO', 'PESO PROV.']],
        body: [
            ['', '', '', (sale.quantity || 0).toString(), sale.tipoAve || '', sale.sex === 'Hembra' ? 'H' : 'M', '']
        ],
        foot: [['', '', '', (sale.quantity || 0).toString(), '', '', '']],
        footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
        margin: { right: 70 }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Small right tables
    const srx = 227;
    let tsy = startY;
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 150);
    doc.rect(srx, tsy, 53, 7);
    doc.text('CONTEO AVES', srx + 2, tsy + 5);
    doc.text('JABAS', srx + 28, tsy + 5);
    doc.text('AVES', srx + 42, tsy + 5);
    doc.line(srx + 25, tsy, srx + 25, tsy + 7);
    doc.line(srx + 40, tsy, srx + 40, tsy + 7);
    
    tsy += 7;
    const drawSrRow = (label: string) => {
        doc.rect(srx, tsy, 53, 6);
        doc.text(label, srx + 2, tsy + 4);
        doc.line(srx + 25, tsy, srx + 25, tsy + 6);
        doc.line(srx + 40, tsy, srx + 40, tsy + 6);
        tsy += 6;
    }
    drawSrRow('MUESTRA');
    drawSrRow('SOBRANTE');
    drawSrRow('FALTANTE');
    drawSrRow('CONFORME');
    
    tsy += 2;
    doc.rect(srx, tsy, 53, 7);
    doc.text('AYUNO AVES', srx + 2, tsy + 5);
    tsy += 7;
    const drawSrRow2 = (label: string) => {
        doc.rect(srx, tsy, 53, 6);
        doc.text(label, srx + 2, tsy + 4);
        doc.line(srx + 40, tsy, srx + 40, tsy + 6);
        tsy += 6;
    }
    drawSrRow2('MUESTRA');
    drawSrRow2('CON BUCHE');
    drawSrRow2('SIN BUCHE');

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVACIONES:', 14, finalY);
    doc.line(14, finalY + 5, 210, finalY + 5);
    doc.line(14, finalY + 15, 210, finalY + 15);
    
    const footerY = finalY + 35;
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 150);
    doc.text('ADMIN. DESPACHO', 50, footerY, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text('Nombre: ______________________', 50, footerY + 8, { align: 'center' });
    doc.line(20, footerY - 5, 80, footerY - 5);
    
    doc.setTextColor(0, 0, 150);
    doc.setFont('helvetica', 'bold');
    doc.text('CAPATAZ DESPACHO', 140, footerY, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text('Nombre: ______________________', 140, footerY + 8, { align: 'center' });
    doc.line(110, footerY - 5, 170, footerY - 5);

    doc.setTextColor(0, 0, 150);
    doc.setFont('helvetica', 'bold');
    doc.text('ÁREA CONTROL', 230, footerY, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text('Nombre: ______________________', 230, footerY + 8, { align: 'center' });
    doc.line(200, footerY - 5, 260, footerY - 5);

    doc.save(`Orden_Despacho_Vivos_${sale.documentNumber || sale.id.slice(0,6)}.pdf`);
  };

  const generateGuiaRemision = (sale: Sale) => {
    const doc = new jsPDF('landscape');
    
    // Header Left
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 150);
    doc.text('ACV', 14, 25);
    doc.setFontSize(10);
    doc.text('AGROPECUARIA CAMPO VERDE S.A.', 14, 30);
    doc.setFontSize(9);
    doc.text('Agricultura Sustentable', 14, 34);
    
    // Header Middle
    doc.setFontSize(8);
    doc.text('CAR. FEDERICO BASADRE KM.30', 100, 20);
    doc.text('CAS. ALTO MANANTAY', 100, 24);
    doc.text('UCAYALI - CORONEL PORTILLO - CAMPOVERDE', 100, 28);
    doc.text('Telf.: 061 - 796196', 100, 32);

    // Header Right
    doc.rect(200, 10, 80, 28);
    doc.setFontSize(14);
    doc.text('R.U.C. 20393069997', 240, 18, { align: 'center' });
    doc.setFontSize(12);
    doc.text('GUIA DE REMISION - REMITENTE', 240, 26, { align: 'center' });
    doc.setTextColor(200, 0, 0);
    doc.text(`001 - N° ${sale.documentNumber || sale.id.slice(0,6)}`, 240, 34, { align: 'center' });
    
    doc.setTextColor(0, 0, 150);
    let startY = 45;
    doc.setFontSize(9);
    doc.text('Fecha de Emisión:', 14, startY);
    doc.setTextColor(0,0,0);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(sale.date), 'dd / MM / yyyy'), 45, startY);
    doc.line(42, startY + 1, 90, startY + 1);

    doc.setTextColor(0, 0, 150);
    doc.setFont('helvetica', 'bold');
    doc.text('Punto de Partida:', 14, startY + 7);
    doc.setTextColor(0,0,0);
    doc.setFont('helvetica', 'normal');
    const startAddress = sale.animalType === 'POLLO_BB' ? 'CAR. FEDERICO BASADRE KM 39.5 CAMPOVERDE' : 'CAR. FEDERICO BASADRE KM.30 CAS. ALTO MANANTAY';
    doc.text(startAddress, 45, startY + 7);
    doc.line(42, startY + 8, 200, startY + 8);

    doc.setTextColor(0, 0, 150);
    doc.setFont('helvetica', 'bold');
    doc.text('Punto de Llegada:', 14, startY + 14);
    doc.setTextColor(0,0,0);
    doc.setFont('helvetica', 'normal');
    doc.text(sale.clientAddress || '', 45, startY + 14);
    doc.line(42, startY + 15, 200, startY + 15);
    
    doc.setTextColor(0, 0, 150);
    doc.setFont('helvetica', 'bold');
    doc.text('Fecha de Inicio de Traslado:', 14, startY + 21);
    doc.setTextColor(0,0,0);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(sale.date), 'dd / MM / yyyy'), 65, startY + 21);
    doc.line(60, startY + 22, 100, startY + 22);

    doc.setTextColor(0, 0, 150);
    doc.setFont('helvetica', 'bold');
    doc.text('N° de R.U.C.', 14, startY + 28);
    doc.rect(38, startY + 24, 60, 5);
    doc.setTextColor(0,0,0);
    doc.setFont('helvetica', 'normal');
    doc.text(sale.documentNumber || '', 40, startY + 28);

    doc.setTextColor(0, 0, 150);
    doc.setFont('helvetica', 'bold');
    doc.text('Nombre o Razón Social del DESTINATARIO:', 200, startY + 19);
    doc.setTextColor(0,0,0);
    doc.setFont('helvetica', 'normal');
    doc.text(sale.client, 200, startY + 25);
    doc.line(200, startY + 26, 280, startY + 26);
    
    startY = startY + 32;

    const producto = sale.animalType === 'POLLO_BB' ? `Pollo Bebé (${sale.sex})` : `Pollo Vivo (${sale.tipoAve})`;

    autoTable(doc, {
        startY,
        theme: 'grid',
        headStyles: { fillColor: [230, 240, 255], textColor: [0, 0, 150], lineColor: [0, 0, 150] },
        styles: { lineColor: [0, 0, 150], fontSize: 10, halign: 'center', textColor: [0, 0, 0] },
        head: [['CODIGO', 'DESCRIPCION', 'CANTIDAD', 'U. DE MEDIDA', 'PESO TOTAL']],
        body: [
            ['', producto, (sale.quantity || 0).toString(), 'Unid', sale.peso ? sale.peso.toString() : '']
        ],
        foot: [['', '', '', 'Kg', sale.peso ? sale.peso.toString() : '']],
        footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 5;
    
    doc.setDrawColor(0, 0, 150);
    doc.rect(14, finalY, 40, 30);
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 150);
    doc.setFont('helvetica', 'bold');
    doc.text('MOTIVO DEL TRASLADO', 34, finalY + 4, { align: 'center' });
    // This is just a visual placeholder for Motivo
    doc.setFont('helvetica', 'normal');
    doc.text('Venta', 16, finalY + 10);
    doc.rect(48, finalY + 7, 3, 3);
    doc.text('X', 48.5, finalY + 9.5);

    doc.rect(57, finalY, 110, 30);
    doc.setFont('helvetica', 'bold');
    doc.text('UNIDAD DE TRANSPORTE Y CONDUCTOR', 112, finalY + 4, { align: 'center' });

    doc.rect(170, finalY, 110, 30);
    doc.text('EMPRESA DE TRANSPORTE', 225, finalY + 4, { align: 'center' });
    
    doc.save(`Guia_Remision_${sale.documentNumber || sale.id.slice(0,6)}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Órdenes de Despacho</h1>
        <p className="text-slate-400">Generación de guías de remisión y órdenes de despacho (Planta y Granja).</p>
      </div>

      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden mt-8">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <FileText className="w-5 h-5 text-indigo-400" />
             <h2 className="text-sm font-semibold uppercase tracking-wider text-indigo-300">Ventas Recientes</h2>
          </div>
        </div>
        
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/5">
                <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Categoría</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Cantidad</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Documentos</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
                {sales.map(sale => (
                    <tr key={sale.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-slate-300">{format(new Date(sale.date), 'dd/MM/yyyy HH:mm')}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-white font-medium">{sale.client}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 inline-flex text-[10px] uppercase tracking-wider font-bold rounded-full w-max ${
                                sale.animalType === 'POLLO_BB' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/20' : 'bg-blue-500/20 text-blue-300 border border-blue-500/20'
                            }`}>
                                {sale.animalType === 'POLLO_BB' ? 'Pollo Bebé' : 'Pollo Vivo'}
                            </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-300">{sale.quantity.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                                <button onClick={() => sale.animalType === 'POLLO_BB' ? generateOrdenBB(sale) : generateOrdenVivo(sale)} className="flex items-center space-x-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-lg font-medium transition-all text-xs border border-indigo-500/20">
                                    <Download className="w-4 h-4" /> <span>Orden de Despacho</span>
                                </button>
                                <button onClick={() => generateGuiaRemision(sale)} className="flex items-center space-x-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg font-medium transition-all text-xs border border-emerald-500/20">
                                    <Truck className="w-4 h-4" /> <span>Guía de Remisión</span>
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
                {sales.length === 0 && (
                <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      No hay ventas registradas.
                    </td>
                </tr>
                )}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}
