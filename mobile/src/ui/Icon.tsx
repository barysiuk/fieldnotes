import { Feather } from '@expo/vector-icons';

type IconName =
  | 'mic'
  | 'square'
  | 'play'
  | 'pause'
  | 'trash-2'
  | 'file-text';

export function Icon({
  name,
  size = 20,
  color = '#20160f',
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <Feather color={color} name={name} size={size} />;
}
