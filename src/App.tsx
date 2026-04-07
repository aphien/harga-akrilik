import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, X, Save, Search, Loader2, Calculator, AlertCircle, Store, ArrowUpDown, ArrowUp, ArrowDown, Settings, ArrowLeftRight, LayoutDashboard, Sun, Moon } from 'lucide-react';
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

  const validatePriceInput = (value: string) => {
    if (!value.trim()) return '';
    if (!/^\d+$/.test(value.trim())) return 'Hanya boleh berisi angka (0-9)';
    return '';
  };

  useEffect(() => {
    muatPemasok();
    muatTipeAkrilik();
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
    <div className={`min-h-screen transition-colors duration-500 font-sans p-2 sm:p-4 md:p-8 mesh-bg ${isDarkMode ? 'text-zinc-100' : 'text-gray-900'}`}>
      <div className="max-w-5xl mx-auto glass-mac rounded-xl sm:rounded-2xl overflow-hidden flex flex-col border border-white/40 dark:border-white/10">
        
        {/* macOS Title Bar */}
        <div className="h-12 flex items-center px-4 bg-white/40 dark:bg-black/40 border-b border-white/20 dark:border-white/10 shrink-0 select-none backdrop-blur-md">
          <div className="flex gap-2 w-20 group">
            <div className="w-3 h-3 rounded-full bg-red-400 border border-black/10 flex items-center justify-center transition-colors"></div>
            <div className="w-3 h-3 rounded-full bg-amber-400 border border-black/10 flex items-center justify-center transition-colors"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-400 border border-black/10 flex items-center justify-center transition-colors"></div>
          </div>
          <div className="flex-1 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">Harga Akrilik</div>
          <div className="w-20 flex justify-end">
            {/* Mode Gelap Permanen */}
          </div>
        </div>

        {/* Content Pane */}
        <div className="p-4 sm:p-6 lg:p-8 bg-white/20 dark:bg-black/20">
          <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b pb-6 transition-colors duration-300 ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
            <div className="flex items-center justify-between w-full sm:w-auto">
              <div>
                <h1 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Manajemen Harga Akrilik
                </h1>
                <div className={`flex flex-wrap items-center gap-2 mt-2 p-1 rounded-lg w-full sm:w-fit transition-colors duration-300 ${isDarkMode ? 'bg-black/20' : 'bg-white/40 shadow-sm'}`}>
                  <button
                    onClick={() => setIsComparisonMode(false)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${!isComparisonMode ? (isDarkMode ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-blue-700 shadow-sm') : 'text-gray-500 hover:text-blue-600'}`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Manajemen
                  </button>
                  <button
                    onClick={() => setIsComparisonMode(true)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${isComparisonMode ? (isDarkMode ? 'bg-indigo-500 text-white shadow-sm' : 'bg-indigo-600 text-white shadow-sm') : 'text-gray-500 hover:text-indigo-600'}`}
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    Bandingkan Harga
                  </button>
                </div>
              </div>
            </div>
          </div>

        {!isComparisonMode && (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <div className="w-full sm:w-auto">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className={`flex flex-wrap items-center gap-2 border rounded-xl px-2 py-1 shadow-sm transition-colors duration-300 backdrop-blur-xl w-full sm:w-auto ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white/50 border-white/50'}`}>
                    <Store className={`w-4 h-4 ${isDarkMode ? 'text-zinc-500' : 'text-gray-500'}`} />
                    <select
                      value={pemasokAktif}
                      onChange={(e) => setPemasokAktif(e.target.value)}
                      className={`text-sm border-none focus:ring-0 py-1 pl-1 pr-2 bg-transparent font-medium cursor-pointer transition-colors duration-300 flex-1 min-w-[120px] ${isDarkMode ? 'text-zinc-100' : 'text-gray-700'}`}
                    >
                      {daftarPemasok.map(s => (
                        <option key={s} value={s} className={isDarkMode ? 'bg-zinc-900' : ''}>{s}</option>
                      ))}
                    </select>
                    <div className={`w-px h-4 mx-1 ${isDarkMode ? 'bg-white/10' : 'bg-gray-300'}`}></div>
                    <button
                      onClick={() => {
                        setNamaPemasokBaru(pemasokAktif);
                        setRenameError('');
                        setIsRenameModalOpen(true);
                      }}
                      className={`p-1 rounded-md transition-colors ${isDarkMode ? 'text-blue-400 hover:bg-blue-500/10' : 'text-blue-400 hover:bg-blue-50'}`}
                      title="Edit Nama Supplier"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setManageTypeError('');
                        setTipeBaruDitambah('');
                        setTypeToDelete(null);
                        setIsManageTypesModalOpen(true);
                      }}
                      className={`p-1 rounded-md transition-colors ${isDarkMode ? 'text-indigo-400 hover:bg-indigo-500/10' : 'text-indigo-400 hover:bg-indigo-50'}`}
                      title="Kelola Tipe Akrilik"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setManageSupplierError('');
                        setPemasokBaruDitambah('');
                        setPemasokDihapus(null);
                        setIsManageSuppliersModalOpen(true);
                      }}
                      className={`p-1 rounded-md transition-colors ${isDarkMode ? 'text-amber-400 hover:bg-amber-500/10' : 'text-amber-400 hover:bg-amber-50'}`}
                      title="Kelola Supplier"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className={`text-sm hidden sm:block ${isDarkMode ? 'text-zinc-500' : 'text-gray-500'}`}>Ukuran Standar: 122 cm x 244 cm</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className={`h-4 w-4 ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`} />
                  </div>
                  <input
                    type="text"
                    placeholder="Cari ketebalan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`block w-full pl-10 pr-3 py-2 border rounded-xl leading-5 focus:outline-none focus:ring-1 transition-all duration-300 sm:text-sm backdrop-blur-xl ${isDarkMode ? 'bg-black/40 border-white/10 text-zinc-100 placeholder-zinc-500 focus:ring-blue-500/50 focus:border-blue-500/50' : 'bg-white/50 border-white/50 placeholder-gray-500 focus:ring-gray-900 focus:border-gray-900'}`}
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">

                  <button
                    onClick={() => handleOpenModal()}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:pointer-events-none disabled:opacity-50 bg-emerald-600 text-white hover:bg-emerald-700 h-10 px-3 py-2 whitespace-nowrap shadow-sm"
                  >
                    <Plus className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Tambah Data</span>
                    <span className="sm:hidden ml-2">Tambah</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Kalkulator Section */}
            <div className={`border rounded-2xl shadow-xl p-5 sm:p-6 mb-8 transition-all duration-300 backdrop-blur-2xl ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white/40 border-white/50'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
                <h2 className={`text-lg font-semibold flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Calculator className="w-5 h-5 mr-2 text-blue-600" />
                  Kalkulator Harga
                </h2>
                <div className={`flex p-1 rounded-lg self-start sm:self-auto transition-colors duration-300 ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-100'}`}>
                  <button
                    onClick={() => setCalcMode('lembar')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${calcMode === 'lembar' ? (isDarkMode ? 'bg-zinc-700 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm') : 'text-gray-500 hover:text-blue-400'}`}
                  >
                    Lembar Utuh
                  </button>
                  <button
                    onClick={() => setCalcMode('custom')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${calcMode === 'custom' ? (isDarkMode ? 'bg-zinc-700 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm') : 'text-gray-500 hover:text-blue-400'}`}
                  >
                    Ukuran Custom
                  </button>
                </div>
              </div>

              <div className={`grid grid-cols-1 sm:grid-cols-2 ${calcMode === 'custom' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4 items-start`}>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-gray-700'}`}>Ketebalan</label>
                  <select
                    value={calcThicknessId}
                    onChange={(e) => setCalcThicknessId(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm transition-all duration-300 ${isDarkMode ? 'bg-zinc-900 border-white/10 text-zinc-100' : 'bg-white border-gray-300'}`}
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
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-gray-700'}`}>Tipe Akrilik</label>
                  <select
                    value={calcTypeId}
                    onChange={(e) => setCalcTypeId(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm transition-all duration-300 ${isDarkMode ? 'bg-zinc-900 border-white/10 text-zinc-100' : 'bg-white border-gray-300'}`}
                  >
                    {daftarTipeAkrilik.map(t => (
                      <option key={t.id} value={t.id} className={isDarkMode ? 'bg-zinc-900' : ''}>{t.nama}</option>
                    ))}
                  </select>
                </div>

                {calcMode === 'custom' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">P (cm)</label>
                      <input
                        type="number"
                        min="0"
                        value={calcLength}
                        onChange={(e) => setCalcLength(e.target.value ? Number(e.target.value) : '')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">L (cm)</label>
                      <input
                        type="number"
                        min="0"
                        value={calcWidth}
                        onChange={(e) => setCalcWidth(e.target.value ? Number(e.target.value) : '')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah</label>
                  <input
                    type="number"
                    min="1"
                    value={calcQty}
                    onChange={(e) => setCalcQty(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
                  />
                </div>

                <div className={`p-3 rounded-lg border flex flex-col justify-center h-full min-h-[62px] transition-colors duration-300 ${isDarkMode ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-blue-50 border-blue-100'}`}>
                  <span className={`text-xs font-medium mb-0.5 ${isDarkMode ? 'text-emerald-400 font-light tracking-wide' : 'text-blue-600'}`}>Total Harga</span>
                  <span className={`text-lg leading-none ${isDarkMode ? 'text-emerald-300 font-light' : 'text-blue-900 font-bold'}`}>
                    {unitPrice ? formatCurrency(totalPrice) : '-'}
                  </span>
                </div>
              </div>
              
              {selectedCalcItem && !unitPrice && (
                <p className="text-xs text-red-500 mt-3 flex items-center">
                  <X className="w-3 h-3 mr-1" /> Harga untuk tipe ini belum tersedia di database.
                </p>
              )}
            </div>

            <div className={`border rounded-2xl overflow-hidden shadow-xl transition-all duration-300 backdrop-blur-2xl ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white/40 border-white/50'}`}>
              <div className="overflow-x-auto">
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
                        <td colSpan={5} className="px-4 py-8 sm:px-6 text-center text-gray-500">
                          <div className="flex flex-col items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                            <p>Memuat data dari Supabase...</p>
                          </div>
                        </td>
                      </tr>
                    ) : sortedData.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 sm:px-6 text-center text-gray-500">
                          Belum ada data.
                        </td>
                      </tr>
                    ) : (
                      sortedData.map((item) => (
                        <tr key={item.tebal} className={`transition-all duration-200 group ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-white/60'}`}>
                          <td className={`sticky left-0 z-10 backdrop-blur-xl px-4 py-3 sm:px-6 sm:py-4 font-medium border-r-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] transition-colors duration-300 ${isDarkMode ? 'bg-black/20 text-white border-white/10' : 'bg-white/40 text-gray-900 border-white/50'}`}>
                            <div className="flex items-center gap-3">
                              <span>{item.tebal}</span>
                            </div>
                          </td>
                          {daftarTipeAkrilik.map(t => (
                            <td key={t.id} className={`px-4 py-3 sm:px-6 sm:py-4 text-left ${isDarkMode ? 'text-emerald-400 font-light' : 'text-gray-600 font-medium'}`}>
                              {formatCurrency(item.daftarHarga[t.id])}
                            </td>
                          ))}
                          <td className="px-4 py-3 sm:px-6 sm:py-4 text-left">
                            <div className="flex items-center justify-start gap-2">
                              <button
                                onClick={() => handleOpenModal(item)}
                                className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                                title="Ubah"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(item.tebal)}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
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

                {/* Mobile Card View Main Table */}
                <div className="block md:hidden">
                  {isLoading ? (
                    <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                      <p>Memuat data...</p>
                    </div>
                  ) : sortedData.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">Belum ada data.</div>
                  ) : (
                    <div className={`divide-y transition-colors duration-300 ${isDarkMode ? 'divide-white/5' : 'divide-gray-200'}`}>
                      {sortedData.map((item) => (
                        <div key={item.tebal} className={`p-4 transition-all duration-200 ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-white/40'}`}>
                          <div className="flex justify-between items-center mb-3">
                            <span className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.tebal}</span>
                            <div className="flex gap-1 border border-white/20 rounded-lg p-0.5 shadow-sm bg-white/10 dark:bg-black/20">
                              <button onClick={() => handleOpenModal(item)} className={`p-1.5 rounded-md transition-colors ${isDarkMode ? 'text-blue-400 hover:bg-blue-500/20' : 'text-blue-500 hover:bg-blue-50'}`}>
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <div className={`w-px h-4 self-center ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                              <button onClick={() => handleDeleteClick(item.tebal)} className={`p-1.5 rounded-md transition-colors ${isDarkMode ? 'text-red-400 hover:bg-red-500/20' : 'text-red-500 hover:bg-red-50'}`}>
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {daftarTipeAkrilik.map(t => (
                              <div key={t.id} className="flex justify-between items-center text-sm">
                                <span className={`font-medium ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>{t.nama}</span>
                                <span className={`${isDarkMode ? 'text-emerald-400 font-light' : 'text-gray-700 font-semibold'}`}>{formatCurrency(item.daftarHarga[t.id])}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </>
        )}

        {isComparisonMode && (
          <div className="space-y-6">
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
                                            <span className={`text-xs px-1.5 py-0.5 rounded-md transition-all duration-300 ${isCheapest ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30 font-medium' : 'bg-green-100 text-green-700 ring-1 ring-green-600/20 font-medium') : (isDarkMode ? 'text-emerald-400 font-light' : 'text-gray-600 font-medium')}`}>
                                              {formatCurrency(tPrice)}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <span className="text-gray-300 italic text-xs">Tidak ada data</span>
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

                {/* Mobile Card View Comparison */}
                <div className="block md:hidden">
                  {isLoading ? (
                    <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                      <p>Memuat semua data harga...</p>
                    </div>
                  ) : Array.from(new Set(allPrices.map(p => p.tebal))).length === 0 ? (
                    <div className="p-8 text-center text-gray-500">Belum ada data untuk dibandingkan.</div>
                  ) : (
                    <div className={`p-4 space-y-4`}>
                      {Array.from(new Set(allPrices.map(p => p.tebal))).sort((a, b) => {
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
                          <div key={tebal as string} className={`rounded-xl border p-4 shadow-sm transition-all duration-300 ${isDarkMode ? 'bg-black/30 border-white/10' : 'bg-white/60 border-white/50 backdrop-blur-md'}`}>
                            <h3 className={`font-bold text-lg mb-4 pb-2 border-b flex justify-between items-center ${isDarkMode ? 'text-white border-white/10' : 'text-gray-900 border-gray-200'}`}>
                              <span>Tebal: {tebal as string}</span>
                            </h3>
                            <div className="space-y-4">
                              {daftarPemasok.map(pemasok => {
                                const harga = thicknessPrices.find(p => p.pemasok === pemasok);
                                return (
                                  <div key={`${tebal}-${pemasok}`}>
                                    <h4 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${isDarkMode ? 'text-zinc-300' : 'text-gray-700'}`}>
                                      <Store className="w-3.5 h-3.5 opacity-70" />
                                      {pemasok}
                                    </h4>
                                    {harga ? (
                                      <div className="grid grid-cols-2 gap-2">
                                        {daftarTipeAkrilik.map(t => {
                                          const tPrice = harga.daftarHarga[t.id];
                                          const isCheapest = tPrice && tPrice === minPrices[t.id] && tPrice !== Infinity;
                                          return (
                                            <div key={t.id} className={`flex flex-col p-2.5 rounded-lg border transition-all ${isDarkMode ? 'border-white/5 bg-black/20' : 'border-gray-100/50 bg-white/70'} ${isCheapest ? (isDarkMode ? 'ring-1 ring-emerald-500/40 bg-emerald-500/10' : 'ring-1 ring-green-500/30 bg-green-50/50') : ''}`}>
                                              <span className={`text-[10px] uppercase font-bold mb-1 ${isDarkMode ? 'text-zinc-500' : 'text-gray-500'}`}>{t.nama}</span>
                                              <span className={`text-xs ${isCheapest ? (isDarkMode ? 'text-emerald-300 font-medium' : 'text-green-600 font-semibold') : (isDarkMode ? 'text-emerald-400 font-light' : 'text-gray-700 font-semibold')}`}>
                                                {formatCurrency(tPrice)}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <p className="text-xs italic px-1 opacity-50">Tidak ada data</p>
                                    )}
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
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div className="w-4 h-4 bg-green-100 ring-1 ring-green-600/20 rounded"></div>
              <span>Panel hijau menandakan harga **termurah** untuk ketebalan tersebut.</span>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className={`rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] flex flex-col overflow-hidden transition-all duration-300 backdrop-blur-2xl border ${isDarkMode ? 'bg-black/70 border-white/10' : 'bg-white/80 border-white/50'}`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 transition-colors duration-300 ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {editingId ? 'Edit Data Akrilik' : 'Tambah Data Akrilik'}
              </h2>
              <button
                onClick={handleCloseModal}
                className={`transition-colors ${isDarkMode ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-gray-700'}`}>
                  Tebal (contoh: 2.0 mm)
                </label>
                <input
                  type="text"
                  required
                  value={formData.tebal}
                  onChange={(e) => setFormData({ ...formData, tebal: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 sm:text-sm transition-all duration-300 ${isDarkMode ? 'bg-zinc-900 border-white/10 text-zinc-100 focus:ring-blue-600' : 'bg-white border-gray-300 focus:ring-black'}`}
                  placeholder="Masukkan ketebalan"
                />
              </div>
              
              {daftarTipeAkrilik.map(t => (
                <div key={t.id}>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-gray-700'}`}>
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
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 sm:text-sm transition-all duration-300 ${formErrors[t.id] ? 'border-red-300 bg-red-50 text-red-900 placeholder-red-300 focus:ring-red-500' : (isDarkMode ? 'bg-zinc-900 border-white/10 text-zinc-100 focus:ring-blue-600' : 'bg-white border-gray-300 focus:ring-black')}`}
                    placeholder="Kosongkan jika tidak ada"
                  />
                  {formErrors[t.id] && (
                    <p className="mt-1.5 text-xs text-red-600 flex items-center font-medium">
                      <AlertCircle className="w-3.5 h-3.5 mr-1" />
                      {formErrors[t.id]}
                    </p>
                  )}
                </div>
              ))}

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className={`px-4 py-2 text-sm font-medium border rounded-md focus:outline-none transition-all duration-300 ${isDarkMode ? 'bg-zinc-800 border-white/10 text-zinc-300 hover:bg-zinc-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-sm transition-all shadow-lg shadow-emerald-600/10"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className={`rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center transition-all duration-300 backdrop-blur-2xl border ${isDarkMode ? 'bg-black/70 border-white/10' : 'bg-white/80 border-white/50'}`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'}`}>
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Hapus Data</h3>
            <p className={`text-sm mb-6 ${isDarkMode ? 'text-zinc-500' : 'text-gray-500'}`}>
              Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={cancelDelete}
                className={`px-4 py-2 text-sm font-medium border rounded-md focus:outline-none transition-all duration-300 ${isDarkMode ? 'bg-zinc-800 border-white/10 text-zinc-300 hover:bg-zinc-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 shadow-lg shadow-red-600/10"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Rename Supplier Modal */}
      {isRenameModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transition-all duration-300 backdrop-blur-2xl border ${isDarkMode ? 'bg-black/70 border-white/10' : 'bg-white/80 border-white/50'}`}>
            <div className={`px-6 py-4 border-b flex justify-between items-center transition-colors duration-300 ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
              <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Edit Nama Supplier</h3>
              <button
                onClick={() => setIsRenameModalOpen(false)}
                className={`transition-colors ${isDarkMode ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-500'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-gray-700'}`}>
                Nama Pemasok Baru
              </label>
              <input
                type="text"
                value={namaPemasokBaru}
                onChange={(e) => {
                  setNamaPemasokBaru(e.target.value);
                  if (renameError) setRenameError('');
                }}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 sm:text-sm transition-all duration-300 ${renameError ? 'border-red-300 bg-red-50 text-red-900 placeholder-red-300 focus:ring-red-500' : (isDarkMode ? 'bg-zinc-900 border-white/10 text-zinc-100 focus:ring-blue-600' : 'border-gray-300 focus:ring-black')}`}
                placeholder="Masukkan nama pemasok..."
                autoFocus
              />
              {renameError && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center font-medium">
                  <AlertCircle className="w-3.5 h-3.5 mr-1" />
                  {renameError}
                </p>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRenameModalOpen(false)}
                  className={`px-4 py-2 text-sm font-medium border rounded-md focus:outline-none transition-all duration-300 ${isDarkMode ? 'bg-zinc-800 border-white/10 text-zinc-300 hover:bg-zinc-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleRenameSupplier}
                  disabled={isRenaming || !namaPemasokBaru.trim() || namaPemasokBaru === pemasokAktif}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-sm transition-all"
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] transition-all duration-300 backdrop-blur-2xl border ${isDarkMode ? 'bg-black/70 border-white/10' : 'bg-white/80 border-white/50'}`}>
            <div className={`px-6 py-4 border-b flex justify-between items-center transition-colors duration-300 ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
              <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Kelola Supplier</h3>
              <button 
                onClick={() => setIsManageSuppliersModalOpen(false)}
                className={`transition-colors ${isDarkMode ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-500'}`}
                disabled={isManagingSupplier}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {manageSupplierError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {manageSupplierError}
                </div>
              )}

              {/* Add New Supplier */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-zinc-400' : 'text-gray-700'}`}>
                  Tambah Pemasok Baru
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pemasokBaruDitambah}
                    onChange={(e) => setPemasokBaruDitambah(e.target.value)}
                    className={`flex-1 border rounded-md shadow-sm text-sm transition-all duration-300 focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-zinc-900 border-white/10 text-zinc-100 focus:ring-blue-600' : 'bg-white border-gray-300 focus:ring-black'}`}
                    placeholder="Nama pemasok"
                    disabled={isManagingSupplier}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddSupplier();
                    }}
                  />
                  <button
                    onClick={handleAddSupplier}
                    disabled={isManagingSupplier || !pemasokBaruDitambah.trim()}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-sm transition-all"
                  >
                    {isManagingSupplier ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Tambah
                  </button>
                </div>
              </div>

              {/* List of Suppliers */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-zinc-400' : 'text-gray-700'}`}>
                  Daftar Supplier
                </label>
                <div className={`border rounded-md divide-y max-h-64 overflow-y-auto transition-colors duration-300 ${isDarkMode ? 'border-white/10 divide-white/10' : 'border-gray-200 divide-gray-200'}`}>
                  {daftarPemasok.map(pemasok => (
                    <div key={pemasok} className={`flex items-center justify-between p-3 transition-colors duration-200 ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-zinc-200' : 'text-gray-900'}`}>{pemasok}</span>
                      <button
                        onClick={() => setPemasokDihapus(pemasok)}
                        disabled={isManagingSupplier || daftarPemasok.length <= 1}
                        className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:hover:bg-transparent"
                        title={daftarPemasok.length <= 1 ? "Tidak dapat menghapus pemasok terakhir" : "Hapus Supplier"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className={`px-6 py-4 border-t flex justify-end transition-colors duration-300 ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50'}`}>
              <button
                onClick={() => setIsManageSuppliersModalOpen(false)}
                className={`px-4 py-2 text-sm font-medium border rounded-md focus:outline-none transition-all duration-300 ${isDarkMode ? 'bg-zinc-800 border-white/10 text-zinc-300 hover:bg-zinc-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className={`rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transition-all duration-300 backdrop-blur-2xl border ${isDarkMode ? 'bg-black/70 border-red-500/20' : 'bg-white/80 border-red-500/20'}`}>
            <div className={`px-6 py-4 border-b flex justify-between items-center transition-colors duration-300 ${isDarkMode ? 'bg-red-500/10 border-white/5' : 'bg-red-50 border-black/5'}`}>
              <h3 className={`text-lg font-medium flex items-center gap-2 ${isDarkMode ? 'text-red-400' : 'text-red-800'}`}>
                <AlertCircle className="w-5 h-5" />
                Hapus Supplier
              </h3>
              <button 
                onClick={() => setPemasokDihapus(null)}
                className={`transition-colors ${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-400 hover:text-red-600'}`}
                disabled={isManagingSupplier}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className={`mb-4 ${isDarkMode ? 'text-zinc-300' : 'text-gray-700'}`}>
                Apakah Anda yakin ingin menghapus pemasok <strong>"{pemasokDihapus}"</strong>?
              </p>
              <p className="text-sm text-red-500 font-medium mb-4">
                Peringatan: Semua data harga akrilik yang terkait dengan pemasok ini akan ikut terhapus secara permanen.
              </p>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setPemasokDihapus(null)}
                  className={`px-4 py-2 text-sm font-medium border rounded-md focus:outline-none transition-all duration-300 ${isDarkMode ? 'bg-zinc-800 border-white/10 text-zinc-300 hover:bg-zinc-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  disabled={isManagingSupplier}
                >
                  Batal
                </button>
                <button
                  onClick={confirmDeleteSupplier}
                  disabled={isManagingSupplier}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 shadow-lg shadow-red-600/10"
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transition-all duration-300 backdrop-blur-2xl border ${isDarkMode ? 'bg-black/70 border-white/10' : 'bg-white/80 border-white/50'}`}>
            <div className={`px-6 py-4 border-b flex justify-between items-center transition-colors duration-300 ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
              <h2 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Kelola Tipe Akrilik</h2>
              <button
                onClick={() => setIsManageTypesModalOpen(false)}
                className={`transition-colors ${isDarkMode ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-500'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex gap-2 mb-6">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={tipeBaruDitambah}
                    onChange={(e) => {
                      setTipeBaruDitambah(e.target.value);
                      if (manageTypeError) setManageTypeError('');
                    }}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 sm:text-sm transition-all duration-300 ${manageTypeError ? 'border-red-300 bg-red-50 text-red-900 placeholder-red-300' : (isDarkMode ? 'bg-zinc-900 border-white/10 text-zinc-100 placeholder-zinc-500 focus:ring-blue-600' : 'border-gray-300 focus:ring-black')}`}
                    placeholder="Tambah tipe baru..."
                  />
                  {manageTypeError && (
                    <p className="mt-1.5 text-xs text-red-600 flex items-center font-medium absolute top-full left-0">
                      <AlertCircle className="w-3.5 h-3.5 mr-1" />
                      {manageTypeError}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleAddType}
                  disabled={isManagingType}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 shadow-sm shadow-indigo-600/10"
                >
                  {isManagingType ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {daftarTipeAkrilik.map(t => (
                  <div key={t.id} className={`flex items-center justify-between p-3 rounded-md group transition-colors duration-200 ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <div className="flex-1 mr-2">
                      {editingTypeId === t.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editTypeName}
                            onChange={(e) => setEditTypeName(e.target.value)}
                            className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 transition-all duration-300 ${isDarkMode ? 'bg-zinc-900 border-blue-500/50 text-white focus:ring-blue-500' : 'border-blue-400 focus:ring-blue-500'}`}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameType(t.id, editTypeName);
                              if (e.key === 'Escape') setEditingTypeId(null);
                            }}
                          />
                          <button
                            onClick={() => handleRenameType(t.id, editTypeName)}
                            className={`p-1 rounded transition-colors ${isDarkMode ? 'text-green-400 hover:bg-green-500/20' : 'text-green-600 hover:bg-green-50'}`}
                            title="Simpan"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingTypeId(null)}
                            className={`p-1 rounded transition-colors ${isDarkMode ? 'text-zinc-500 hover:bg-white/10' : 'text-gray-400 hover:bg-gray-100'}`}
                            title="Batal"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className={`text-sm font-medium px-1 transition-colors ${isDarkMode ? 'text-zinc-200' : 'text-gray-700'}`}>{t.nama}</span>
                      )}
                    </div>
                    {editingTypeId !== t.id && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingTypeId(t.id);
                            setEditTypeName(t.nama);
                          }}
                          className={`p-1 rounded transition-colors ${isDarkMode ? 'text-blue-400 hover:bg-blue-500/10' : 'text-blue-500 hover:text-blue-700'}`}
                          title="Edit Tipe"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setTypeToDelete(t.id)}
                          className={`p-1 rounded transition-colors ${isDarkMode ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:text-red-700'}`}
                          title="Hapus Tipe"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className={`px-6 py-4 border-t flex justify-end transition-colors duration-300 ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50'}`}>
              <button
                onClick={() => setIsManageTypesModalOpen(false)}
                className={`px-4 py-2 text-sm font-medium border rounded-md focus:outline-none transition-all duration-300 ${isDarkMode ? 'bg-zinc-800 border-white/10 text-zinc-300 hover:bg-zinc-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Type Confirmation */}
      {typeToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className={`rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center transition-all duration-300 backdrop-blur-2xl border ${isDarkMode ? 'bg-black/70 border-white/10' : 'bg-white/80 border-white/50'}`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'}`}>
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Hapus Tipe Akrilik?</h3>
            <p className={`text-sm mb-6 ${isDarkMode ? 'text-zinc-500' : 'text-gray-500'}`}>
              Menghapus tipe ini akan menghapus **seluruh data harga** yang terkait.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setTypeToDelete(null)}
                className={`px-4 py-2 text-sm font-medium border rounded-md focus:outline-none transition-all duration-300 ${isDarkMode ? 'bg-zinc-800 border-white/10 text-zinc-300 hover:bg-zinc-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                Batal
              </button>
              <button
                onClick={confirmDeleteType}
                disabled={isManagingType}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 shadow-lg shadow-red-600/10"
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
