import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import {
  Smartphone,
  Wifi,
  Zap,
  Droplet,
  type LucideProps,
} from 'lucide-react-native';
import { Colors, Fonts, Radius, Spacing, Shadow, FontSizes } from '@/lib/theme';

const iconMap: Record<string, React.ComponentType<LucideProps>> = {
  Smartphone,
  Wifi,
  Zap,
  Droplet,
};

type Props = {
  iconName: string;
  name: string;
  description?: string;
  brandColor: string;
  onPress: () => void;
  size?: 'small' | 'large';
};

export function ServiceCard({ iconName, name, description, brandColor, onPress, size = 'large' }: Props) {
  const Icon = iconMap[iconName] ?? Smartphone;
  const isLarge = size === 'large';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.card,
        isLarge ? styles.cardLarge : styles.cardSmall,
        Shadow.sm,
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          isLarge ? styles.iconLarge : styles.iconSmall,
          { backgroundColor: brandColor + '18' },
        ]}
      >
        <Icon size={isLarge ? 32 : 24} color={brandColor} strokeWidth={2} />
      </View>
      <View style={styles.textContainer}>
        <Text
          style={[
            styles.name,
            isLarge ? styles.nameLarge : styles.nameSmall,
          ]}
          numberOfLines={1}
        >
          {name}
        </Text>
        {description && isLarge && (
          <Text style={styles.description} numberOfLines={1}>
            {description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neutral[100],
  },
  cardLarge: {
    width: '100%',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  cardSmall: {
    flex: 1,
    paddingVertical: Spacing.md,
    gap: 6,
  },
  iconContainer: {
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconLarge: {
    width: 60,
    height: 60,
  },
  iconSmall: {
    width: 44,
    height: 44,
  },
  textContainer: {
    alignItems: 'center',
    width: '100%',
  },
  name: {
    fontFamily: Fonts.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  nameLarge: {
    fontSize: FontSizes.sm,
  },
  nameSmall: {
    fontSize: FontSizes.xs,
  },
  description: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
