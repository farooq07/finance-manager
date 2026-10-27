import { View } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { tokens } from './tokens';

/** Something failed to load — show why and let the user retry. */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <View style={{ alignItems: 'center', paddingVertical: tokens.space.xxl, gap: tokens.space.md }}>
            <Text variant="body" style={{ textAlign: 'center' }}>{message}</Text>
            <View style={{ alignSelf: 'stretch' }}><Button label="Try again" onPress={onRetry} variant="secondary" /></View>
        </View>
    );
}
