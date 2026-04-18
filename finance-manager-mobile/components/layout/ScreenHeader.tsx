import { View } from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, showBack, right }: Props) {
  const router = useRouter();

  return (
    <>
      <Appbar.Header>
        {showBack && <Appbar.BackAction onPress={() => router.back()} />}
        <Appbar.Content
          title={title}
          subtitle={subtitle}
        />
        {right && <View style={{ flexDirection: 'row', alignItems: 'center' }}>{right}</View>}
      </Appbar.Header>
    </>
  );
}
