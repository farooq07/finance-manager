import { useLocalSearchParams } from 'expo-router';
import { LoanScreen } from '../../../src/features/ledger/LoanScreen';

export default function Loan() {
    const { id } = useLocalSearchParams<{ id: string }>();
    return <LoanScreen id={id} />;
}
