import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../context/AlertContext';
import { Fingerprint, Plus, Trash2, Key, Copy, Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Skeleton } from '../../components/ui/skeleton';

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
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Fingerprint className="w-6 h-6 text-primary" />
                        License Tokens
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">Manage access tokens for your Booth App.</p>
                </div>
                <Button onClick={generateToken}>
                    <Plus className="h-4 w-4" />
                    Generate New Token
                </Button>
            </div>

            <Card>
                {loading ? (
                    <div className="p-8 space-y-3">
                        {[1, 2].map(i => (
                            <div key={i} className="flex items-center gap-4">
                                <Skeleton className="h-8 w-32" />
                                <Skeleton className="h-6 w-16 rounded-full" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                        ))}
                    </div>
                ) : tokens.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center">
                        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                            <Key className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No tokens yet</h3>
                        <p className="text-muted-foreground max-w-sm mb-6">
                            Generate a token to allow your devices to access your Booth App instance.
                        </p>
                        <Button variant="outline" onClick={generateToken}>
                            Generate First Token
                        </Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Token</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tokens.map((token) => (
                                <TableRow key={token.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <code className="bg-muted px-2 py-1 rounded font-mono font-semibold tracking-wider">
                                                {token.token}
                                            </code>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => copyToClipboard(token.token)}
                                                title="Copy to clipboard"
                                            >
                                                {copiedToken === token.token ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={token.status === 'active' ? 'success' : 'destructive'}>
                                            {token.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {new Date(token.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            onClick={() => deleteToken(token.id)}
                                            title="Delete Token"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>
        </div>
    );
}
