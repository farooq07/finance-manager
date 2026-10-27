import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiError } from '../../api/client';
import {
    chatKey, createChatSession, deleteChatSession, getChatSession, getChatSessions, sendChatMessage, type ChatMessage,
} from '../../api/chat';
import { fmtDateLong } from '../../lib/dates';
import { BackHeader, Chip, ListRow, Sheet, Text, tokens, useTheme } from '../../ui';

const SUGGESTIONS = [
    'What is my net worth?',
    'How much did I spend this month?',
    'Where does most of my money go?',
    'How much Zakat do I owe?',
    'Who owes me money?',
    'How are my investments doing?',
];

type Bubble = { id: string; role: 'user' | 'assistant'; content: string; sources?: string[]; asOf?: string; failed?: boolean };

/** "getExpenseSummary" → "expense summary": which of your data an answer looked at. */
const toolLabel = (name: string) => name.replace(/^get/, '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();

/** Answers come as light Markdown; show it as plain, readable text. */
export function plainText(md: string) {
    return md
        .replace(/^#{1,6}\s*/gm, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/__(.+?)__/g, '$1')
        .replace(/^\s*[-*]\s+/gm, '• ')
        .replace(/`([^`]+)`/g, '$1')
        .trim();
}

const fromServer = (m: ChatMessage): Bubble => ({
    id: m.id,
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content,
    sources: m.tools_used?.map((t) => toolLabel(t.name)),
    asOf: m.tools_used?.[0]?.at,
});

/** Ask about your money in plain words; answers come from your own data. */
export function AssistantScreen() {
    const { colors, gradient } = useTheme();
    const qc = useQueryClient();
    const scroll = useRef<ScrollView>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [bubbles, setBubbles] = useState<Bubble[]>([]);
    const [draft, setDraft] = useState('');
    const [busy, setBusy] = useState(false);
    const [history, setHistory] = useState(false);
    const sessions = useQuery({ queryKey: [...chatKey, 'sessions'], queryFn: getChatSessions, enabled: history });

    useEffect(() => { setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50); }, [bubbles.length, busy]);

    async function send(text: string) {
        const message = text.trim();
        if (!message || busy) return;
        setDraft('');
        setBusy(true);
        // A retry replaces the failed attempt instead of stacking another copy.
        setBubbles((b) => [...b.filter((x) => !x.failed), { id: `u-${Date.now()}`, role: 'user', content: message }]);
        try {
            const id = sessionId ?? (await createChatSession()).id;
            setSessionId(id);
            const reply = await sendChatMessage(id, message);
            setBubbles((b) => [...b, {
                id: `a-${Date.now()}`, role: 'assistant', content: reply.answer,
                sources: reply.toolsUsed.map(toolLabel), asOf: reply.dataAsOf,
            }]);
            void qc.invalidateQueries({ queryKey: chatKey });
        } catch (err) {
            // Nothing is saved for a failed reply, so the same question can simply be sent again.
            setBubbles((b) => b.map((x, i) => (i === b.length - 1 ? { ...x, failed: true } : x)));
            setDraft(message);
            Alert.alert('No answer', apiError(err));
        } finally {
            setBusy(false);
        }
    }

    async function open(id: string) {
        setHistory(false);
        try {
            const s = await getChatSession(id);
            setSessionId(s.id);
            setBubbles(s.messages.filter((m) => m.role === 'user' || m.role === 'assistant').map(fromServer));
        } catch (err) {
            Alert.alert('Could not open that chat', apiError(err));
        }
    }

    function newChat() {
        setSessionId(null);
        setBubbles([]);
        setDraft('');
    }

    async function remove(id: string) {
        try {
            await deleteChatSession(id);
            if (id === sessionId) newChat();
            await qc.invalidateQueries({ queryKey: chatKey });
        } catch (err) {
            Alert.alert('Could not delete', apiError(err));
        }
    }

    const headerActions = (
        <View style={{ flexDirection: 'row', gap: tokens.space.lg }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Past chats" hitSlop={10} onPress={() => setHistory(true)}>
                <Ionicons name="time-outline" size={24} color={colors.text} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="New chat" hitSlop={10} onPress={newChat} disabled={busy}>
                <Ionicons name="create-outline" size={24} color={colors.text} />
            </Pressable>
        </View>
    );

    return (
        <LinearGradient colors={gradient as unknown as [string, string, ...string[]]} style={{ flex: 1 }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right', 'bottom']}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={{ paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.lg }}>
                        <BackHeader title="Ask AI" action={headerActions} />
                    </View>

                    <ScrollView ref={scroll} contentContainerStyle={{ padding: tokens.space.lg, gap: tokens.space.md, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                        {bubbles.length === 0 && (
                            <View style={{ gap: tokens.space.md }}>
                                <Text variant="heading">Ask about your money</Text>
                                <Text variant="caption">Answers are worked out from your own accounts, spending, investments and ledger. The AI can read your data but never changes it.</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm }}>
                                    {SUGGESTIONS.map((s) => <Chip key={s} label={s} selected={false} onPress={() => void send(s)} />)}
                                </View>
                            </View>
                        )}

                        {bubbles.map((b) => <MessageBubble key={b.id} b={b} />)}

                        {busy && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm }}>
                                <ActivityIndicator color={colors.accent} />
                                <Text variant="caption">Looking at your numbers…</Text>
                            </View>
                        )}
                    </ScrollView>

                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: tokens.space.sm, paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.sm }}>
                        <TextInput
                            value={draft}
                            onChangeText={setDraft}
                            placeholder="Ask a question…"
                            placeholderTextColor={colors.textFaint}
                            multiline
                            maxLength={2000}
                            accessibilityLabel="Your question"
                            style={{
                                flex: 1, maxHeight: 120, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
                                borderRadius: tokens.radius.field, paddingHorizontal: 14, paddingVertical: 12,
                                fontSize: 16, fontFamily: tokens.font.regular, color: colors.text,
                            }}
                        />
                        <Pressable
                            accessibilityRole="button" accessibilityLabel="Send"
                            onPress={() => void send(draft)} disabled={!draft.trim() || busy}
                            style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, opacity: !draft.trim() || busy ? 0.4 : 1 }}
                        >
                            <Ionicons name="arrow-up" size={22} color={colors.accentText} />
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>

            <Sheet visible={history} onClose={() => setHistory(false)} title="Past chats">
                {sessions.isPending && <ActivityIndicator color={colors.accent} />}
                {sessions.data && sessions.data.length === 0 && <Text variant="caption">No chats yet.</Text>}
                {sessions.data?.slice(0, 30).map((s) => (
                    <ListRow key={s.id} title={s.title || 'New chat'} subtitle={`${fmtDateLong(s.updated_at)} · ${s._count.messages} messages`}
                        onPress={() => Alert.alert(s.title || 'Chat', undefined, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => void remove(s.id) },
                            { text: 'Open', onPress: () => void open(s.id) },
                        ])} />
                ))}
            </Sheet>
        </LinearGradient>
    );
}

function MessageBubble({ b }: { b: Bubble }) {
    const { colors } = useTheme();
    const mine = b.role === 'user';
    return (
        <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '88%', gap: 4 }}>
            <View style={{
                backgroundColor: mine ? colors.accent : colors.card,
                borderRadius: tokens.radius.card, paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.md,
                borderWidth: mine ? 0 : 1, borderColor: colors.cardBorder,
            }}>
                <Text variant="body" selectable style={{ color: mine ? colors.accentText : colors.text }}>
                    {mine ? b.content : plainText(b.content)}
                </Text>
            </View>
            {b.failed && <Text variant="caption" style={{ color: colors.danger }}>Not answered — tap send to try again.</Text>}
            {!mine && b.sources && b.sources.length > 0 && (
                <Text variant="caption">Looked at: {[...new Set(b.sources)].join(', ')}{b.asOf ? ` · ${new Date(b.asOf).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}</Text>
            )}
        </View>
    );
}
