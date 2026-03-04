import React, { useState, useEffect } from 'react';
import { Plus, Layout, Trash2, Edit2, ChevronRight, FileText, Settings, AlertCircle } from 'lucide-react';
import * as api from '../../services/api';

export default function ManageTemplates() {
    const [templates, setTemplates] = useState<api.DocumentTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<api.DocumentTemplate | null>(null);

    const [form, setForm] = useState({
        name: '',
        description: '',
        document_type: 'university',
        document_subtype: '',
        default_expiry_days: 365,
        prefix: '',
        force_auto: true,
        // Theme config fields
        background_url: '',
        seal_url: '',
        accent_color: '#6366f1',
        hide_default_border: false
    });

    useEffect(() => {
        loadTemplates();
    }, []);

    const resetForm = () => {
        setForm({
            name: '',
            description: '',
            document_type: 'university',
            document_subtype: '',
            default_expiry_days: 365,
            prefix: '',
            force_auto: true,
            background_url: '',
            seal_url: '',
            accent_color: '#6366f1',
            hide_default_border: false
        });
        setEditingTemplate(null);
    };

    async function loadTemplates() {
        try {
            setLoading(true);
            const data = await api.getTemplates();
            setTemplates(data);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        try {
            const payload = {
                name: form.name,
                description: form.description,
                document_type: form.document_type,
                document_subtype: form.document_subtype,
                default_expiry_days: form.default_expiry_days,
                nomenclature_config: {
                    prefix: form.prefix,
                    force_auto: form.force_auto
                },
                theme_config: {
                    background_url: form.background_url || undefined,
                    seal_url: form.seal_url || undefined,
                    accent_color: form.accent_color,
                    hide_default_border: form.hide_default_border
                }
            };

            if (editingTemplate) {
                await api.updateTemplate(editingTemplate.id, payload as any);
            } else {
                await api.createTemplate(payload as any);
            }

            setIsCreating(false);
            resetForm();
            loadTemplates();
        } catch (err: any) {
            alert('Failed to save: ' + err.message);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this template?')) return;
        try {
            await api.deleteTemplate(id);
            setTemplates(templates.filter(t => t.id !== id));
        } catch (err: any) {
            alert('Failed to delete: ' + err.message);
        }
    }

    const openEdit = (template: api.DocumentTemplate) => {
        setEditingTemplate(template);
        setForm({
            name: template.name,
            description: template.description || '',
            document_type: template.document_type,
            document_subtype: template.document_subtype || '',
            default_expiry_days: template.default_expiry_days || 365,
            prefix: (template.nomenclature_config as any)?.prefix || '',
            force_auto: (template.nomenclature_config as any)?.force_auto ?? true,
            background_url: template.theme_config?.background_url || '',
            seal_url: template.theme_config?.seal_url || '',
            accent_color: template.theme_config?.accent_color || '#6366f1',
            hide_default_border: template.theme_config?.hide_default_border ?? false
        });
        setIsCreating(true);
    };

    if (isCreating) {
        return (
            <div className="max-w-2xl mx-auto animate-fade-in">
                <div className="flex items-center space-x-4 mb-8">
                    <button onClick={() => { setIsCreating(false); resetForm(); }} className="p-2 hover:bg-gray-800 rounded-full text-gray-400">
                        <Plus className="w-6 h-6 rotate-45" />
                    </button>
                    <h1 className="text-2xl font-bold text-white">
                        {editingTemplate ? 'Edit Blueprint' : 'New Issuance Blueprint'}
                    </h1>
                </div>

                <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-2xl p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-400">Template Name *</label>
                            <input
                                required
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g. Bachelor's Degree Certificate"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-400">Classification *</label>
                            <select
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                                value={form.document_type}
                                onChange={e => setForm({ ...form, document_type: e.target.value })}
                            >
                                <option value="university">University</option>
                                <option value="government">Government</option>
                                <option value="professional_body">Professional Body</option>
                                <option value="corporate">Corporate</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-400">Description</label>
                        <textarea
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none h-24"
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            placeholder="Describe how this template should be used..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-400">Nomenclature Prefix</label>
                            <input
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                                value={form.prefix}
                                onChange={e => setForm({ ...form, prefix: e.target.value })}
                                placeholder="e.g. DEG-2026-"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-400">Default Validity (Days)</label>
                            <input
                                type="number"
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                                value={form.default_expiry_days}
                                onChange={e => setForm({ ...form, default_expiry_days: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                        <input
                            type="checkbox"
                            id="force_auto"
                            className="w-4 h-4 rounded border-gray-700 text-blue-600 focus:ring-blue-500"
                            checked={form.force_auto}
                            onChange={e => setForm({ ...form, force_auto: e.target.checked })}
                        />
                        <label htmlFor="force_auto" className="text-sm text-gray-300">
                            Enforce automatic number generation for this blueprint
                        </label>
                    </div>

                    <div className="space-y-6 pt-6 border-t border-gray-700">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Layout className="w-5 h-5 text-blue-400" />
                            Visual Branding
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-400">Background Image URL</label>
                                <input
                                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                                    value={form.background_url}
                                    onChange={e => setForm({ ...form, background_url: e.target.value })}
                                    placeholder="https://cdn.example.com/template-bg.png"
                                />
                                <p className="text-[10px] text-gray-500 italic">Recommended: 2000x2800px PNG/JPG</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-400">Institutional Seal URL</label>
                                <input
                                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                                    value={form.seal_url}
                                    onChange={e => setForm({ ...form, seal_url: e.target.value })}
                                    placeholder="https://cdn.example.com/official-seal.png"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-400">Accent Branding Color</label>
                                <div className="flex gap-3">
                                    <input
                                        type="color"
                                        className="w-12 h-12 bg-transparent border-none cursor-pointer"
                                        value={form.accent_color}
                                        onChange={e => setForm({ ...form, accent_color: e.target.value })}
                                    />
                                    <input
                                        className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none uppercase font-mono"
                                        value={form.accent_color}
                                        onChange={e => setForm({ ...form, accent_color: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center space-x-3 p-4 bg-gray-900/50 border border-gray-700 rounded-xl">
                                <input
                                    type="checkbox"
                                    id="hide_default_border"
                                    className="w-4 h-4 rounded border-gray-700 text-blue-600 focus:ring-blue-500"
                                    checked={form.hide_default_border}
                                    onChange={e => setForm({ ...form, hide_default_border: e.target.checked })}
                                />
                                <label htmlFor="hide_default_border" className="text-sm text-gray-300">
                                    Hide default certificate borders (for full-bleed templates)
                                </label>
                            </div>
                        </div>

                        {form.background_url && (
                            <div className="p-4 bg-gray-900 rounded-xl border border-gray-700">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Overlay Live Preview</label>
                                <div className="relative aspect-[1/1.4] w-full max-w-[200px] mx-auto bg-white rounded shadow-2xl overflow-hidden border border-gray-600">
                                    <img src={form.background_url} alt="Template" className="absolute inset-0 w-full h-full object-cover" />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                                        <div className="w-1/2 h-1 bg-black/10 mb-2" />
                                        <div className="w-3/4 h-2 bg-black/20 mb-4" />
                                        <div className="text-[6px] font-bold text-gray-800 text-center tracking-tighter" style={{ color: form.accent_color }}>RECIPIENT NAME OVERLAY</div>
                                        <div className="w-1/4 h-1 bg-black/10 mt-2" />
                                    </div>
                                    {form.seal_url && <img src={form.seal_url} alt="Seal" className="absolute top-2 right-2 w-8 h-8 object-contain" />}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end space-x-4 pt-4 border-t border-gray-700">
                        <button
                            type="button"
                            onClick={() => { setIsCreating(false); resetForm(); }}
                            className="px-6 py-3 rounded-xl text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
                        >
                            {editingTemplate ? 'Update Blueprint' : 'Save Blueprint'}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Document Templates</h1>
                    <p className="text-gray-400">Define the blueprints for your issuance portal</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span>Create Template</span>
                </button>
            </div>

            {error && (
                <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-lg flex items-center space-x-3 text-red-200">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-gray-800/50 border border-gray-700 h-48 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : templates.length === 0 ? (
                <div className="bg-gray-800/30 border border-dashed border-gray-700 rounded-xl p-12 text-center">
                    <Layout className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No templates yet</h3>
                    <p className="text-gray-400 mb-6 max-w-sm mx-auto">
                        Create your first template to standardize your document issuance and automate custom fields.
                    </p>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="text-blue-400 hover:text-blue-300 font-medium"
                    >
                        + Define New Template
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map(template => (
                        <div key={template.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all group">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-blue-500/10 rounded-lg">
                                        <FileText className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => openEdit(template)}
                                            className="p-1 hover:text-white text-gray-400"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(template.id)}
                                            className="p-1 hover:text-red-400 text-gray-400"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">{template.name}</h3>
                                <p className="text-sm text-gray-400 mb-4 line-clamp-2">{template.description || 'No description provided'}</p>

                                <div className="space-y-2">
                                    <div className="flex items-center text-xs text-gray-500">
                                        <Settings className="w-3 h-3 mr-2" />
                                        <span>{template.metadata_schema.length} custom fields defined</span>
                                    </div>
                                    <div className="flex items-center text-xs text-gray-500">
                                        <Layout className="w-3 h-3 mr-2" />
                                        <span>Type: {template.document_type}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-gray-900/50 border-t border-gray-700 flex justify-between items-center group-hover:bg-blue-600/10 transition-colors">
                                <span className="text-xs font-semibold text-gray-500 group-hover:text-blue-400">VIEW DETAILS</span>
                                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-blue-400" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
