'use client';

import { useEffect, useState, FormEvent, useCallback } from 'react';
import { useToast } from '@/components/Toast';
import { LoadingSpinner } from '@/components/Loading';
import { Table, Column } from '@/components/Table';

type LinkGroup = {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export default function GroupsPage() {
  const { showToast } = useToast();
  const [groups, setGroups] = useState<LinkGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [icon, setIcon] = useState('📁');
  
  // Edit state
  const [editingGroup, setEditingGroup] = useState<LinkGroup | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<LinkGroup | null>(null);
  const [showForm, setShowForm] = useState(false);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/nexus/groups', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Failed to load groups');
      }
      const data: LinkGroup[] = await res.json();
      setGroups(data);
    } catch (err) {
      console.error(err);
      showToast('Failed to load groups', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    if (!name.trim()) {
      showToast('Group name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        description: description.trim(),
        color: color || '#3b82f6',
        icon: icon || '📁',
        sortOrder: editingGroup ? editingGroup.sortOrder : groups.length + 1,
      };

      let res;
      if (editingGroup) {
        // Update existing
        res = await fetch(`/api/nexus/groups/${editingGroup.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        // Create new
        res = await fetch('/api/nexus/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        throw new Error('Failed to save group');
      }

      showToast(
        editingGroup ? 'Group updated successfully!' : 'Group created successfully!',
        'success'
      );

      resetForm();
      await loadGroups();
    } catch (err) {
      console.error(err);
      showToast('Failed to save group', 'error');
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setName('');
    setDescription('');
    setColor('#3b82f6');
    setIcon('📁');
    setEditingGroup(null);
    setShowForm(false);
  }

  function startEdit(group: LinkGroup) {
    setEditingGroup(group);
    setName(group.name);
    setDescription(group.description || '');
    setColor(group.color || '#3b82f6');
    setIcon(group.icon || '📁');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete() {
    if (!deleteConfirm) return;

    try {
      const res = await fetch(`/api/nexus/groups/${deleteConfirm.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete group');
      }

      showToast('Group deleted successfully!', 'success');
      setDeleteConfirm(null);
      await loadGroups();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete group', 'error');
    }
  }

  const predefinedColors = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Yellow', value: '#f59e0b' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Teal', value: '#14b8a6' },
  ];

  const predefinedIcons = ['📁', '📢', '🛍️', '💬', '🎯', '⚡', '🔥', '✨', '🎨', '📊', '🔧', '🌟'];

  const columns: Column<LinkGroup>[] = [
    {
      header: 'Group',
      accessorKey: 'name',
      sortable: true,
      render: (group) => {
        const style = { backgroundColor: `${group.color}20`, color: group.color };
        return (
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg text-xl shadow-sm"
              {...{ style }}
            >
              {group.icon}
            </div>
            <div>
              <div className="font-medium text-slate-200">{group.name}</div>
              <div className="text-xs text-slate-500">Sort order: {group.sortOrder}</div>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Description',
      accessorKey: 'description',
      sortable: true,
      render: (group) => (
        <span className="text-slate-300">{group.description || <span className="text-slate-600">—</span>}</span>
      ),
    },
    {
      header: 'Created',
      accessorKey: 'createdAt',
      sortable: true,
      render: (group) => (
        <span className="text-slate-300">{new Date(group.createdAt).toLocaleDateString()}</span>
      ),
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      sortable: false,
      render: (group) => (
        <div className="flex gap-2">
          <button
            onClick={() => startEdit(group)}
            className="rounded-lg bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-400 hover:bg-sky-500/20 transition-colors"
            aria-label={`Edit ${group.name}`}
          >
            Edit
          </button>
          <button
            onClick={() => setDeleteConfirm(group)}
            className="rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/20 transition-colors"
            aria-label={`Delete ${group.name}`}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-50">Link Groups</h1>
          <p className="text-sm text-slate-400">
            Organize your links into groups for better management
          </p>
        </div>
        {!showForm && !editingGroup && (
          <button
            onClick={() => setShowForm(true)}
            className="h-9 rounded-lg bg-sky-500 px-4 text-sm font-medium text-white hover:bg-sky-600 transition-colors"
          >
            + Add Group
          </button>
        )}
      </header>

      {/* Create/Edit Form */}
      {(showForm || editingGroup) && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-lg font-semibold text-slate-50">
                {editingGroup ? 'Edit Group' : 'Create New Group'}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                aria-label="Close form"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label htmlFor="group-name" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                    Name *
                  </label>
                  <input
                    id="group-name"
                    className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 text-slate-50 outline-none placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                    placeholder="Marketing"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="group-description" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                    Description
                  </label>
                  <input
                    id="group-description"
                    className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 text-slate-50 outline-none placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                    placeholder="Marketing campaign links"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                    Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {predefinedColors.map((c) => {
                      const style = { backgroundColor: c.value };
                      return (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setColor(c.value)}
                          className={`h-8 w-8 rounded-lg transition-all ${
                            color === c.value ? 'ring-2 ring-slate-300 ring-offset-2 ring-offset-slate-900 scale-110' : 'hover:scale-105'
                          }`}
                          {...{ style }}
                          title={c.name}
                          aria-label={`Select color ${c.name}`}
                        />
                      );
                    })}
                    <div className="relative h-8 w-8 overflow-hidden rounded-lg border border-slate-700">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="absolute -left-1 -top-1 h-10 w-10 cursor-pointer border-none bg-transparent p-0"
                        aria-label="Custom color"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                    Icon
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {predefinedIcons.map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setIcon(i)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
                          icon === i
                            ? 'border-sky-500 bg-sky-500/20 text-xl'
                            : 'border-slate-700 bg-slate-950/60 hover:bg-slate-800 hover:border-slate-600'
                        }`}
                        aria-label={`Select icon ${i}`}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-sky-500 px-6 py-2 text-sm font-medium text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-sky-500/20 transition-all hover:shadow-sky-500/30 hover:-translate-y-0.5"
              >
                {saving && <LoadingSpinner size="sm" />}
                {saving ? 'Saving...' : editingGroup ? 'Update Group' : 'Create Group'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Groups Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="md" />
        </div>
      ) : (
        <Table
          data={groups}
          searchable
          searchKeys={['name', 'description']}
          pageSize={10}
          emptyMessage="No groups yet. Create one above!"
          columns={columns}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="relative w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-semibold text-slate-50">Delete Group</h2>
            <p className="mb-6 text-sm text-slate-300">
              Are you sure you want to delete <span className="font-bold text-rose-400">{deleteConfirm.name}</span>?
              <br />
              <span className="text-slate-500">Links in this group will not be deleted, only ungrouped.</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-400"
              >
                Delete Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
