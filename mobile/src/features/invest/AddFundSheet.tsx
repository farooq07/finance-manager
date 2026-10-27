import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiError } from '../../api/client';
import { addMutualFund } from '../../api/invest';
import { fmtPKR } from '../../lib/currency';
import { parseBalance } from '../../lib/parseBalance';
import { Button, Field, Sheet, Text } from '../../ui';

/** Add a mutual fund holding by hand: units, today's NAV and what you put in. */
export function AddFundSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const qc = useQueryClient();
    const [name, setName] = useState('');
    const [symbol, setSymbol] = useState('');
    const [units, setUnits] = useState('');
    const [nav, setNav] = useState('');
    const [invested, setInvested] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const u = parseBalance(units);
    const n = parseBalance(nav);
    const i = parseBalance(invested);

    async function save() {
        if (u.error || !u.value) return setError(u.error ?? 'Enter the units you hold');
        if (n.error || !n.value) return setError(n.error ?? 'Enter the current NAV');
        if (i.error || !i.value) return setError(i.error ?? 'Enter how much you invested');
        setBusy(true);
        setError(null);
        try {
            await addMutualFund({
                fund_name: name.trim(), fund_symbol: (symbol.trim() || name.trim()).toUpperCase().slice(0, 50),
                units: u.value, current_nav: n.value, invested_amount: i.value,
            });
            await qc.invalidateQueries();
            setName(''); setSymbol(''); setUnits(''); setNav(''); setInvested('');
            onClose();
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Sheet visible={visible} onClose={onClose} title="Add a mutual fund">
            <Field label="Fund name" value={name} onChangeText={setName} placeholder="e.g. Meezan Islamic Fund" />
            <Field label="Short code (optional)" value={symbol} onChangeText={setSymbol} autoCapitalize="characters" placeholder="e.g. MIF" />
            <Field label="Units" value={units} onChangeText={setUnits} keyboardType="decimal-pad" />
            <Field label="Current NAV (PKR per unit)" value={nav} onChangeText={setNav} keyboardType="decimal-pad" />
            <Field label="Amount invested (PKR)" value={invested} onChangeText={setInvested} keyboardType="decimal-pad" error={error} />
            {u.value && n.value ? <Text variant="caption">Worth {fmtPKR(u.value * n.value)} today</Text> : null}
            <Button label="Save fund" onPress={save} loading={busy} disabled={!name.trim() || !units || !nav || !invested || busy} />
        </Sheet>
    );
}
