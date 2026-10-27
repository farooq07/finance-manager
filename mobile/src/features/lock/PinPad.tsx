import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Text, tokens, useTheme } from '../../ui';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

/**
 * Four dots + number pad. Calls onComplete with the 4 digits and clears
 * itself (resetKey changes clear it too, e.g. after a wrong PIN).
 */
export function PinPad({ onComplete, disabled = false, resetKey = 0 }: { onComplete: (pin: string) => void; disabled?: boolean; resetKey?: number }) {
    const { colors } = useTheme();
    const [pin, setPin] = useState('');

    useEffect(() => { setPin(''); }, [resetKey]);

    const press = (key: string) => {
        if (disabled) return;
        void Haptics.selectionAsync().catch(() => {});
        if (key === 'del') return setPin((p) => p.slice(0, -1));
        const next = (pin + key).slice(0, 4);
        setPin(next);
        if (next.length === 4) {
            setPin('');
            onComplete(next);
        }
    };

    return (
        <View style={{ alignItems: 'center', gap: tokens.space.xxl }}>
            <View style={{ flexDirection: 'row', gap: 18 }} accessibilityLabel={`${pin.length} of 4 digits entered`}>
                {[0, 1, 2, 3].map((i) => (
                    <View key={i} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: i < pin.length ? colors.text : 'transparent', borderWidth: 1.5, borderColor: colors.text }} />
                ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 264, justifyContent: 'space-between', rowGap: 14 }}>
                {KEYS.map((key, i) => key === '' ? <View key={i} style={{ width: 72, height: 72 }} /> : (
                    <Pressable
                        key={key}
                        accessibilityRole="button"
                        accessibilityLabel={key === 'del' ? 'Delete' : key}
                        onPress={() => press(key)}
                        style={({ pressed }) => ({ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? colors.cardBorder : colors.card })}
                    >
                        {key === 'del'
                            ? <Ionicons name="backspace-outline" size={24} color={colors.text} />
                            : <Text variant="title">{key}</Text>}
                    </Pressable>
                ))}
            </View>
        </View>
    );
}
