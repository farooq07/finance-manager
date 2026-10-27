import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from './Text';
import { tokens } from './tokens';
import { useTheme } from './useTheme';

type Props = { visible: boolean; onClose: () => void; title?: string; children: ReactNode };

/** Slide-up sheet for quick actions and short forms. Tap outside to close. */
export function Sheet({ visible, onClose, title, children }: Props) {
    const { colors } = useTheme();
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.35)' }} />
            <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.card, borderTopLeftRadius: tokens.radius.hero, borderTopRightRadius: tokens.radius.hero }}>
                <View style={{ alignItems: 'center', paddingTop: 10 }}>
                    <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.cardBorder }} />
                </View>
                <View style={{ padding: tokens.space.xl, gap: tokens.space.md }}>
                    {title ? <Text variant="heading" accessibilityRole="header">{title}</Text> : null}
                    {children}
                </View>
            </SafeAreaView>
        </Modal>
    );
}
