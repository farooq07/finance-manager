import { useLocalSearchParams } from 'expo-router';
import { PersonScreen } from '../../../src/features/ledger/PersonScreen';

export default function Person() {
    const { id } = useLocalSearchParams<{ id: string }>();
    return <PersonScreen id={id} />;
}
