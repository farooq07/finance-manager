import { useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { chatKey, deleteChatDocument, getChatDocuments, uploadChatDocument, type ChatDocument } from '../../api/chat';
import { apiError } from '../../api/client';
import { fmtDateLong } from '../../lib/dates';
import { Button, ListRow, Sheet, Text, useTheme } from '../../ui';

const STATUS: Record<string, string> = { ready: 'Ready', embedding: 'Reading…', failed: 'Failed' };

/** Files the assistant can quote from: loan agreements, policies, tax notes. */
export function DocumentsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const { colors } = useTheme();
    const qc = useQueryClient();
    const [uploading, setUploading] = useState(false);
    const docs = useQuery({
        queryKey: [...chatKey, 'documents'],
        queryFn: getChatDocuments,
        enabled: visible,
        // Keep checking while a file is still being read.
        refetchInterval: (q) => ((q.state.data ?? []).some((d) => d.status === 'embedding') ? 3000 : false),
    });

    async function upload() {
        const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'text/plain', 'text/markdown', 'text/csv'], copyToCacheDirectory: true });
        if (res.canceled || !res.assets?.[0]) return;
        const a = res.assets[0];
        setUploading(true);
        try {
            const r = await uploadChatDocument({ uri: a.uri, name: a.name, mimeType: a.mimeType });
            await docs.refetch();
            Alert.alert('Uploaded', r.message);
        } catch (err) {
            Alert.alert('Could not use that file', apiError(err));
        } finally {
            setUploading(false);
        }
    }

    function open(d: ChatDocument) {
        Alert.alert(d.filename, d.status === 'failed' ? d.error ?? 'Reading this file failed.' : `${STATUS[d.status] ?? d.status} · ${d.char_count.toLocaleString()} characters`, [
            { text: 'Close', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try { await deleteChatDocument(d.id); await qc.invalidateQueries({ queryKey: [...chatKey, 'documents'] }); } catch (err) { Alert.alert('Could not delete', apiError(err)); }
                },
            },
        ]);
    }

    return (
        <Sheet visible={visible} onClose={onClose} title="Your documents">
            <Text variant="caption">Upload a PDF, text or CSV file — a loan agreement, insurance policy, tax notes — and ask the assistant about it. The file itself isn't kept; only its text is stored, for you.</Text>
            {docs.isPending && <ActivityIndicator color={colors.accent} />}
            {docs.data?.length === 0 && <Text variant="caption">No documents yet.</Text>}
            {docs.data?.map((d) => (
                <ListRow key={d.id} title={d.filename}
                    subtitle={`${STATUS[d.status] ?? d.status} · ${fmtDateLong(d.created_at)}${d.truncated ? ' · first part only' : ''}`}
                    icon={<Ionicons name={d.status === 'failed' ? 'alert-circle-outline' : 'document-text-outline'} size={20} color={d.status === 'failed' ? colors.danger : colors.text} />}
                    onPress={() => open(d)} />
            ))}
            <Button label={uploading ? 'Uploading…' : 'Upload a document'} onPress={() => void upload()} disabled={uploading} />
        </Sheet>
    );
}
