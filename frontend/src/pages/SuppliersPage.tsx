import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supplierService, CreateSupplierDto } from '../services/supplierService';
import { Supplier } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Edit2,
  FileCheck
} from 'lucide-react';

export const SuppliersPage: React.FC = () => {
  const { isAdmin, isPharmacist } = useAuth();
  const canEdit = isAdmin || isPharmacist;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<CreateSupplierDto>({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    gstin: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, [search]);

  const loadSuppliers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await supplierService.getSuppliers(search || undefined);
      setSuppliers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load suppliers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      gstin: ''
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setFormData({
      name: sup.name,
      contactPerson: sup.contactPerson || '',
      email: sup.email || '',
      phone: sup.phone,
      address: sup.address || '',
      gstin: sup.gstin || ''
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);
    try {
      if (editingSupplier) {
        await supplierService.updateSupplier(editingSupplier.id, formData);
      } else {
        await supplierService.createSupplier(formData);
      }
      setIsModalOpen(false);
      loadSuppliers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save supplier');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-400" />
              Pharmaceutical Supplier Directory
            </h1>
            <Badge variant="purple" size="sm">
              {suppliers.length} Registered Vendors
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Distributors, wholesale vendors, GSTIN verification records, and supply history.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all hover:scale-105"
          >
            <Plus className="h-4 w-4" />
            Add Supplier
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          placeholder="Search by vendor name, representative, phone, or GSTIN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-900/80 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Cards Grid */}
      {isLoading ? (
        <LoadingSpinner message="Loading supplier directory..." fullHeight />
      ) : suppliers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((sup) => (
            <div
              key={sup.id}
              className="p-5 rounded-2xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-all space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-white text-base leading-tight">{sup.name}</h3>
                    {sup.contactPerson && (
                      <span className="text-xs text-slate-400 block">Contact: {sup.contactPerson}</span>
                    )}
                  </div>
                  <Badge variant={sup.isActive ? 'success' : 'neutral'} size="sm">
                    {sup.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="font-mono">{sup.phone}</span>
                  </div>
                  {sup.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-sky-400" />
                      <span>{sup.email}</span>
                    </div>
                  )}
                  {sup.gstin && (
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-3.5 w-3.5 text-amber-400" />
                      <span className="font-mono text-[11px] text-slate-400">GST: {sup.gstin}</span>
                    </div>
                  )}
                  {sup.address && (
                    <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-400">
                      <MapPin className="h-3.5 w-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                      <span>{sup.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {canEdit && (
                <div className="pt-3 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => handleOpenEdit(sup)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit Details
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title="No suppliers found"
          description="Register suppliers to record stock purchases."
          actionText={canEdit ? 'Add Supplier' : undefined}
          onAction={canEdit ? handleOpenAdd : undefined}
        />
      )}

      {/* Add / Edit Supplier Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? 'Edit Supplier Information' : 'Register New Pharmaceutical Supplier'}
        subtitle="Maintain vendor records and tax GSTIN identification"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
              {formError}
            </div>
          )}

          <div>
            <label className="font-bold text-slate-300 block mb-1">Company / Supplier Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Apex Pharma Distributors Pvt Ltd"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Contact Person</label>
              <input
                type="text"
                value={formData.contactPerson || ''}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                placeholder="e.g. Robert Hayes"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91-9876543210"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="sales@vendor.com"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1">GSTIN Number</label>
              <input
                type="text"
                value={formData.gstin || ''}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                placeholder="27AAPCA1234A1Z5"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white font-mono uppercase focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1">Warehouse Address</label>
            <textarea
              rows={2}
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Plot 45, Industrial Estate..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
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
              {isSaving ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Register Supplier'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
