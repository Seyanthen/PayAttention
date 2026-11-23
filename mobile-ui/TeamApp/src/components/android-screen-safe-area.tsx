import { Platform, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AndroidScreenSafeAreaProps = ViewProps & {
  style?: StyleProp<ViewStyle>;
};

export function AndroidScreenSafeArea({ children, style, ...props }: AndroidScreenSafeAreaProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      {...props}
      style={[
        style,
        Platform.OS !== 'web' && {
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
          paddingBottom: insets.bottom,
        },
      ]}>
      {children}
    </View>
  );
}
