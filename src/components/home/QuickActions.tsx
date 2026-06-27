import { ActionCard } from '@/components/ui/ActionCard';
import { QUICK_ACTIONS } from '@/constants/homeDashboard';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

export function QuickActions() {
  const router = useRouter();

  return (
    <View>
      {QUICK_ACTIONS.map(action => (
        <ActionCard
          key={action.id}
          icon={action.icon}
          title={action.label}
          description={action.description}
          accent={action.accent}
          onPress={() => router.push(action.route as never)}
        />
      ))}
    </View>
  );
}
