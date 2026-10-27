import { act } from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { QueryClient } from '@tanstack/react-query';
import { useSession } from '../sessionStore';
import { useClearCacheOnSignOut } from '../useClearCacheOnSignOut';

function Probe({ client }: { client: QueryClient }) {
    useClearCacheOnSignOut(client);
    return <Text>probe</Text>;
}

describe('useClearCacheOnSignOut', () => {
    it('cache is cleared on sign-out', async () => {
        const client = new QueryClient();
        client.setQueryData(['banks'], [{ id: 'b1' }]);
        useSession.setState({ status: 'signedIn', user: { id: 'u1', role: 'user' } });
        await render(<Probe client={client} />);
        expect(client.getQueryData(['banks'])).toBeDefined();

        await act(async () => { useSession.setState({ status: 'signedOut', user: null }); });

        expect(client.getQueryData(['banks'])).toBeUndefined();
    });

    it('keeps the cache while signed in', async () => {
        const client = new QueryClient();
        client.setQueryData(['banks'], [{ id: 'b1' }]);
        useSession.setState({ status: 'signedIn', user: { id: 'u1', role: 'user' } });
        await render(<Probe client={client} />);
        await act(async () => { useSession.setState({ offline: true }); });
        expect(client.getQueryData(['banks'])).toBeDefined();
    });
});
