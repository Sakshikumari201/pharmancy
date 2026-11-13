import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { User, Role } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  Users,
  Plus,
  Shield,
  Pill,
  CreditCard,
  Lock,
  Mail,
  UserCheck,
  UserX,
  Phone,
  ShieldAlert
} from 'lucide-react';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add User Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CASHIER' as Role,
    phone: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await authService.listUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load user roster');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    if (user.id === currentUser?.id) {
      alert('Security Protection: You cannot deactivate your own active session account.');
      return;
    }

    try {
      await authService.toggleUserStatus(user.id);
      loadUsers();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);
    try {
      await authService.registerUser(formData);
      setIsModalOpen(false);
      loadUsers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to register user');
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case 'ADMIN':
        return <Shield className="h-3.5 w-3.5 text-indigo-400" />;
      case 'PHARMACIST':
        return <Pill className="h-3.5 w-3.5 text-emerald-400" />;
      case 'CASHIER':
        return <CreditCard className="h-3.5 w-3.5 text-sky-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-400" />
              Staff Roster & Access Control (Admin RBAC)
            </h1>
            <Badge variant="purple" size="sm">
              Server-Side Guarded
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Cryptographic bcrypt password hashing, JWT bearer auth tokens, and strict role authorization.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              name: '',
              email: '',
              password: '',
              role: 'CASHIER',
              phone: ''
            });
            setFormError(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-950/40 transition-all hover:scale-105"
        >
          <Plus className="h-4 w-4" />
          Register Staff Member
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
        {isLoading ? (
          <LoadingSpinner message="Querying staff roster..." fullHeight />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Role & Access Tier</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-center">Account Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {users.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="text-slate-200 hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {getRoleIcon(u.role)}
                          <span
                            className={`font-bold text-xs ${
                              u.role === 'ADMIN'
                                ? 'text-indigo-400'
                                : u.role === 'PHARMACIST'
                                ? 'text-emerald-400'
                                : 'text-sky-400'
                            }`}
                          >
                            {u.role}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">{u.phone || 'N/A'}</td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={u.isActive ? 'success' : 'danger'} size="sm">
                          {u.isActive ? 'Active' : 'Disabled'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={isCurrent}
                          className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            u.isActive
                              ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          } disabled:opacity-30 disabled:cursor-not-allowed`}
                          title={u.isActive ? 'Deactivate Account' : 'Activate Account'}
                        >
                          {u.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register Staff Account"
        subtitle="Provision employee access with role-based authorization"
        maxWidth="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
              {formError}
            </div>
          )}

          <div>
            <label className="font-bold text-slate-300 block mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Dr. Maya Patel"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="maya@pharmacy.com"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1">Password (Min 6 chars) *</label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1">System Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="CASHIER">CASHIER (POS Only)</option>
                <option value="PHARMACIST">PHARMACIST (Clinical & Stock)</option>
                <option value="ADMIN">ADMIN (Full Authority)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1">Contact Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91-9876543210"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>
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
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-50"
            >
              {isSaving ? 'Encrypting & Storing...' : 'Register Staff Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
