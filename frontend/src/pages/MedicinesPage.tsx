import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { medicineService, CreateMedicineDto } from '../services/medicineService';
import { Medicine, Category, PaginationMeta } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Pagination } from '../components/common/Pagination';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import {
  Pill,
  Search,
  Filter,
  Plus,
  Edit2,
  FileText,
  AlertTriangle,
  Layers,
  CheckCircle,
  Tag
} from 'lucide-react';

export const MedicinesPage: React.FC = () => {
  const { isAdmin, isPharmacist } = useAuth();
  const canEdit = isAdmin || isPharmacist;

  // Data states
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [prescriptionFilter, setPrescriptionFilter] = useState<string>('all');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [formData, setFormData] = useState<CreateMedicineDto>({
    name: '',
    genericName: '',
    sku: '',
    barcode: '',
    categoryId: '',
    description: '',
    dosageForm: 'Tablet',
    strength: '',
    unit: 'Strip',
    minStockLevel: 20,
    requiresPrescription: false,
    location: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Category Modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [isCategorySaving, setIsCategorySaving] = useState(false);

  // Load Categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Load Medicines on filter change
  useEffect(() => {
    loadMedicines(1);
  }, [search, selectedCategory, stockFilter, prescriptionFilter]);

  const loadCategories = async () => {
    try {
      const data = await medicineService.getCategories();
      setCategories(data);
      if (data.length > 0 && !formData.categoryId) {
        setFormData((prev) => ({ ...prev, categoryId: data[0].id }));
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadMedicines = async (page: number = pagination.page) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await medicineService.getMedicines({
        search: search || undefined,
        categoryId: selectedCategory || undefined,
        stockFilter: stockFilter !== 'all' ? stockFilter : undefined,
        prescription: prescriptionFilter === 'all' ? undefined : prescriptionFilter === 'true',
        page,
        limit: 10
      });
      setMedicines(res.items);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load medicines');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingMedicine(null);
    setFormData({
      name: '',
      genericName: '',
      sku: `MED-${Date.now().toString().slice(-5)}`,
      barcode: '',
      categoryId: categories[0]?.id || '',
      description: '',
      dosageForm: 'Tablet',
      strength: '500mg',
      unit: 'Strip',
      minStockLevel: 20,
      requiresPrescription: false,
      location: 'Rack A-1'
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (med: Medicine) => {
    setEditingMedicine(med);
    setFormData({
      name: med.name,
      genericName: med.genericName || '',
      sku: med.sku,
      barcode: med.barcode || '',
      categoryId: med.categoryId,
      description: med.description || '',
      dosageForm: med.dosageForm,
      strength: med.strength || '',
      unit: med.unit,
      minStockLevel: med.minStockLevel,
      requiresPrescription: med.requiresPrescription,
      location: med.location || ''
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);
    try {
      if (editingMedicine) {
        await medicineService.updateMedicine(editingMedicine.id, formData);
      } else {
        await medicineService.createMedicine(formData);
      }
      setIsModalOpen(false);
      loadMedicines();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save medicine');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName) return;
    setIsCategorySaving(true);
    try {
      await medicineService.createCategory(categoryName, categoryDesc);
      setCategoryName('');
      setCategoryDesc('');
      setIsCategoryModalOpen(false);
      await loadCategories();
    } catch (err: any) {
      alert(`Failed to create category: ${err.message}`);
    } finally {
      setIsCategorySaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Pill className="h-5 w-5 text-emerald-400" />
              Medicine & Product Catalogue
            </h1>
            <Badge variant="purple" size="sm">
              {pagination.total} Registered
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Formulations, classifications, regulatory prescription status, and threshold inventory triggers.
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <Tag className="h-3.5 w-3.5 text-indigo-400" />
              Categories
            </button>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all hover:scale-105"
            >
              <Plus className="h-4 w-4" />
              Add Medicine
            </button>
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        {/* Search Input */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Search name, generic, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Stock Status Filter */}
        <div>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Stock Statuses</option>
            <option value="in_stock">In Stock (&gt;0)</option>
            <option value="low_stock">Low Stock (≤ Reorder Level)</option>
            <option value="out_of_stock">Out of Stock (0 units)</option>
          </select>
        </div>

        {/* Prescription Requirement */}
        <div>
          <select
            value={prescriptionFilter}
            onChange={(e) => setPrescriptionFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">Prescription: Any</option>
            <option value="true">Prescription Required (Rx)</option>
            <option value="false">Over-the-Counter (OTC)</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
        {isLoading ? (
          <LoadingSpinner message="Loading catalog..." fullHeight />
        ) : medicines.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-3 px-4">Medicine Name</th>
                    <th className="py-3 px-4">SKU / Code</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Dosage / Unit</th>
                    <th className="py-3 px-4 text-right">Available Stock</th>
                    <th className="py-3 px-4 text-right">Min Level</th>
                    <th className="py-3 px-4 text-center">Rx / Shelf</th>
                    {canEdit && <th className="py-3 px-4 text-center">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {medicines.map((med) => {
                    const isLow = med.totalStock <= med.minStockLevel && med.totalStock > 0;
                    const isOut = med.totalStock === 0;

                    return (
                      <tr key={med.id} className="text-slate-200 hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-white text-sm block">{med.name}</span>
                          {med.genericName && (
                            <span className="text-[11px] text-slate-400 italic block">{med.genericName}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{med.sku}</td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium text-[11px]">
                            {med.category?.name || 'General'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-emerald-400 font-semibold">{med.dosageForm}</span>
                          {med.strength && <span className="text-slate-400 ml-1">({med.strength})</span>}
                          <span className="block text-[10px] text-slate-500">per {med.unit}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-bold font-mono text-sm text-white mr-2">
                            {med.totalStock} {med.unit}s
                          </span>
                          {isOut ? (
                            <Badge variant="danger" size="sm">
                              Out
                            </Badge>
                          ) : isLow ? (
                            <Badge variant="warning" size="sm">
                              Low
                            </Badge>
                          ) : (
                            <Badge variant="success" size="sm">
                              In Stock
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">{med.minStockLevel}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {med.requiresPrescription ? (
                              <Badge variant="purple" size="sm">
                                Rx Required
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-mono">OTC</span>
                            )}
                            {med.location && (
                              <span className="text-[10px] text-slate-400 font-mono">Loc: {med.location}</span>
                            )}
                          </div>
                        </td>
                        {canEdit && (
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleOpenEdit(med)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                              title="Edit Details"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination pagination={pagination} onPageChange={(p) => loadMedicines(p)} />
          </>
        ) : (
          <EmptyState
            icon={Pill}
            title="No medicines found"
            description="Try modifying search keywords or clearing filters."
            actionText={canEdit ? 'Add New Medicine' : undefined}
            onAction={canEdit ? handleOpenAdd : undefined}
          />
        )}
      </div>

      {/* Add / Edit Medicine Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMedicine ? 'Edit Medicine Details' : 'Add Medicine to Catalogue'}
        subtitle="Manage clinical formulation properties and inventory thresholds"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveMedicine} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Brand Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white focus:border-emerald-500 focus:outline-none"
                placeholder="e.g. Amoxicillin Trihydrate"
              />
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1">Generic Name / Composition</label>
              <input
                type="text"
                value={formData.genericName || ''}
                onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white focus:border-emerald-500 focus:outline-none"
                placeholder="e.g. Amoxicillin"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1">SKU Code *</label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1">Category *</label>
              <select
                required
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white focus:border-emerald-500 focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1">Dosage Form *</label>
              <select
                value={formData.dosageForm}
                onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="Tablet">Tablet</option>
                <option value="Capsule">Capsule</option>
                <option value="Syrup">Syrup</option>
                <option value="Injection">Injection</option>
                <option value="Ointment">Ointment</option>
                <option value="Drops">Drops</option>
                <option value="Inhaler">Inhaler</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Strength (e.g. 500mg)</label>
              <input
                type="text"
                value={formData.strength || ''}
                onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1">Unit of Measure</label>
              <select
                value={formData.unit || 'Strip'}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="Strip">Strip</option>
                <option value="Bottle">Bottle</option>
                <option value="Box">Box</option>
                <option value="Vial">Vial</option>
                <option value="Tube">Tube</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1">Min Reorder Level</label>
              <input
                type="number"
                min="0"
                value={formData.minStockLevel}
                onChange={(e) => setFormData({ ...formData, minStockLevel: parseInt(e.target.value, 10) || 0 })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Storage Shelf Location</label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Shelf B-4"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="rxCheckbox"
                checked={formData.requiresPrescription}
                onChange={(e) => setFormData({ ...formData, requiresPrescription: e.target.checked })}
                className="h-4 w-4 rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="rxCheckbox" className="font-bold text-slate-200">
                Requires Doctor's Prescription (Rx)
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : editingMedicine ? 'Update Details' : 'Save to Catalogue'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Category Creation Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Add Therapeutic Category"
        subtitle="Manage medicine drug classifications"
        maxWidth="md"
      >
        <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-300 block mb-1">Category Name *</label>
            <input
              type="text"
              required
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="e.g. Antihypertensives"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="font-bold text-slate-300 block mb-1">Description</label>
            <textarea
              rows={3}
              value={categoryDesc}
              onChange={(e) => setCategoryDesc(e.target.value)}
              placeholder="Therapeutic purpose and drug class details..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCategorySaving}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              {isCategorySaving ? 'Saving...' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
