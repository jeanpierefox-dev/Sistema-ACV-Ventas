import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Sale } from '../types';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileBadge, Calendar, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Certificados() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  useEffect(() => {
    const q = query(collection(db, 'sales'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale)));
    });
    return unsub;
  }, []);

  const getFilteredAndSortedSales = () => {
    const [year, month] = selectedMonth.split('-');
    const startDate = startOfMonth(new Date(Number(year), Number(month) - 1));
    const endDate = endOfMonth(startDate);

    const filtered = sales.filter(s => isWithinInterval(new Date(s.date), { start: startDate, end: endDate }));
    
    // Sort by type: POLLO_BB first, then POLLO_VIVO
    return filtered.sort((a, b) => {
      if (a.animalType === b.animalType) {
        return a.date - b.date;
      }
      return a.animalType === 'POLLO_BB' ? -1 : 1;
    });
  };

  const filteredSales = getFilteredAndSortedSales();

  const generateCertificado = (sale: Sale) => {
    const doc = new jsPDF('landscape');
    
    // Titulo
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CERTIFICACIÓN SANITARIA PARA LA MOVILIZACIÓN DE AVES DOMÉSTICAS VIVAS V.2', 148, 15, { align: 'center' });
    doc.text('REGISTRADOS Y AUTORIZADOS POR EL SENASA', 148, 22, { align: 'center' });
    
    // Rectangulo de N de certificado (Esquina superior derecha)
    doc.rect(230, 8, 50, 10);
    doc.setFontSize(8);
    doc.text('N° de certificación', 255, 12, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`GSA493 - ${sale.documentNumber || sale.id.slice(0,5)}`, 255, 16, { align: 'center' });

    let currentY = 30;

    // Tabla de Datos
    // Row 1: DATOS DE LA EMPRESA
    doc.setFillColor(230, 230, 230);
    doc.rect(14, currentY, 270, 7, 'DF');
    doc.setFontSize(9);
    doc.text('DATOS DE LA EMPRESA', 149, currentY + 5, { align: 'center' });
    currentY += 7;

    // Row 2: Razón Social / RUC
    doc.rect(14, currentY, 150, 8);
    doc.rect(164, currentY, 120, 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('RAZÓN SOCIAL', 16, currentY + 4);
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 150);
    doc.text('AGROPECUARIA CAMPO VERDE S.A.', 45, currentY + 5);
    
    doc.setTextColor(0,0,0);
    doc.setFontSize(8);
    doc.text('RUC', 166, currentY + 4);
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 150);
    doc.text('20393069997', 180, currentY + 5);
    doc.setTextColor(0,0,0);
    currentY += 8;

    // Row 3: DATOS DEL ESTABLECIMIENTO
    doc.setFillColor(230, 230, 230);
    doc.rect(14, currentY, 270, 7, 'DF');
    doc.setFontSize(9);
    doc.text('DATOS DEL ESTABLECIMIENTO AVÍCOLA AUTORIZADO DE ORIGEN', 149, currentY + 5, { align: 'center' });
    currentY += 7;

    const isPolloBB = sale.animalType === 'POLLO_BB';
    const nroAutorizacion = isPolloBB ? '05891' : '08638';
    const nombreEstablecimiento = isPolloBB ? 'PLANTA INCUBADORA - CAMPO VERDE' : 'GRANJA - CAMPO VERDE';

    // Row 4: Nombre / N Autorizacion
    doc.rect(14, currentY, 130, 8);
    doc.rect(144, currentY, 140, 8);
    doc.setFontSize(8);
    doc.text('NOMBRE:', 16, currentY + 4);
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 150);
    doc.text(nombreEstablecimiento, 35, currentY + 5);
    doc.setTextColor(0,0,0);
    doc.setFontSize(8);
    doc.text('N° DE AUTORIZACIÓN Y REGISTRO:', 146, currentY + 4);
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 150);
    doc.text(nroAutorizacion, 210, currentY + 5);
    doc.setTextColor(0,0,0);
    currentY += 8;

    // Row 5: Ubicacion
    doc.rect(14, currentY, 50, 12);
    doc.rect(64, currentY, 50, 12);
    doc.rect(114, currentY, 50, 12);
    doc.rect(164, currentY, 120, 12);
    doc.setFontSize(7);
    doc.text('DEPARTAMENTO', 16, currentY + 4);
    doc.text('PROVINCIA', 66, currentY + 4);
    doc.text('DISTRITO', 116, currentY + 4);
    doc.text('DIRECCIÓN DEL ESTABLECIMIENTO', 166, currentY + 4);
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 150);
    doc.text('UCAYALI', 16, currentY + 10);
    doc.text('CORONEL PORTILLO', 66, currentY + 10);
    doc.text('CAMPO VERDE', 116, currentY + 10);
    doc.text('CARRETERA FEDERICO BASADRE KM 39.5', 166, currentY + 10);
    doc.setTextColor(0,0,0);
    currentY += 12;

    // Row 6: DESTINO
    doc.setFillColor(230, 230, 230);
    doc.rect(14, currentY, 270, 7, 'DF');
    doc.setFontSize(9);
    doc.text('DESTINO DE LAS MERCANCÍAS DE ORIGEN AVÍCOLA', 149, currentY + 5, { align: 'center' });
    currentY += 7;

    // Row 7: Destino Ubicacion
    doc.rect(14, currentY, 50, 10);
    doc.rect(64, currentY, 50, 10);
    doc.rect(114, currentY, 50, 10);
    doc.rect(164, currentY, 120, 10);
    doc.setFontSize(7);
    doc.text('DEPARTAMENTO', 16, currentY + 4);
    doc.text('PROVINCIA', 66, currentY + 4);
    doc.text('DISTRITO', 116, currentY + 4);
    doc.text('DIRECCIÓN DEL DESTINATARIO', 166, currentY + 4);
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 150);
    doc.text(sale.clientAddress || 'NO DECLARADO', 166, currentY + 8);
    doc.text('UCAYALI', 16, currentY + 8); // Se asume por defecto a menos q pongan otra cosa
    doc.setTextColor(0,0,0);
    currentY += 10;

    // Row 8: Checkboxes
    doc.rect(14, currentY, 270, 8);
    doc.setFontSize(6);
    doc.text('USO O PROPÓSITO :', 16, currentY + 5);
    
    // Checkboxes simulation
    let checkX = 40;
    const drawBox = (label: string, x: number, isChecked: boolean) => {
        doc.rect(x, currentY + 2, 4, 4);
        if (isChecked) {
            doc.text('X', x + 1, currentY + 5.5);
        }
        doc.text(label, x + 5, currentY + 5);
        return x + doc.getTextWidth(label) + 8;
    };
    
    const propToUse = sale.usoProposito || 'Comercialización';
    checkX = drawBox('REPRODUCCIÓN', checkX, propToUse === 'Reproducción');
    checkX = drawBox('BENEFICIO', checkX, propToUse === 'Beneficio');
    checkX = drawBox('CRIANZA', checkX, propToUse === 'Crianza');
    checkX = drawBox('ENGORDE', checkX, propToUse === 'Engorde');
    checkX = drawBox('INCUBACIÓN', checkX, propToUse === 'Incubación');
    checkX = drawBox('AGRICULTURA', checkX, propToUse === 'Agricultura');
    checkX = drawBox('RENDERING', checkX, propToUse === 'Rendering');
    checkX = drawBox('COMERCIALIZACIÓN', checkX, propToUse === 'Comercialización');
    drawBox('OTRO (especificar):', checkX, false);
    currentY += 8;

    // Row 9: MERCANCIAS
    doc.setFillColor(230, 230, 230);
    doc.rect(14, currentY, 270, 7, 'DF');
    doc.setFontSize(9);
    doc.text('MERCANCÍAS DE ORIGEN AVIAR (POLLO, PATO, PAVO, CARNE, HUEVOS, ETC.', 149, currentY + 5, { align: 'center' });
    currentY += 7;

    // Row 10: Detalle mercancias header
    doc.rect(14, currentY, 60, 6);
    doc.rect(74, currentY, 80, 6);
    doc.rect(154, currentY, 60, 6);
    doc.rect(214, currentY, 70, 6);
    doc.setFontSize(8);
    doc.text('ESPECIE', 44, currentY + 4, { align: 'center' });
    doc.text('PRODUCTO', 114, currentY + 4, { align: 'center' });
    doc.text('CANTIDAD', 184, currentY + 4, { align: 'center' });
    doc.text('UNIDAD DE MEDIDA (kg. unidades)', 249, currentY + 4, { align: 'center' });
    currentY += 6;

    // Row 11: Detalle mercancias Content
    doc.rect(14, currentY, 60, 12);
    doc.rect(74, currentY, 80, 12);
    doc.rect(154, currentY, 60, 12);
    doc.rect(214, currentY, 70, 12);
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 150);
    const especie = 'Pollo';
    const producto = sale.animalType === 'POLLO_BB' ? 'Pollo Bebé' : 'Pollo Parrillero';
    
    doc.text(especie, 44, currentY + 8, { align: 'center' });
    doc.text(producto, 114, currentY + 8, { align: 'center' });
    doc.text(sale.quantity.toString(), 184, currentY + 8, { align: 'center' });
    doc.text('UNIDADES', 249, currentY + 8, { align: 'center' });
    doc.setTextColor(0,0,0);
    currentY += 12;

    // Footer
    doc.rect(14, currentY, 270, 40);
    
    doc.setFontSize(9);
    doc.text('Lugar y Fecha:', 16, currentY + 20);
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 150);
    doc.text(`CAMPO VERDE, ${format(new Date(sale.date), 'dd/MM/yyyy')}`, 45, currentY + 20);
    doc.setTextColor(0,0,0);
    
    doc.setFontSize(8);
    doc.text('Firma, sello y N° de autorización del veterinario', 160, currentY + 20, { align: 'center' });

    // Firma simulada
    doc.setFont('Courier', 'italic');
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 150);
    doc.text('Lluvis G.', 230, currentY + 15, { align: 'center' });
    doc.line(190, currentY + 16, 270, currentY + 16);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Lluvis Lucero Germany Grandez', 230, currentY + 21, { align: 'center' });
    doc.text('MÉDICO VETERINARIO', 230, currentY + 25, { align: 'center' });
    doc.text('CMVDU 11886', 230, currentY + 29, { align: 'center' });
    
    doc.save(`Certificado_Sanitario_${sale.documentNumber || sale.id.slice(0,5)}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Certificados Sanitarios (SENASA)</h1>
        <p className="text-slate-400">Generación y control de certificados de movilización de aves por mes.</p>
      </div>

      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">Seleccionar Mes y Año:</label>
        <div className="flex bg-white/10 p-2 rounded-xl w-max">
           <Calendar className="w-5 h-5 text-indigo-400 m-2" />
           <input
             type="month"
             value={selectedMonth}
             onChange={e => setSelectedMonth(e.target.value)}
             className="bg-transparent border-none focus:outline-none text-white font-medium pl-2"
           />
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden mt-8">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <FileBadge className="w-5 h-5 text-indigo-400" />
             <h2 className="text-sm font-semibold uppercase tracking-wider text-indigo-300">Certificados del Mes ({filteredSales.length})</h2>
          </div>
        </div>
        
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/5">
                <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Fecha de Venta</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Cliente Destino</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Categoría</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Cantidad (Aves)</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Acción</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
                {filteredSales.map(sale => (
                    <tr key={sale.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-slate-300">{format(new Date(sale.date), 'dd/MM/yyyy HH:mm')}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-white font-medium">{sale.client}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 inline-flex text-[10px] uppercase tracking-wider font-bold rounded-full w-max ${
                                sale.animalType === 'POLLO_BB' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/20' : 'bg-blue-500/20 text-blue-300 border border-blue-500/20'
                            }`}>
                                {sale.animalType === 'POLLO_BB' ? 'Pollo Bebé' : 'Pollo Vivo (Parrillero)'}
                            </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-300">{sale.quantity.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <button onClick={() => generateCertificado(sale)} className="flex items-center space-x-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-lg font-medium transition-all text-xs border border-indigo-500/20">
                                <Download className="w-4 h-4" /> <span>Descargar Certificado</span>
                            </button>
                        </td>
                    </tr>
                ))}
                {filteredSales.length === 0 && (
                <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      No se encontraron ventas para el mes seleccionado.
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
