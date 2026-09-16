import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, X, Save, Search, Loader2, Calculator, AlertCircle, Store, ArrowUpDown, ArrowUp, ArrowDown, Settings, ArrowLeftRight, LayoutDashboard, Sun, Moon, Copy, Check, Activity, RefreshCw, Layers, Table, CreditCard } from 'lucide-react';
import { supabase } from './lib/supabase';

interface TipeAkrilik {
  id: string;
  nama: string;
}

interface HargaAkrilik {
  tebal: string;
  daftarHarga: Record<string, number | null>; // tipe_id -> harga
  pemasok: string;
}

const PEMASOK_DEFAULT = ['Utama', 'Pemasok A', 'Pemasok B', 'Pemasok C'];

export default function App() {
  const [daftarPemasok, setDaftarPemasok] = useState<string[]>(PEMASOK_DEFAULT);
  const [pemasokAktif, setPemasokAktif] = useState<string>(PEMASOK_DEFAULT[0]);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [namaPemasokBaru, setNamaPemasokBaru] = useState('');
  const [renameError, setRenameError] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const [isManageSuppliersModalOpen, setIsManageSuppliersModalOpen] = useState(false);
  const [pemasokBaruDitambah, setPemasokBaruDitambah] = useState('');
  const [manageSupplierError, setManageSupplierError] = useState('');
  const [isManagingSupplier, setIsManagingSupplier] = useState(false);
  const [pemasokDihapus, setPemasokDihapus] = useState<string | null>(null);

  const [data, setData] = useState<HargaAkrilik[]>([]);
  const [daftarTipeAkrilik, setDaftarTipeAkrilik] = useState<TipeAkrilik[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: keyof HargaAkrilik; direction: 'asc' | 'desc' } | null>({ key: 'tebal', direction: 'asc' });

  // Calculator State
  const [calcThicknessId, setCalcThicknessId] = useState<string>(''); // Using tebal string as ID for simpler lookup
  const [calcTypeId, setCalcTypeId] = useState<string>('');
  const [calcMode, setCalcMode] = useState<'lembar' | 'custom'>('lembar');
  const [calcQty, setCalcQty] = useState<number>(1);
  const [calcLength, setCalcLength] = useState<number | ''>('');
  const [calcWidth, setCalcWidth] = useState<number | ''>('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    tebal: string;
    daftarHarga: Record<string, string>; // tipe_id -> string harga
  }>({
    tebal: '',
    daftarHarga: {},
  });
  const [searchQuery, setSearchQuery] = useState('');

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Theme State
  const isDarkMode = true;

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const [isManageTypesModalOpen, setIsManageTypesModalOpen] = useState(false);
  const [tipeBaruDitambah, setTipeBaruDitambah] = useState('');
  const [manageTypeError, setManageTypeError] = useState('');
  const [isManagingType, setIsManagingType] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<string | null>(null);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editTypeName, setEditTypeName] = useState('');

  // Comparison State
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [allPrices, setAllPrices] = useState<HargaAkrilik[]>([]);

  // Mobile & Database Keep-Alive State
  const [copiedPrice, setCopiedPrice] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'online' | 'error'>('checking');
  const [dbLatency, setDbLatency] = useState<number | null>(null);
  const [isPingingDb, setIsPingingDb] = useState(false);
  const [mobileViewMode, setMobileViewMode] = useState<'card' | 'table'>('card');
  const [selectedCompareThickness, setSelectedCompareThickness] = useState<string>('all');

  const checkDbHealth = async () => {
    setIsPingingDb(true);
    const start = Date.now();
    try {
      const { error } = await supabase.from('tipe_akrilik').select('id', { count: 'exact', head: true }).limit(1);
      const latency = Date.now() - start;
      if (error) {
        setDbStatus('error');
      } else {
        setDbStatus('online');
        setDbLatency(latency);
      }
    } catch {
      setDbStatus('error');
    } finally {
      setIsPingingDb(false);
    }
  };

  const validatePriceInput = (value: string) => {
    if (!value.trim()) return '';
    if (!/^\d+$/.test(value.trim())) return 'Hanya boleh berisi angka (0-9)';
    return '';
  };

  useEffect(() => {
    muatPemasok();
    muatTipeAkrilik();
    checkDbHealth();
  }, []);

  useEffect(() => {
    if (daftarTipeAkrilik.length > 0) {
      if (isComparisonMode) {
        muatSemuaHarga();
      } else {
        muatHarga();
      }
    }
  }, [pemasokAktif, isComparisonMode, daftarTipeAkrilik]);

  const muatTipeAkrilik = async () => {
    try {
      const { data, error } = await supabase.from('tipe_akrilik').select('*').order('nama');
      if (error) {
        if (error.code === '42P01') {
          console.warn('Table acrylic_types not found. Using defaults.');
          setDaftarTipeAkrilik([
            { id: 'clear', nama: 'Bening' },
            { id: 'susu', nama: 'Susu' },
            { id: 'warna', nama: 'Warna' }
          ]);
        } else {
          console.error('Error fetching types:', error);
        }
        return;
      }
      if (data && data.length > 0) {
        setDaftarTipeAkrilik(data);
        if (!calcTypeId) setCalcTypeId(data[0].id);
      } else {
        const defaults = [
          { nama: 'Bening' },
          { nama: 'Susu' },
          { nama: 'Warna' }
        ];
        const { data: inserted, error: insErr } = await supabase.from('tipe_akrilik').insert(defaults).select();
        if (!insErr && inserted) {
          setDaftarTipeAkrilik(inserted);
          setCalcTypeId(inserted[0].id);
        }
      }
    } catch (err) {
      console.error('Unexpected error fetching types:', err);
    }
  };

  const handleAddType = async () => {
    const trimmedName = tipeBaruDitambah.trim();
    if (!trimmedName) {
      setManageTypeError('Nama tipe akrilik tidak boleh kosong');
      return;
    }
    if (daftarTipeAkrilik.find(t => t.nama === trimmedName)) {
      setManageTypeError('Nama tipe akrilik sudah ada');
      return;
    }

    setIsManagingType(true);
    setManageTypeError('');

    const { data: inserted, error } = await supabase.from('tipe_akrilik').insert([{ nama: trimmedName }]).select().single();
    
    if (error) {
      console.error('Error adding type:', error);
      setManageTypeError(`Gagal: ${error.message} (${error.code})`);
    } else if (inserted) {
      setDaftarTipeAkrilik(prev => [...prev, inserted]);
      setTipeBaruDitambah('');
    }
    setIsManagingType(false);
  };

  const handleRenameType = async (id: string, newName: string) => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      setEditingTypeId(null);
      return;
    }
    
    setIsManagingType(true);
    const { error } = await supabase.from('tipe_akrilik').update({ nama: trimmedName }).eq('id', id);
    if (error) {
      console.error('Error renaming type:', error);
      alert('Gagal mengubah nama tipe');
    } else {
      setDaftarTipeAkrilik(prev => prev.map(t => t.id === id ? { ...t, nama: trimmedName } : t));
      setEditingTypeId(null);
    }
    setIsManagingType(false);
  };

  const confirmDeleteType = async () => {
    if (!typeToDelete) return;

    setIsManagingType(true);
    const { error } = await supabase.from('tipe_akrilik').delete().eq('id', typeToDelete);

    if (error) {
      console.error('Error deleting type:', error);
      alert('Gagal menghapus tipe. Pastikan tidak ada data harga yang menggunakan tipe ini.');
    } else {
      setDaftarTipeAkrilik(prev => prev.filter(t => t.id !== typeToDelete));
      setTypeToDelete(null);
      muatHarga();
    }
    setIsManagingType(false);
  };

  const muatPemasok = async () => {
    try {
      const { data, error } = await supabase.from('pemasok').select('nama').order('nama');
      
      if (error) {
        console.error('Error fetching daftarPemasok:', error);
        return;
      }

      if (data && data.length > 0) {
        const supplierNames = data.map(s => s.nama);
        setDaftarPemasok(supplierNames);
        if (!supplierNames.includes(pemasokAktif)) {
          setPemasokAktif(supplierNames[0]);
        }
      } else {
        // Jika tabel kosong, coba masukkan data default
        const defaultData = PEMASOK_DEFAULT.map(nama => ({ nama }));
        const { error: insertError } = await supabase.from('pemasok').insert(defaultData);
        if (insertError) {
          console.error('Error inserting default daftarPemasok:', insertError);
        } else {
          setDaftarPemasok(PEMASOK_DEFAULT);
        }
      }
    } catch (err) {
      console.error('Unexpected error fetching daftarPemasok:', err);
    }
  };

  const muatHarga = async () => {
    setIsLoading(true);
    const { data: daftarHarga, error } = await supabase
      .from('harga_akrilik')
      .select('*')
      .eq('pemasok', pemasokAktif);
    
    if (error) {
      console.error('Error fetching daftarHarga:', error);
    } else if (daftarHarga) {
      // Pivot data: tebal -> { tipe_id: harga }
      const pivoted: Record<string, HargaAkrilik> = {};
      daftarHarga.forEach(p => {
        if (!pivoted[p.tebal]) {
          pivoted[p.tebal] = {
            tebal: p.tebal,
            daftarHarga: {},
            pemasok: p.pemasok
          };
        }
        pivoted[p.tebal].daftarHarga[p.tipe_id] = p.harga;
      });
      setData(Object.values(pivoted));
    }
    setIsLoading(false);
  };

  const muatSemuaHarga = async () => {
    setIsLoading(true);
    const { data: daftarHarga, error } = await supabase
      .from('harga_akrilik')
      .select('*');
    
    if (error) {
      console.error('Error fetching all daftarHarga:', error);
    } else if (daftarHarga) {
      const pivoted: Record<string, HargaAkrilik> = {};
      daftarHarga.forEach(p => {
        const key = `${p.pemasok}_${p.tebal}`;
        if (!pivoted[key]) {
          pivoted[key] = {
            tebal: p.tebal,
            daftarHarga: {},
            pemasok: p.pemasok
          };
        }
        pivoted[key].daftarHarga[p.tipe_id] = p.harga;
      });
      setAllPrices(Object.values(pivoted));
    }
    setIsLoading(false);
  };

  const handleRenameSupplier = async () => {
    const trimmedName = namaPemasokBaru.trim();
    if (!trimmedName) {
      setRenameError('Nama pemasok tidak boleh kosong');
      return;
    }
    if (trimmedName === pemasokAktif) {
      setIsRenameModalOpen(false);
      return;
    }
    if (daftarPemasok.includes(trimmedName)) {
      setRenameError('Nama pemasok sudah ada');
      return;
    }

    setIsRenaming(true);
    setRenameError('');
    
    // Update in acrylic_prices_v2 table
    const { error: pricesError } = await supabase
      .from('harga_akrilik')
      .update({ pemasok: trimmedName })
      .eq('pemasok', pemasokAktif);

    if (pricesError) {
      setRenameError('Gagal mengubah nama di data harga: ' + pricesError.message);
      setIsRenaming(false);
      return;
    }

    // Update in daftarPemasok table
    const { error: supplierError } = await supabase
      .from('pemasok')
      .update({ nama: trimmedName })
      .eq('nama', pemasokAktif);
      
    if (supplierError) {
      // If table doesn't exist yet, we just ignore the error and proceed with local state update
      console.warn('Could not update daftarPemasok table (might not exist yet):', supplierError);
    }

    const updatedSuppliers = daftarPemasok.map(s => s === pemasokAktif ? trimmedName : s);
    setDaftarPemasok(updatedSuppliers);
    setPemasokAktif(trimmedName);
    setIsRenameModalOpen(false);
    setIsRenaming(false);
    muatHarga();
  };

  const handleAddSupplier = async () => {
    const trimmedName = pemasokBaruDitambah.trim();
    if (!trimmedName) {
      setManageSupplierError('Nama pemasok tidak boleh kosong');
      return;
    }
    if (daftarPemasok.includes(trimmedName)) {
      setManageSupplierError('Nama pemasok sudah ada');
      return;
    }

    setIsManagingSupplier(true);
    setManageSupplierError('');

    const { error } = await supabase.from('pemasok').insert([{ nama: trimmedName }]);
    
    if (error) {
      console.error('Error adding pemasok:', error);
      setManageSupplierError('Gagal menambahkan pemasok');
    } else {
      setDaftarPemasok(prev => [...prev, trimmedName].sort());
      setPemasokBaruDitambah('');
    }
    setIsManagingSupplier(false);
  };

  const confirmDeleteSupplier = async () => {
    if (!pemasokDihapus) return;

    setIsManagingSupplier(true);
    setManageSupplierError('');

    // Delete daftarHarga first
    const { error: pricesError } = await supabase
      .from('harga_akrilik')
      .delete()
      .eq('pemasok', pemasokDihapus);

    if (pricesError) {
      console.error('Error deleting associated daftarHarga:', pricesError);
      setManageSupplierError('Gagal menghapus data harga terkait');
      setIsManagingSupplier(false);
      return;
    }

    // Delete pemasok
    const { error: supplierError } = await supabase
      .from('pemasok')
      .delete()
      .eq('nama', pemasokDihapus);

    if (supplierError) {
      console.error('Error deleting pemasok:', supplierError);
      setManageSupplierError('Gagal menghapus pemasok');
    } else {
      const newSuppliers = daftarPemasok.filter(s => s !== pemasokDihapus);
      setDaftarPemasok(newSuppliers);
      if (pemasokAktif === pemasokDihapus) {
        setPemasokAktif(newSuppliers[0]);
      }
      setPemasokDihapus(null);
    }
    setIsManagingSupplier(false);
  };

  const filteredData = data.filter(item =>
    item.tebal.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any = a.tebal;
        let bValue: any = b.tebal;
        
        if (sortConfig.key === 'tebal') {
          aValue = parseFloat(a.tebal.replace(/[^\d.-]/g, '')) || 0;
          bValue = parseFloat(b.tebal.replace(/[^\d.-]/g, '')) || 0;
        } else {
          // It's a tipe_id sort
          aValue = a.daftarHarga[sortConfig.key] || 0;
          bValue = b.daftarHarga[sortConfig.key] || 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculator Logic
  const selectedCalcItem = data.find(item => item.tebal === calcThicknessId);
  const unitPrice = selectedCalcItem ? selectedCalcItem.daftarHarga[calcTypeId] : 0;
  
  let totalPrice = 0;
  if (unitPrice) {
    if (calcMode === 'lembar') {
      totalPrice = unitPrice * calcQty;
    } else {
      const l = Number(calcLength) || 0;
      const w = Number(calcWidth) || 0;
      const area = l * w;
      const standardArea = 122 * 244; // 29768 cm2
      totalPrice = (area / standardArea) * unitPrice * calcQty;
    }
  }

  const handleCopyPrice = () => {
    if (!unitPrice) return;
    const typeObj = daftarTipeAkrilik.find(t => t.id === calcTypeId);
    const text = calcMode === 'lembar'
      ? `📋 *Kalkulasi Akrilik (Lembar Utuh)*\n• Pemasok: ${pemasokAktif}\n• Tebal: ${calcThicknessId}\n• Tipe: ${typeObj?.nama || '-'}\n• Ukuran: 122 x 244 cm\n• Jumlah: ${calcQty} lembar\n• Total: ${formatCurrency(totalPrice)}`
      : `📋 *Kalkulasi Akrilik (Custom)*\n• Pemasok: ${pemasokAktif}\n• Tebal: ${calcThicknessId}\n• Tipe: ${typeObj?.nama || '-'}\n• Ukuran: ${calcLength} x ${calcWidth} cm\n• Jumlah: ${calcQty} pcs\n• Total: ${formatCurrency(totalPrice)}`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedPrice(true);
      setTimeout(() => setCopiedPrice(false), 2200);
    }
  };

  const handleOpenModal = (item?: HargaAkrilik) => {
    setFormErrors({});
    if (item) {
      setEditingId(item.tebal); // Using tebal as ID for the group
      const initialPrices: Record<string, string> = {};
      daftarTipeAkrilik.forEach(t => {
        initialPrices[t.id] = item.daftarHarga[t.id] ? item.daftarHarga[t.id]!.toString() : '';
      });
      setFormData({
        tebal: item.tebal,
        daftarHarga: initialPrices,
      });
    } else {
      setEditingId(null);
      const initialPrices: Record<string, string> = {};
      daftarTipeAkrilik.forEach(t => {
        initialPrices[t.id] = '';
      });
      setFormData({
        tebal: '',
        daftarHarga: initialPrices,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors: Record<string, string> = {};
    daftarTipeAkrilik.forEach(t => {
      const err = validatePriceInput(formData.daftarHarga[t.id] || '');
      if (err) errors[t.id] = err;
    });
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const updates = daftarTipeAkrilik.map(t => ({
      tebal: formData.tebal,
      tipe_id: t.id,
      harga: formData.daftarHarga[t.id] ? parseInt(formData.daftarHarga[t.id].replace(/\D/g, ''), 10) : null,
      pemasok: pemasokAktif,
    }));

    // If tebal changed during edit, we should delete the old ones first
    if (editingId && editingId !== formData.tebal) {
      await supabase.from('harga_akrilik')
        .delete()
        .eq('pemasok', pemasokAktif)
        .eq('tebal', editingId);
    }

    const { error } = await supabase.from('harga_akrilik').upsert(updates, {
      onConflict: 'tebal,tipe_id,pemasok'
    });

    if (!error) {
      muatHarga(); // Simpler to refetch to get pivoted data
    } else {
      alert('Gagal menyimpan data: ' + error.message);
    }
    
    handleCloseModal();
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (deletingId) {
      const { error } = await supabase.from('harga_akrilik')
        .delete()
        .eq('pemasok', pemasokAktif)
        .eq('tebal', deletingId);
      if (!error) {
        setData(data.filter(item => item.tebal !== deletingId));
      } else {
        alert('Gagal menghapus data: ' + error.message);
      }
    }
    setIsDeleteModalOpen(false);
    setDeletingId(null);
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
    setDeletingId(null);
  };





  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans p-2 sm:p-4 md:p-8 pb-20 sm:pb-8 mesh-bg ${isDarkMode ? 'text-zinc-100' : 'text-gray-900'}`}>
      <div className="max-w-5xl mx-auto glass-mac rounded-2xl overflow-hidden flex flex-col border border-white/40 dark:border-white/10 shadow-2xl">
        
        {/* Header / Title Bar */}
        <div className="h-14 sm:h-12 flex items-center justify-between px-3 sm:px-4 bg-white/40 dark:bg-black/50 border-b border-white/20 dark:border-white/10 shrink-0 select-none backdrop-blur-md">
          {/* Traffic lights / Mobile App Badge */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex gap-2 w-16 group">
              <div className="w-3 h-3 rounded-full bg-red-400 border border-black/10 flex items-center justify-center transition-colors"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400 border border-black/10 flex items-center justify-center transition-colors"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-400 border border-black/10 flex items-center justify-center transition-colors"></div>
            </div>
            <span className="sm:hidden font-bold text-sm tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Harga Akrilik
            </span>
          </div>

          <div className="hidden sm:block text-xs font-semibold text-gray-500 dark:text-gray-400">
            Kalkulator & Manajemen Harga Akrilik
          </div>

          {/* Real-Time Database Keep-Alive Status Badge */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={checkDbHealth}
              disabled={isPingingDb}
              title="Status Database Supabase (Klik untuk ping manual)"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                dbStatus === 'online'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : dbStatus === 'checking'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${
                dbStatus === 'online' ? 'bg-emerald-400 animate-pulse' : dbStatus === 'checking' ? 'bg-amber-400 animate-ping' : 'bg-red-500'
              }`} />
              <span className="hidden xs:inline">DB</span>
              {dbStatus === 'online' ? (
                <span>{dbLatency !== null ? `${dbLatency}ms` : 'Aktif'}</span>
              ) : dbStatus === 'checking' ? (
                <span>Ping...</span>
              ) : (
                <span>Offline</span>
              )}
              <RefreshCw className={`w-3 h-3 ml-0.5 opacity-70 ${isPingingDb ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content Pane */}
        <div className="p-3.5 sm:p-6 lg:p-8 bg-white/20 dark:bg-black/25">
          {/* Main Title & Nav Switcher */}
          <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b pb-5 transition-colors duration-300 ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
            <div className="w-full sm:w-auto">
              <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Manajemen Harga Akrilik
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5 hidden sm:block">Karya Veteran — Kalkulasi cepat dan perbandingan harga multi-supplier</p>
            </div>

            {/* Segmented Mode Switcher (Full width on mobile) */}
            <div className={`w-full sm:w-auto grid grid-cols-2 p-1 rounded-xl transition-colors duration-300 border ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white/60 border-white/40 shadow-sm'}`}>
              <button
                onClick={() => setIsComparisonMode(false)}
                className={`flex items-center justify-center gap-2 py-2 sm:py-1.5 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  !isComparisonMode
                    ? (isDarkMode ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20' : 'bg-white text-blue-700 shadow-sm')
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Manajemen
              </button>
              <button
                onClick={() => setIsComparisonMode(true)}
                className={`flex items-center justify-center gap-2 py-2 sm:py-1.5 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  isComparisonMode
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <ArrowLeftRight className="w-4 h-4" />
                Bandingkan
              </button>
            </div>
          </div>

        {!isComparisonMode && (
          <>
            {/* Toolbar Controls */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center mb-6 gap-3 sm:gap-4">
              {/* Supplier Selector and Quick Actions */}
              <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 sm:gap-3 w-full md:w-auto">
                <div className={`flex items-center justify-between border rounded-xl px-3 py-1.5 shadow-sm transition-colors duration-300 backdrop-blur-xl w-full sm:w-auto ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white/50 border-white/50'}`}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Store className={`w-4 h-4 shrink-0 ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`} />
                    <select
                      value={pemasokAktif}
                      onChange={(e) => setPemasokAktif(e.target.value)}
                      className={`text-sm border-none focus:ring-0 py-1 pl-0 pr-2 bg-transparent font-medium cursor-pointer transition-colors duration-300 w-full truncate ${isDarkMode ? 'text-zinc-100' : 'text-gray-700'}`}
                    >
                      {daftarPemasok.map(s => (
                        <option key={s} value={s} className={isDarkMode ? 'bg-zinc-900 text-white' : ''}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0 ml-1">
                    <div className={`w-px h-4 mx-1 ${isDarkMode ? 'bg-white/10' : 'bg-gray-300'}`}></div>
                    <button
                      onClick={() => {
                        setNamaPemasokBaru(pemasokAktif);
                        setRenameError('');
                        setIsRenameModalOpen(true);
                      }}
                      className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-blue-400 hover:bg-blue-500/10 active:bg-blue-500/20' : 'text-blue-500 hover:bg-blue-50'}`}
                      title="Edit Nama Supplier"
                      aria-label="Edit Nama Supplier"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setManageTypeError('');
                        setTipeBaruDitambah('');
                        setTypeToDelete(null);
                        setIsManageTypesModalOpen(true);
                      }}
                      className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-indigo-400 hover:bg-indigo-500/10 active:bg-indigo-500/20' : 'text-indigo-500 hover:bg-indigo-50'}`}
                      title="Kelola Tipe Akrilik"
                      aria-label="Kelola Tipe Akrilik"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setManageSupplierError('');
                        setPemasokBaruDitambah('');
                        setPemasokDihapus(null);
                        setIsManageSuppliersModalOpen(true);
                      }}
                      className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-amber-400 hover:bg-amber-500/10 active:bg-amber-500/20' : 'text-amber-500 hover:bg-amber-50'}`}
                      title="Kelola Supplier"
                      aria-label="Kelola Supplier"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <span className={`text-xs hidden lg:block ${isDarkMode ? 'text-zinc-500' : 'text-gray-500'} whitespace-nowrap`}>
                  Standar: 122 × 244 cm
                </span>
              </div>

              {/* Search and Add Data Button */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-60">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className={`h-4 w-4 ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`} />
                  </div>
                  <input
                    type="text"
                    placeholder="Cari tebal (cth: 2 mm)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`block w-full pl-9 pr-8 py-2 border rounded-xl leading-5 focus:outline-none focus:ring-2 sm:text-sm transition-all duration-300 backdrop-blur-xl ${
                      isDarkMode
                        ? 'bg-black/40 border-white/10 text-zinc-100 placeholder-zinc-500 focus:ring-blue-500/40 focus:border-blue-500/40'
                        : 'bg-white/50 border-white/50 placeholder-gray-500 focus:ring-gray-900 focus:border-gray-900'
                    }`}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-zinc-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => handleOpenModal()}
                  className="hidden sm:inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white h-10 px-4 whitespace-nowrap shadow-lg shadow-emerald-600/20"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Tambah Data
                </button>
              </div>
            </div>

            {/* Kalkulator Section */}
            <div className={`border rounded-2xl shadow-xl p-4 sm:p-6 mb-6 transition-all duration-300 backdrop-blur-2xl ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white/40 border-white/50'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className={`text-base sm:text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Kalkulator Harga
                    </h2>
                    <p className="text-[11px] text-zinc-400">Hitung lembar standar atau custom potong</p>
                  </div>
                </div>

                <div className={`grid grid-cols-2 p-1 rounded-xl w-full sm:w-auto transition-colors duration-300 border ${isDarkMode ? 'bg-zinc-900/90 border-white/10' : 'bg-gray-100 border-gray-200'}`}>
                  <button
                    onClick={() => setCalcMode('lembar')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${calcMode === 'lembar' ? (isDarkMode ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm') : 'text-zinc-400 hover:text-white'}`}
                  >
                    Lembar Utuh
                  </button>
                  <button
                    onClick={() => setCalcMode('custom')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${calcMode === 'custom' ? (isDarkMode ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm') : 'text-zinc-400 hover:text-white'}`}
                  >
                    Ukuran Custom
                  </button>
                </div>
              </div>

              {/* Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-zinc-300' : 'text-gray-700'}`}>
                    Ketebalan
                  </label>
                  <select
                    value={calcThicknessId}
                    onChange={(e) => setCalcThicknessId(e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm font-medium transition-all duration-300 ${
                      isDarkMode ? 'bg-zinc-900/90 border-white/10 text-zinc-100' : 'bg-white border-gray-300 text-gray-800'
                    }`}
                  >
                    <option value="" className={isDarkMode ? 'bg-zinc-900' : ''}>-- Pilih Tebal --</option>
                    {data.slice().sort((a, b) => {
                      const valA = parseFloat(a.tebal.replace(/[^\d.-]/g, '')) || 0;
                      const valB = parseFloat(b.tebal.replace(/[^\d.-]/g, '')) || 0;
                      return valA - valB;
                    }).map(item => (
                      <option key={item.tebal} value={item.tebal} className={isDarkMode ? 'bg-zinc-900' : ''}>{item.tebal}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-zinc-300' : 'text-gray-700'}`}>
                    Tipe Akrilik
                  </label>
                  <select
                    value={calcTypeId}
                    onChange={(e) => setCalcTypeId(e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm font-medium transition-all duration-300 ${
                      isDarkMode ? 'bg-zinc-900/90 border-white/10 text-zinc-100' : 'bg-white border-gray-300 text-gray-800'
                    }`}
                  >
                    {daftarTipeAkrilik.map(t => (
                      <option key={t.id} value={t.id} className={isDarkMode ? 'bg-zinc-900' : ''}>{t.nama}</option>
                    ))}
                  </select>
                </div>

                {calcMode === 'custom' ? (
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-zinc-300' : 'text-gray-700'}`}>
                      Dimensi (P × L cm)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          value={calcLength}
                          onChange={(e) => setCalcLength(e.target.value ? Number(e.target.value) : '')}
                          className={`w-full pl-3 pr-6 py-2.5 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm transition-all ${
                            isDarkMode ? 'bg-zinc-900/90 border-white/10 text-zinc-100 placeholder-zinc-500' : 'bg-white border-gray-300 text-gray-800'
                          }`}
                          placeholder="P"
                        />
                        <span className="absolute right-2 top-2.5 text-xs text-zinc-500 pointer-events-none">cm</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          value={calcWidth}
                          onChange={(e) => setCalcWidth(e.target.value ? Number(e.target.value) : '')}
                          className={`w-full pl-3 pr-6 py-2.5 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm transition-all ${
                            isDarkMode ? 'bg-zinc-900/90 border-white/10 text-zinc-100 placeholder-zinc-500' : 'bg-white border-gray-300 text-gray-800'
                          }`}
                          placeholder="L"
                        />
                        <span className="absolute right-2 top-2.5 text-xs text-zinc-500 pointer-events-none">cm</span>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-zinc-300' : 'text-gray-700'}`}>
                    Jumlah ({calcMode === 'lembar' ? 'Lembar' : 'Pcs'})
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={calcQty}
                    onChange={(e) => setCalcQty(parseInt(e.target.value) || 1)}
                    className={`w-full px-3 py-2.5 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm font-medium transition-all ${
                      isDarkMode ? 'bg-zinc-900/90 border-white/10 text-zinc-100' : 'bg-white border-gray-300 text-gray-800'
                    }`}
                  />
                </div>
              </div>

              {/* Enhanced Calculation Summary Box */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all duration-300 ${
                isDarkMode ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50/80 border-emerald-200'
              }`}>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-emerald-400 mb-1">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30">
                      {calcThicknessId || 'Pilih Tebal'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/30 text-blue-300">
                      {daftarTipeAkrilik.find(t => t.id === calcTypeId)?.nama || '-'}
                    </span>
                    <span className="text-zinc-400">
                      • {calcMode === 'lembar' ? '122 × 244 cm' : `${calcLength || 0} × ${calcWidth || 0} cm`} ({calcQty} {calcMode === 'lembar' ? 'lbr' : 'pcs'})
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-zinc-400 font-medium">Total Harga:</span>
                    <span className={`text-xl sm:text-2xl font-black tracking-tight ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                      {unitPrice ? formatCurrency(totalPrice) : 'Rp 0'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleCopyPrice}
                    disabled={!unitPrice}
                    className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      copiedPrice
                        ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20'
                        : unitPrice
                        ? (isDarkMode ? 'bg-white/10 hover:bg-white/20 text-white border-white/15' : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-300')
                        : 'opacity-40 cursor-not-allowed border-transparent text-zinc-500'
                    }`}
                  >
                    {copiedPrice ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPrice ? 'Tersalin ke Clipboard!' : 'Salin Rincian'}</span>
                  </button>
                </div>
              </div>
              
              {selectedCalcItem && !unitPrice && (
                <p className="text-xs text-amber-400 mt-3 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Harga untuk ketebalan "{calcThicknessId}" tipe "{daftarTipeAkrilik.find(t => t.id === calcTypeId)?.nama}" belum diisi di database.
                </p>
              )}
            </div>

            <div className={`border rounded-2xl overflow-hidden shadow-xl transition-all duration-300 backdrop-blur-2xl ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white/40 border-white/50'}`}>
              {/* Header Bar for Table / Card View */}
              <div className={`px-4 py-3 border-b flex items-center justify-between transition-colors duration-300 ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-black/5 bg-gray-50/50'}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-xs sm:text-sm font-semibold ${isDarkMode ? 'text-zinc-200' : 'text-gray-800'}`}>
                    Daftar Harga ({sortedData.length})
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {pemasokAktif}
                  </span>
                </div>

                {/* Mobile View Toggle Switch */}
                <div className="flex sm:hidden items-center gap-1 p-0.5 rounded-lg bg-black/40 border border-white/10">
                  <button
                    onClick={() => setMobileViewMode('card')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      mobileViewMode === 'card' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-400'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Kartu
                  </button>
                  <button
                    onClick={() => setMobileViewMode('table')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      mobileViewMode === 'table' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-400'
                    }`}
                  >
                    <Table className="w-3.5 h-3.5" />
                    Tabel
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                {/* Desktop Table */}
                <table className="w-full text-sm text-left whitespace-nowrap hidden md:table">
                  <thead className={`text-xs uppercase border-b transition-colors duration-300 ${isDarkMode ? 'border-white/10 text-zinc-300' : 'border-white/50 text-gray-600'}`}>
                    <tr>
                      <th className={`sticky left-0 z-20 backdrop-blur-xl px-4 py-3 sm:px-6 sm:py-4 font-medium border-r-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] transition-colors duration-300 ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white/40 border-white/50'}`}>
                        <div className="flex items-center gap-3">
                          <button 
                            className={`flex items-center gap-1 focus:outline-none transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-gray-900'}`}
                            onClick={() => requestSort('tebal')}
                          >
                            Tebal
                            {sortConfig?.key === 'tebal' ? (
                              sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-500" /> : <ArrowDown className="w-3 h-3 text-blue-500" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-30" />
                            )}
                          </button>
                        </div>
                      </th>
                      {daftarTipeAkrilik.map(t => (
                        <th key={t.id} className="px-4 py-3 sm:px-6 sm:py-4 font-medium text-left">
                          <button 
                            className={`flex items-center gap-1 focus:outline-none transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-gray-900'}`}
                            onClick={() => requestSort(t.id)}
                          >
                            {t.nama} (Rp)
                            {sortConfig?.key === t.id ? (
                              sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-500" /> : <ArrowDown className="w-3 h-3 text-blue-500" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-30" />
                            )}
                          </button>
                        </th>
                      ))}
                      <th className="px-4 py-3 sm:px-6 sm:py-4 font-medium text-left">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y transition-colors duration-300 ${isDarkMode ? 'divide-white/5' : 'divide-gray-200'}`}>
                    {isLoading ? (
                      <tr>
                        <td colSpan={daftarTipeAkrilik.length + 2} className="px-4 py-8 sm:px-6 text-center text-gray-500">
                          <div className="flex flex-col items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                            <p>Memuat data dari Supabase...</p>
                          </div>
                        </td>
                      </tr>
                    ) : sortedData.length === 0 ? (
                      <tr>
                        <td colSpan={daftarTipeAkrilik.length + 2} className="px-4 py-8 sm:px-6 text-center text-gray-500">
                          Belum ada data untuk supplier ini.
                        </td>
                      </tr>
                    ) : (
                      sortedData.map((item) => (
                        <tr key={item.tebal} className={`transition-all duration-200 group ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-white/60'}`}>
                          <td className={`sticky left-0 z-10 backdrop-blur-xl px-4 py-3 sm:px-6 sm:py-4 font-bold border-r-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] transition-colors duration-300 ${isDarkMode ? 'bg-black/40 text-white border-white/10' : 'bg-white/60 text-gray-900 border-white/50'}`}>
                            {item.tebal}
                          </td>
                          {daftarTipeAkrilik.map(t => (
                            <td key={t.id} className={`px-4 py-3 sm:px-6 sm:py-4 text-left ${isDarkMode ? 'text-emerald-400 font-mono' : 'text-gray-700 font-semibold font-mono'}`}>
                              {formatCurrency(item.daftarHarga[t.id])}
                            </td>
                          ))}
                          <td className="px-4 py-3 sm:px-6 sm:py-4 text-left">
                            <div className="flex items-center justify-start gap-1.5">
                              <button
                                onClick={() => handleOpenModal(item)}
                                className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                                title="Ubah"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(item.tebal)}
                                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Hapus"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Mobile View (Card Mode vs Scrollable Table Mode) */}
                <div className="block md:hidden">
                  {isLoading ? (
                    <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                      <p className="text-sm">Memuat data...</p>
                    </div>
                  ) : sortedData.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">Belum ada data untuk supplier ini.</div>
                  ) : mobileViewMode === 'card' ? (
                    /* Mobile Card View */
                    <div className="p-3 space-y-3">
                      {sortedData.map((item) => (
                        <div
                          key={item.tebal}
                          className={`p-3.5 rounded-xl border transition-all duration-200 shadow-sm ${
                            isDarkMode ? 'bg-black/30 border-white/10 hover:border-white/20' : 'bg-white/60 border-gray-200'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                              <span className={`font-bold text-base sm:text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {item.tebal}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 border border-white/10 rounded-lg p-0.5 bg-white/5">
                              <button
                                onClick={() => handleOpenModal(item)}
                                className="p-2 rounded-md text-blue-400 hover:bg-blue-500/20 active:bg-blue-500/30 transition-colors"
                                title="Edit Data"
                                aria-label="Edit Data"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <div className="w-px h-4 bg-white/10"></div>
                              <button
                                onClick={() => handleDeleteClick(item.tebal)}
                                className="p-2 rounded-md text-red-400 hover:bg-red-500/20 active:bg-red-500/30 transition-colors"
                                title="Hapus Data"
                                aria-label="Hapus Data"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {daftarTipeAkrilik.map(t => {
                              const price = item.daftarHarga[t.id];
                              return (
                                <div
                                  key={t.id}
                                  className={`p-2 rounded-lg border flex flex-col justify-between ${
                                    isDarkMode ? 'bg-zinc-900/60 border-white/5' : 'bg-white border-gray-100'
                                  }`}
                                >
                                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-0.5">
                                    {t.nama}
                                  </span>
                                  <span className={`text-xs font-mono font-semibold ${
                                    price ? (isDarkMode ? 'text-emerald-300' : 'text-emerald-700') : 'text-zinc-500 italic'
                                  }`}>
                                    {formatCurrency(price)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Mobile Scrollable Compact Table */
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left whitespace-nowrap">
                        <thead className={`text-[11px] uppercase border-b ${isDarkMode ? 'border-white/10 text-zinc-300 bg-black/40' : 'border-gray-200 text-gray-600 bg-gray-50'}`}>
                          <tr>
                            <th className={`sticky left-0 z-10 px-3 py-2.5 font-bold border-r ${isDarkMode ? 'bg-black/60 border-white/10' : 'bg-white border-gray-200'}`}>
                              Tebal
                            </th>
                            {daftarTipeAkrilik.map(t => (
                              <th key={t.id} className="px-3 py-2.5 font-semibold text-center border-r border-white/5">
                                {t.nama}
                              </th>
                            ))}
                            <th className="px-3 py-2.5 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
                          {sortedData.map((item) => (
                            <tr key={item.tebal} className={`${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                              <td className={`sticky left-0 z-10 px-3 py-2.5 font-bold border-r ${isDarkMode ? 'bg-zinc-950/80 text-white border-white/10' : 'bg-white text-gray-900 border-gray-200'}`}>
                                {item.tebal}
                              </td>
                              {daftarTipeAkrilik.map(t => (
                                <td key={t.id} className={`px-3 py-2.5 font-mono text-center border-r border-white/5 ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                                  {formatCurrency(item.daftarHarga[t.id])}
                                </td>
                              ))}
                              <td className="px-2 py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={() => handleOpenModal(item)} className="p-1 text-blue-400 hover:bg-blue-500/10 rounded">
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => handleDeleteClick(item.tebal)} className="p-1 text-red-400 hover:bg-red-500/10 rounded">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </>
        )}

        {isComparisonMode && (
          <div className="space-y-4 sm:space-y-6">
            {/* Mobile Thickness Filter Carousel */}
            {Array.from(new Set(allPrices.map(p => p.tebal))).length > 0 && (
              <div className="block md:hidden">
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <span className="text-xs font-semibold text-zinc-400">Pilih Ketebalan:</span>
                  {selectedCompareThickness !== 'all' && (
                    <button
                      onClick={() => setSelectedCompareThickness('all')}
                      className="text-xs text-blue-400 font-medium"
                    >
                      Lihat Semua
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    onClick={() => setSelectedCompareThickness('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                      selectedCompareThickness === 'all'
                        ? 'bg-blue-600 text-white shadow-md'
                        : isDarkMode ? 'bg-white/10 text-zinc-300 border border-white/10' : 'bg-white text-gray-700 border-gray-200'
                    }`}
                  >
                    Semua ({Array.from(new Set(allPrices.map(p => p.tebal))).length})
                  </button>
                  {Array.from(new Set(allPrices.map(p => p.tebal))).sort((a, b) => {
                    const valA = parseFloat((a as string).replace(/[^\d.-]/g, '')) || 0;
                    const valB = parseFloat((b as string).replace(/[^\d.-]/g, '')) || 0;
                    return valA - valB;
                  }).map(tebal => (
                    <button
                      key={tebal as string}
                      onClick={() => setSelectedCompareThickness(tebal as string)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                        selectedCompareThickness === tebal
                          ? 'bg-blue-600 text-white shadow-md'
                          : isDarkMode ? 'bg-white/10 text-zinc-300 border border-white/10' : 'bg-white text-gray-700 border-gray-200'
                      }`}
                    >
                      {tebal as string}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={`border rounded-2xl overflow-hidden shadow-xl transition-all duration-300 backdrop-blur-2xl ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white/40 border-white/50'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap hidden md:table">
                  <thead className={`text-xs uppercase border-b transition-colors duration-300 ${isDarkMode ? 'border-white/10 text-zinc-300' : 'border-white/50 text-gray-600'}`}>
                    <tr>
                      <th className={`sticky left-0 z-30 backdrop-blur-xl px-4 py-3 sm:px-6 sm:py-4 font-medium border-r-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] transition-colors duration-300 ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white/40 border-white/50'} w-32`}>
                        Tebal
                      </th>
                      {daftarPemasok.map(pemasok => (
                        <th key={pemasok} className={`px-4 py-3 sm:px-6 sm:py-4 font-medium text-center border-r min-w-[200px] transition-colors duration-300 ${isDarkMode ? 'border-white/5' : 'border-gray-100'}`}>
                          {pemasok}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y transition-colors duration-300 ${isDarkMode ? 'divide-white/5' : 'divide-gray-200'}`}>
                    {isLoading ? (
                      <tr>
                        <td colSpan={daftarPemasok.length + 1} className="px-4 py-12 text-center text-gray-500">
                          <div className="flex flex-col items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                            <p>Memuat semua data harga...</p>
                          </div>
                        </td>
                      </tr>
                    ) : Array.from(new Set(allPrices.map(p => p.tebal))).sort((a, b) => {
                        const valA = parseFloat((a as string).replace(/[^\d.-]/g, '')) || 0;
                        const valB = parseFloat((b as string).replace(/[^\d.-]/g, '')) || 0;
                        return valA - valB;
                      }).length === 0 ? (
                      <tr>
                        <td colSpan={daftarPemasok.length + 1} className="px-4 py-8 text-center text-gray-500">
                          Belum ada data untuk dibandingkan.
                        </td>
                      </tr>
                    ) : (
                      Array.from(new Set(allPrices.map(p => p.tebal))).sort((a, b) => {
                        const valA = parseFloat((a as string).replace(/[^\d.-]/g, '')) || 0;
                        const valB = parseFloat((b as string).replace(/[^\d.-]/g, '')) || 0;
                        return valA - valB;
                      }).map(tebal => {
                        // Find lowest daftarHarga for this tebal across all daftarPemasok
                        const thicknessPrices = allPrices.filter(p => p.tebal === tebal);
                        const minPrices: Record<string, number> = {};
                        daftarTipeAkrilik.forEach(t => {
                          minPrices[t.id] = Math.min(...thicknessPrices.map(p => p.daftarHarga[t.id] || Infinity));
                        });

                        return (
                          <tr key={tebal as string} className={`transition-all duration-200 group ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-white/60'}`}>
                            <td className={`sticky left-0 z-20 backdrop-blur-xl px-4 py-3 sm:px-6 sm:py-4 font-bold border-r-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] transition-colors duration-300 ${isDarkMode ? 'bg-black/20 text-white border-white/10' : 'bg-white/40 text-gray-900 border-white/50'}`}>
                              {tebal as string}
                            </td>
                            {daftarPemasok.map(pemasok => {
                              const harga = thicknessPrices.find(p => p.pemasok === pemasok);
                              return (
                                <td key={`${tebal}-${pemasok}`} className={`px-4 py-3 sm:px-6 sm:py-4 border-r align-top transition-colors duration-300 ${isDarkMode ? 'border-white/5' : 'border-gray-100'}`}>
                                  {harga ? (
                                    <div className="space-y-2">
                                      {daftarTipeAkrilik.map(t => {
                                        const tPrice = harga.daftarHarga[t.id];
                                        const isCheapest = tPrice && tPrice === minPrices[t.id] && tPrice !== Infinity;
                                        return (
                                          <div key={t.id} className="flex justify-between items-center gap-4">
                                            <span className={`text-[10px] uppercase ${isDarkMode ? 'text-zinc-500 font-medium' : 'text-gray-400 font-semibold'}`}>{t.nama}</span>
                                            <span className={`text-xs px-1.5 py-0.5 rounded-md font-mono transition-all duration-300 ${isCheapest ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30 font-semibold' : 'bg-green-100 text-green-700 ring-1 ring-green-600/20 font-semibold') : (isDarkMode ? 'text-emerald-400 font-light' : 'text-gray-600 font-medium')}`}>
                                              {formatCurrency(tPrice)}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <span className="text-zinc-500 italic text-xs">Tidak ada data</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* Mobile Card View Comparison with Filter */}
                <div className="block md:hidden">
                  {isLoading ? (
                    <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                      <p className="text-sm">Memuat semua data harga...</p>
                    </div>
                  ) : Array.from(new Set(allPrices.map(p => p.tebal))).length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">Belum ada data untuk dibandingkan.</div>
                  ) : (
                    <div className="p-3 space-y-4">
                      {Array.from(new Set(allPrices.map(p => p.tebal)))
                        .filter(t => selectedCompareThickness === 'all' || t === selectedCompareThickness)
                        .sort((a, b) => {
                          const valA = parseFloat((a as string).replace(/[^\d.-]/g, '')) || 0;
                          const valB = parseFloat((b as string).replace(/[^\d.-]/g, '')) || 0;
                          return valA - valB;
                        }).map(tebal => {
                          const thicknessPrices = allPrices.filter(p => p.tebal === tebal);
                          const minPrices: Record<string, number> = {};
                          daftarTipeAkrilik.forEach(t => {
                            minPrices[t.id] = Math.min(...thicknessPrices.map(p => p.daftarHarga[t.id] || Infinity));
                          });

                          return (
                            <div key={tebal as string} className={`rounded-xl border p-3.5 shadow-sm transition-all duration-300 ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white/70 border-gray-200'}`}>
                              <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/10">
                                <span className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  Tebal: {tebal as string}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  {thicknessPrices.length} Supplier
                                </span>
                              </div>

                              <div className="space-y-3">
                                {daftarPemasok.map(pemasok => {
                                  const harga = thicknessPrices.find(p => p.pemasok === pemasok);
                                  return (
                                    <div key={`${tebal}-${pemasok}`} className={`p-2.5 rounded-lg border ${isDarkMode ? 'bg-zinc-950/40 border-white/5' : 'bg-white border-gray-100'}`}>
                                      <div className="flex items-center justify-between mb-2">
                                        <h4 className={`text-xs font-bold flex items-center gap-1.5 ${isDarkMode ? 'text-zinc-200' : 'text-gray-800'}`}>
                                          <Store className="w-3 h-3 text-blue-400" />
                                          {pemasok}
                                        </h4>
                                        {!harga && (
                                          <span className="text-[10px] text-zinc-500 italic">Belum ada data</span>
                                        )}
                                      </div>

                                      {harga ? (
                                        <div className="grid grid-cols-2 xs:grid-cols-3 gap-1.5">
                                          {daftarTipeAkrilik.map(t => {
                                            const tPrice = harga.daftarHarga[t.id];
                                            const isCheapest = tPrice && tPrice === minPrices[t.id] && tPrice !== Infinity;
                                            return (
                                              <div
                                                key={t.id}
                                                className={`flex flex-col p-2 rounded-lg border text-left transition-all ${
                                                  isCheapest
                                                    ? 'bg-emerald-500/15 border-emerald-500/40 ring-1 ring-emerald-500/30'
                                                    : isDarkMode ? 'border-white/5 bg-zinc-900/40' : 'border-gray-100 bg-gray-50'
                                                }`}
                                              >
                                                <div className="flex items-center justify-between">
                                                  <span className="text-[9px] uppercase font-bold text-zinc-400">
                                                    {t.nama}
                                                  </span>
                                                  {isCheapest && (
                                                    <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-500 text-white font-bold">
                                                      Termurah
                                                    </span>
                                                  )}
                                                </div>
                                                <span className={`text-xs font-mono font-semibold mt-1 ${
                                                  isCheapest
                                                    ? (isDarkMode ? 'text-emerald-300' : 'text-emerald-700')
                                                    : (isDarkMode ? 'text-zinc-300' : 'text-gray-700')
                                                }`}>
                                                  {formatCurrency(tPrice)}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

              </div>
            </div>

            <div className={`flex items-center gap-2 text-xs sm:text-sm p-3 rounded-xl border ${
              isDarkMode ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <div className="w-3.5 h-3.5 bg-emerald-500 rounded shrink-0"></div>
              <span>Badge hijau menandakan harga <strong>termurah</strong> di antara seluruh supplier untuk ketebalan tersebut.</span>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Floating Action Button (FAB) */}
      {!isComparisonMode && (
        <button
          onClick={() => handleOpenModal()}
          className="fixed bottom-5 right-4 z-40 sm:hidden flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 active:from-emerald-700 active:to-teal-700 text-white py-3 px-4 rounded-full shadow-2xl active:scale-95 transition-all ring-2 ring-white/20"
          aria-label="Tambah Data Akrilik"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span className="text-xs font-bold">Tambah Data</span>
        </button>
      )}

      {/* Add / Edit Acrylic Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] sm:max-h-[92vh] flex flex-col overflow-hidden transition-all duration-300 backdrop-blur-2xl border-t sm:border border-white/10 ${isDarkMode ? 'bg-zinc-950/95' : 'bg-white/95'}`}>
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0"></div>
            
            <div className={`flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b shrink-0 transition-colors duration-300 ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
              <h2 className={`text-base sm:text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {editingId ? `Edit Akrilik (${editingId})` : 'Tambah Data Akrilik'}
              </h2>
              <button
                onClick={handleCloseModal}
                className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-zinc-300' : 'text-gray-700'}`}>
                    Ketebalan (contoh: 2 mm atau 2.0 mm)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.tebal}
                    onChange={(e) => setFormData({ ...formData, tebal: e.target.value })}
                    className={`w-full px-3.5 py-2.5 border rounded-xl shadow-sm focus:outline-none focus:ring-2 sm:text-sm font-medium transition-all duration-300 ${isDarkMode ? 'bg-zinc-900 border-white/10 text-zinc-100 focus:ring-blue-500' : 'bg-white border-gray-300 focus:ring-black'}`}
                    placeholder="Masukkan ketebalan"
                  />
                </div>
                
                {daftarTipeAkrilik.map(t => (
                  <div key={t.id}>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-zinc-300' : 'text-gray-700'}`}>
                      Harga {t.nama} (Rp)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.daftarHarga[t.id] || ''}
                      onChange={(e) => {
                        setFormData({ 
                          ...formData, 
                          daftarHarga: { ...formData.daftarHarga, [t.id]: e.target.value } 
                        });
                        if (formErrors[t.id]) {
                          const newErrors = { ...formErrors };
                          delete newErrors[t.id];
                          setFormErrors(newErrors);
                        }
                      }}
                      className={`w-full px-3.5 py-2.5 border rounded-xl shadow-sm focus:outline-none focus:ring-2 sm:text-sm font-mono transition-all duration-300 ${formErrors[t.id] ? 'border-red-400 bg-red-500/10 text-red-200' : (isDarkMode ? 'bg-zinc-900 border-white/10 text-zinc-100 focus:ring-blue-500' : 'bg-white border-gray-300 focus:ring-black')}`}
                      placeholder="Kosongkan jika tidak ada"
                    />
                    {formErrors[t.id] && (
                      <p className="mt-1.5 text-xs text-red-400 flex items-center font-medium">
                        <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                        {formErrors[t.id]}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className={`px-5 sm:px-6 py-3.5 sm:py-4 border-t border-white/10 flex justify-end gap-2.5 shrink-0 safe-bottom ${isDarkMode ? 'bg-black/40' : 'bg-gray-50'}`}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className={`flex-1 sm:flex-none px-4 py-2.5 text-sm font-semibold border rounded-xl focus:outline-none transition-all duration-300 ${isDarkMode ? 'bg-zinc-900 border-white/10 text-zinc-300 hover:bg-zinc-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 border border-transparent rounded-xl hover:bg-emerald-500 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-lg shadow-emerald-600/20 transition-all"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center transition-all duration-300 backdrop-blur-2xl border-t sm:border border-white/10 safe-bottom ${isDarkMode ? 'bg-zinc-950/95' : 'bg-white/95'}`}>
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto -mt-2 mb-4 sm:hidden"></div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3.5 ${isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'}`}>
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className={`text-lg font-bold mb-1.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Hapus Data Tebal?</h3>
            <p className={`text-xs sm:text-sm mb-6 ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
              Apakah Anda yakin ingin menghapus data ketebalan ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={cancelDelete}
                className={`flex-1 py-2.5 text-sm font-semibold border rounded-xl focus:outline-none transition-all ${isDarkMode ? 'bg-zinc-900 border-white/10 text-zinc-300 hover:bg-zinc-800' : 'bg-white border-gray-300 text-gray-700'}`}
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 active:scale-95 rounded-xl shadow-lg shadow-red-600/20 transition-all"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Supplier Modal */}
      {isRenameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transition-all duration-300 backdrop-blur-2xl border-t sm:border border-white/10 ${isDarkMode ? 'bg-zinc-950/95' : 'bg-white/95'}`}>
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden"></div>
            <div className={`px-5 sm:px-6 py-4 border-b flex justify-between items-center transition-colors duration-300 ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
              <h3 className={`text-base sm:text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Edit Nama Supplier</h3>
              <button
                onClick={() => setIsRenameModalOpen(false)}
                className={`p-1 rounded-lg transition-colors ${isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 sm:p-6 safe-bottom">
              <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-zinc-300' : 'text-gray-700'}`}>
                Nama Pemasok Baru
              </label>
              <input
                type="text"
                value={namaPemasokBaru}
                onChange={(e) => {
                  setNamaPemasokBaru(e.target.value);
                  if (renameError) setRenameError('');
                }}
                className={`w-full px-3.5 py-2.5 border rounded-xl shadow-sm focus:outline-none focus:ring-2 sm:text-sm font-medium transition-all duration-300 ${renameError ? 'border-red-400 bg-red-500/10 text-red-200' : (isDarkMode ? 'bg-zinc-900 border-white/10 text-zinc-100 focus:ring-blue-500' : 'border-gray-300 focus:ring-black')}`}
                placeholder="Masukkan nama pemasok..."
                autoFocus
              />
              {renameError && (
                <p className="mt-1.5 text-xs text-red-400 flex items-center font-medium">
                  <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                  {renameError}
                </p>
              )}
              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRenameModalOpen(false)}
                  className={`flex-1 sm:flex-none px-4 py-2.5 text-sm font-semibold border rounded-xl focus:outline-none transition-all duration-300 ${isDarkMode ? 'bg-zinc-900 border-white/10 text-zinc-300 hover:bg-zinc-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleRenameSupplier}
                  disabled={isRenaming || !namaPemasokBaru.trim() || namaPemasokBaru === pemasokAktif}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
                >
                  {isRenaming ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Suppliers Modal */}
      {isManageSuppliersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] transition-all duration-300 backdrop-blur-2xl border-t sm:border border-white/10 ${isDarkMode ? 'bg-zinc-950/95' : 'bg-white/95'}`}>
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden"></div>
            <div className={`px-5 sm:px-6 py-4 border-b flex justify-between items-center transition-colors duration-300 ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
              <h3 className={`text-base sm:text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Kelola Supplier</h3>
              <button 
                onClick={() => setIsManageSuppliersModalOpen(false)}
                className={`p-1 rounded-lg transition-colors ${isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-gray-400 hover:text-gray-500'}`}
                disabled={isManagingSupplier}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 sm:p-6 overflow-y-auto flex-1">
              {manageSupplierError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs sm:text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {manageSupplierError}
                </div>
              )}

              {/* Add New Supplier */}
              <div className="mb-6">
                <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-zinc-300' : 'text-gray-700'}`}>
                  Tambah Pemasok Baru
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pemasokBaruDitambah}
                    onChange={(e) => setPemasokBaruDitambah(e.target.value)}
                    className={`flex-1 px-3.5 py-2.5 border rounded-xl shadow-sm text-sm font-medium transition-all duration-300 focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-zinc-900 border-white/10 text-zinc-100 focus:ring-blue-500' : 'bg-white border-gray-300 focus:ring-black'}`}
                    placeholder="Nama pemasok"
                    disabled={isManagingSupplier}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddSupplier();
                    }}
                  />
                  <button
                    onClick={handleAddSupplier}
                    disabled={isManagingSupplier || !pemasokBaruDitambah.trim()}
                    className="flex items-center gap-1 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md transition-all"
                  >
                    {isManagingSupplier ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>Tambah</span>
                  </button>
                </div>
              </div>

              {/* List of Suppliers */}
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-zinc-300' : 'text-gray-700'}`}>
                  Daftar Supplier
                </label>
                <div className={`border rounded-xl divide-y max-h-56 overflow-y-auto transition-colors duration-300 ${isDarkMode ? 'border-white/10 divide-white/5' : 'border-gray-200 divide-gray-200'}`}>
                  {daftarPemasok.map(pemasok => (
                    <div key={pemasok} className={`flex items-center justify-between p-3 transition-colors duration-200 ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-zinc-200' : 'text-gray-900'}`}>{pemasok}</span>
                      <button
                        onClick={() => setPemasokDihapus(pemasok)}
                        disabled={isManagingSupplier || daftarPemasok.length <= 1}
                        className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 disabled:opacity-30 disabled:hover:bg-transparent"
                        title={daftarPemasok.length <= 1 ? "Tidak dapat menghapus pemasok terakhir" : "Hapus Supplier"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className={`px-5 sm:px-6 py-4 border-t border-white/10 flex justify-end shrink-0 safe-bottom ${isDarkMode ? 'bg-black/40' : 'bg-gray-50'}`}>
              <button
                onClick={() => setIsManageSuppliersModalOpen(false)}
                className={`w-full sm:w-auto px-5 py-2.5 text-sm font-semibold border rounded-xl focus:outline-none transition-all duration-300 ${isDarkMode ? 'bg-zinc-900 border-white/10 text-zinc-300 hover:bg-zinc-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                disabled={isManagingSupplier}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Pemasok Confirmation Modal */}
      {pemasokDihapus && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transition-all duration-300 backdrop-blur-2xl border-t sm:border border-red-500/20 safe-bottom ${isDarkMode ? 'bg-zinc-950/95' : 'bg-white/95'}`}>
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden"></div>
            <div className={`px-5 sm:px-6 py-4 border-b flex justify-between items-center transition-colors duration-300 ${isDarkMode ? 'bg-red-500/10 border-white/5' : 'bg-red-50 border-black/5'}`}>
              <h3 className={`text-base sm:text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-red-400' : 'text-red-800'}`}>
                <AlertCircle className="w-5 h-5 shrink-0" />
                Hapus Supplier
              </h3>
              <button 
                onClick={() => setPemasokDihapus(null)}
                className={`p-1 rounded-lg transition-colors ${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-400 hover:text-red-600'}`}
                disabled={isManagingSupplier}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 sm:p-6">
              <p className={`text-sm mb-3 ${isDarkMode ? 'text-zinc-300' : 'text-gray-700'}`}>
                Apakah Anda yakin ingin menghapus pemasok <strong>"{pemasokDihapus}"</strong>?
              </p>
              <p className="text-xs text-red-400 font-medium mb-5 bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">
                Peringatan: Semua data harga akrilik yang terkait dengan pemasok ini akan ikut terhapus secara permanen.
              </p>
              <div className="flex justify-end gap-2.5">
                <button
                  onClick={() => setPemasokDihapus(null)}
                  className={`flex-1 py-2.5 text-sm font-semibold border rounded-xl focus:outline-none transition-all duration-300 ${isDarkMode ? 'bg-zinc-900 border-white/10 text-zinc-300 hover:bg-zinc-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  disabled={isManagingSupplier}
                >
                  Batal
                </button>
                <button
                  onClick={confirmDeleteSupplier}
                  disabled={isManagingSupplier}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 active:scale-95 disabled:opacity-50 rounded-xl shadow-lg shadow-red-600/20"
                >
                  {isManagingSupplier ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Hapus Permanen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Types Modal */}
      {isManageTypesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transition-all duration-300 backdrop-blur-2xl border-t sm:border border-white/10 ${isDarkMode ? 'bg-zinc-950/95' : 'bg-white/95'}`}>
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden"></div>
            <div className={`px-5 sm:px-6 py-4 border-b flex justify-between items-center transition-colors duration-300 ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
              <h2 className={`text-base sm:text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Kelola Tipe Akrilik</h2>
              <button
                onClick={() => setIsManageTypesModalOpen(false)}
                className={`p-1 rounded-lg transition-colors ${isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-gray-400 hover:text-gray-500'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 sm:p-6">
              <div className="flex gap-2 mb-5">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={tipeBaruDitambah}
                    onChange={(e) => {
                      setTipeBaruDitambah(e.target.value);
                      if (manageTypeError) setManageTypeError('');
                    }}
                    className={`w-full px-3.5 py-2.5 border rounded-xl shadow-sm focus:outline-none focus:ring-2 sm:text-sm font-medium transition-all duration-300 ${manageTypeError ? 'border-red-400 bg-red-500/10 text-red-200' : (isDarkMode ? 'bg-zinc-900 border-white/10 text-zinc-100 placeholder-zinc-500 focus:ring-blue-500' : 'border-gray-300 focus:ring-black')}`}
                    placeholder="Tambah tipe baru..."
                  />
                  {manageTypeError && (
                    <p className="mt-1.5 text-xs text-red-400 flex items-center font-medium">
                      <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                      {manageTypeError}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleAddType}
                  disabled={isManagingType}
                  className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 rounded-xl shadow-md transition-all"
                >
                  {isManagingType ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {daftarTipeAkrilik.map(t => (
                  <div key={t.id} className={`flex items-center justify-between p-3 rounded-xl group transition-colors duration-200 border ${isDarkMode ? 'bg-zinc-900/60 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex-1 mr-2">
                      {editingTypeId === t.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editTypeName}
                            onChange={(e) => setEditTypeName(e.target.value)}
                            className={`w-full px-2.5 py-1 text-sm border rounded-lg focus:outline-none focus:ring-1 transition-all duration-300 ${isDarkMode ? 'bg-zinc-900 border-blue-500/50 text-white focus:ring-blue-500' : 'border-blue-400 focus:ring-blue-500'}`}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameType(t.id, editTypeName);
                              if (e.key === 'Escape') setEditingTypeId(null);
                            }}
                          />
                          <button
                            onClick={() => handleRenameType(t.id, editTypeName)}
                            className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                            title="Simpan"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingTypeId(null)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:bg-white/10 transition-colors"
                            title="Batal"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className={`text-sm font-semibold px-1 ${isDarkMode ? 'text-zinc-200' : 'text-gray-700'}`}>{t.nama}</span>
                      )}
                    </div>
                    {editingTypeId !== t.id && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingTypeId(t.id);
                            setEditTypeName(t.nama);
                          }}
                          className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/20 transition-colors"
                          title="Edit Tipe"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setTypeToDelete(t.id)}
                          className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                          title="Hapus Tipe"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className={`px-5 sm:px-6 py-4 border-t border-white/10 flex justify-end shrink-0 safe-bottom ${isDarkMode ? 'bg-black/40' : 'bg-gray-50'}`}>
              <button
                onClick={() => setIsManageTypesModalOpen(false)}
                className={`w-full sm:w-auto px-5 py-2.5 text-sm font-semibold border rounded-xl focus:outline-none transition-all duration-300 ${isDarkMode ? 'bg-zinc-900 border-white/10 text-zinc-300 hover:bg-zinc-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Type Confirmation */}
      {typeToDelete && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center transition-all duration-300 backdrop-blur-2xl border-t sm:border border-white/10 safe-bottom ${isDarkMode ? 'bg-zinc-950/95' : 'bg-white/95'}`}>
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto -mt-2 mb-4 sm:hidden"></div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3.5 ${isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'}`}>
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className={`text-lg font-bold mb-1.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Hapus Tipe Akrilik?</h3>
            <p className={`text-xs sm:text-sm mb-6 ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
              Menghapus tipe ini akan menghapus <strong>seluruh data harga</strong> yang terkait secara permanen.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setTypeToDelete(null)}
                className={`flex-1 py-2.5 text-sm font-semibold border rounded-xl focus:outline-none transition-all duration-300 ${isDarkMode ? 'bg-zinc-900 border-white/10 text-zinc-300 hover:bg-zinc-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                Batal
              </button>
              <button
                onClick={confirmDeleteType}
                disabled={isManagingType}
                className="flex-1 inline-flex items-center justify-center py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 active:scale-95 disabled:opacity-50 rounded-xl shadow-lg shadow-red-600/20"
              >
                {isManagingType ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
