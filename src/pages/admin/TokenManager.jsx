import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../context/AlertContext';
import { Fingerprint, Plus, Trash2, Key, Copy, Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function TokenManager() {
    const [tokens, setTokens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copiedToken, setCopiedToken] = useState(null);
    const { showAlert } = useAlert();
    const { tenantId } = useAuth();

    useEffect(() => {
        if (tenantId) fetchTokens();
    }, [tenantId]);

    const fetchTokens = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('license_tokens')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTokens(data || []);
        } catch (error) {
            console.error('Error fetching tokens:', error);
            showAlert('Failed to load tokens', 'error');
        } finally {
            setLoading(false);
        }
    };

    const generateToken = async () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let newToken = '';
        for (let i = 0; i < 8; i++) {
            newToken += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        // Add hyphen for readability
        newToken = `${newToken.slice(0, 4)}-${newToken.slice(4)}`;

        try {
            const { data, error } = await supabase
                .from('license_tokens')
                .insert([{ token: newToken, tenant_id: tenantId, status: 'active' }])
                .select();

            if (error) throw error;

            setTokens([data[0], ...tokens]);
            showAlert('New token generated successfully', 'success');
        } catch (error) {
            console.error('Error generating token:', error);
            showAlert('Failed to generate token', 'error');
        }
    };

    const copyToClipboard = (token) => {
        navigator.clipboard.writeText(token);
        setCopiedToken(token);
        setTimeout(() => setCopiedToken(null), 2000);
    };

    const deleteToken = async (id) => {
        if (!confirm('Are you sure you want to delete this token? Any devices using it will be logged out.')) return;

        try {
            const { error } = await supabase
                .from('license_tokens')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setTokens(tokens.filter(t => t.id !== id));
            showAlert('Token deleted', 'success');
        } catch (error) {
            console.error('Error deleting token:', error);
            showAlert('Failed to delete token', 'error');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Fingerprint className="w-6 h-6 text-blue-600" />
                        License Tokens
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Manage access tokens for your Booth App.</p>
                </div>
                <button
                    onClick={generateToken}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Generate New Token
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500 animate-pulse">Loading tokens...</div>
                ) : tokens.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center">
                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                            <Key className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No tokens yet</h3>
                        <p className="text-gray-500 max-w-sm mb-6">
                            Generate a token to allow your devices to access your Booth App instance.
                        </p>
                        <button
                            onClick={generateToken}
                            className="bg-blue-50 text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-100 transition"
                        >
                            Generate First Token
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="py-3 px-4 font-semibold text-xs text-gray-500 uppercase tracking-wider">Token</th>
                                    <th className="py-3 px-4 font-semibold text-xs text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="py-3 px-4 font-semibold text-xs text-gray-500 uppercase tracking-wider">Created</th>
                                    <th className="py-3 px-4 font-semibold text-xs text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {tokens.map((token) => (
                                    <tr key={token.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <code className="bg-gray-100 text-gray-800 px-2 py-1 rounded font-mono font-bold tracking-wider text-base">
                                                    {token.token}
                                                </code>
                                                <button
                                                    onClick={() => copyToClipboard(token.token)}
                                                    className="text-gray-400 hover:text-blue-600 transition"
                                                    title="Copy to clipboard"
                                                >
                                                    {copiedToken === token.token ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${token.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {token.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                                            {new Date(token.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                onClick={() => deleteToken(token.id)}
                                                className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition"
                                                title="Delete Token"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
