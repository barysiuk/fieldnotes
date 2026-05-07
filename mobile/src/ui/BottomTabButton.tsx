import { Pressable, StyleSheet, Text } from 'react-native';

import { Icon } from './Icon';

export function BottomTabButton({
  icon,
  isActive,
  label,
  onPress,
}: {
  icon: 'disc' | 'book-open';
  isActive: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isActive ? styles.buttonActive : styles.buttonIdle,
        pressed && styles.actionPressed,
      ]}
    >
      <Icon color={isActive ? '#201713' : '#7a6658'} name={icon} size={16} />
      <Text style={[styles.label, isActive ? styles.labelActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 18,
    gap: 5,
    minWidth: 92,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonActive: {
    backgroundColor: '#f1e6d9',
  },
  buttonIdle: {
    backgroundColor: 'transparent',
  },
  label: {
    color: '#7a6658',
    fontSize: 12,
    fontWeight: '700',
  },
  labelActive: {
    color: '#201713',
  },
  actionPressed: {
    opacity: 0.82,
  },
});
