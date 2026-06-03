export type Role = 'ADMIN' | 'MANAGER' | 'USER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Client {
  id: string;
  documentType: 'DNI' | 'RUC';
  documentNumber: string;
  name: string;
  address: string;
  phone: string;
}

export interface DispatchOrder {
  id: string;
  type: 'POLLO_BB' | 'POLLO_VIVO';
  serialNumber: string; // e.g. "001-001924" for BB, "00040" for Aves
  clientId: string;
  clientName: string;
  plateNumber: string;
  date: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  
  // Specific to Pollo BB
  incubatorDetails?: {
    incubadora: string;
    cajas: number;
    avesPorCaja: number;
    cantidad: number;
    sexo: 'M' | 'H';
  }[];

  // Specific to Pollo Vivo
  plantelDetails?: {
    plantel: string;
    galpon: string;
    jabas: number;
    avesPorJaba: number;
    cantidad: number;
    tipoPollo: 'BRASA' | 'PRESA' | 'TIPO'; // Or type string
    sexo: 'M' | 'H';
    pesoPromedio: number;
  }[];

  totalQuantity: number;
  totalBoxesOrCrates: number;
  
  // Only for Aves / Pollo vivo (weights)
  totalWeight?: number;

  createdAt: number;
  createdBy: string;
}

export interface InventoryLogItem {
  ubicacion: string;
  plantel?: string;
  huevosIngresados?: number;
  pollosNacidos?: number;
  hembras?: number;
  machos?: number;
  enviadosLaboratorio?: number;
  precioCosto?: number;
  cantidad?: number; // for simple mortality
}

export interface InventoryLog {
  id: string;
  type: 'INGRESO' | 'MORTALIDAD';
  animalType: 'POLLO_BB' | 'POLLO_VIVO';
  date: number;
  quantity: number;
  location?: string;
  notes?: string;
  items?: InventoryLogItem[];
  createdAt: number;
  createdBy: string;
}

export interface Sale {
  id: string;
  animalType: 'POLLO_BB' | 'POLLO_VIVO';
  documentType: 'BOLETA' | 'FACTURA';
  documentNumber: string;
  date: number;
  quantity: number;
  price: number;
  total: number;
  client: string;
  clientAddress?: string;
  sex?: 'Macho' | 'Hembra' | 'Mixto'; // Para Pollo BB
  tipoAve?: string; // Para Pollo Vivo (e.g. Brasa, Presa)
  peso?: number; // Para Pollo Vivo
  notes?: string;
  createdAt: number;
  createdBy: string;
}

// Same as RemissionGuide / HealthCertificate schemas...
