import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../stores/authStore';
import { useLogout } from '../../hooks/useAuth';
import { useDues } from '../../hooks/useDues';
import { useRent } from '../../hooks/useRent';
import { useZakat } from '../../hooks/useZakat';
import { useAssets } from '../../hooks/useAssets';
import { fmtPKR } from '../../utils/currency';

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { data: dues } = useDues();
  const { data: rent } = useRent();
  const { data: zakat } = useZakat();
  const { data: assets } = useAssets();

  const totalReceivable = (dues ?? [])
    .filter((d) => d.netBalance > 0)
    .reduce((s, d) => s + d.netBalance, 0);
  const totalPayable = (dues ?? [])
    .filter((d) => d.netBalance < 0)
    .reduce((s, d) => s + Math.abs(d.netBalance), 0);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const sections = [
    {
      title: 'Finance',
      items: [
        {
          label: 'Dues Ledger',
          icon: 'account-multiple' as const,
          color: '#8B5CF6',
          route: '/dues',
          badge: dues ? `${dues.length} persons` : undefined,
        },
        {
          label: 'Rental Income',
          icon: 'home' as const,
          color: '#F59E0B',
          route: '/rent',
          badge: rent?.entries?.length ? fmtPKR(rent.totalReceived) : undefined,
        },
        {
          label: 'Zakat',
          icon: 'heart' as const,
          color: '#10B981',
          route: '/zakat',
          badge: zakat ? fmtPKR(zakat.currentYearTotal) : undefined,
        },
        {
          label: 'Physical Assets',
          icon: 'diamond' as const,
          color: '#F97316',
          route: '/assets',
          badge: assets ? fmtPKR(assets.totalValue) : undefined,
        },
      ],
    },
    {
      title: 'Settings',
      items: [
        {
          label: 'Broker Account',
          icon: 'briefcase' as const,
          color: '#6366F1',
          route: '/broker',
          badge: undefined,
        },
        {
          label: 'Change PIN',
          icon: 'lock' as const,
          color: '#64748B',
          route: '/change-pin',
          badge: undefined,
        },
      ],
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Profile */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() ?? 'U'}</Text>
        </View>
        <View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
      </View>

      {/* Quick stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: Colors.success }]}>{fmtPKR(totalReceivable)}</Text>
          <Text style={styles.statLabel}>Receivable</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: Colors.danger }]}>{fmtPKR(totalPayable)}</Text>
          <Text style={styles.statLabel}>Payable</Text>
        </View>
      </View>

      {/* Menu sections */}
      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.menuCard}>
            {section.items.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuRow, i < section.items.length - 1 && styles.menuRowBorder]}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIcon, { backgroundColor: item.color + '18' }]}>
                  <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                {item.badge && <Text style={styles.menuBadge}>{item.badge}</Text>}
                <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <MaterialCommunityIcons name="logout" size={20} color={Colors.danger} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    margin: 16, backgroundColor: Colors.surface, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: Colors.border,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#fff' },
  userName: { fontSize: 17, fontWeight: '700', color: Colors.text },
  userEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  statsRow: {
    flexDirection: 'row', marginHorizontal: 16,
    backgroundColor: Colors.surface, borderRadius: 12,
    padding: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 8,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.border, marginHorizontal: 8 },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  menuCard: { backgroundColor: Colors.surface, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.text },
  menuBadge: { fontSize: 13, color: Colors.textSecondary, marginRight: 4 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 24, padding: 14,
    borderRadius: 12, backgroundColor: Colors.dangerTint, borderWidth: 1, borderColor: Colors.dangerTintBorder,
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: Colors.danger },
});
