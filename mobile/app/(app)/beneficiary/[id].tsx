import { useLocalSearchParams } from 'expo-router';
import { BeneficiaryScreen } from '../../../src/features/beneficiaries/BeneficiaryScreen';

export default function Beneficiary() {
    const { id } = useLocalSearchParams<{ id: string }>();
    return <BeneficiaryScreen id={id} />;
}
