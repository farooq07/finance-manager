import { View } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { tokens } from './tokens';

type Props = { title: string; message: string; action?: { label: string; onPress: () => void } };

/** Nothing to show yet — say why and offer the next step. */
export function EmptyState({ title, message, action }: Props) {
    return (
        <View style={{ alignItems: 'center', paddingVertical: tokens.space.xxl, gap: tokens.space.sm }}>
            <Text variant="heading">{title}</Text>
            <Text variant="caption" style={{ textAlign: 'center' }}>{message}</Text>
            {action && <View style={{ alignSelf: 'stretch', marginTop: tokens.space.md }}><Button label={action.label} onPress={action.onPress} variant="secondary" /></View>}
        </View>
    );
}
