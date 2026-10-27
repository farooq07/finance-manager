import { Screen, EmptyState, Text } from '../../ui';

export const COMING_SOON = 'Coming in the next update';

/** Placeholder for areas built in later sub-projects — no dead links. */
export function ComingSoon({ title }: { title: string }) {
    return (
        <Screen>
            <Text variant="title" accessibilityRole="header">{title}</Text>
            <EmptyState title="Not here yet" message={COMING_SOON} />
        </Screen>
    );
}
