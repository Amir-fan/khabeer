// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "message.fill": "chat-bubble",
  "message": "chat-bubble-outline",
  "folder.fill": "folder",
  "folder": "folder-open",
  "newspaper.fill": "article",
  "newspaper": "article",
  "person.fill": "person",
  "person": "person-outline",
  "sparkles": "auto-awesome",
  "chart.line.uptrend.xyaxis": "trending-up",
  "doc.text.magnifyingglass": "find-in-page",
  "plus.circle.fill": "add-circle",
  "shield.fill": "shield",
  "apple.logo": "apple",
  "arrow.right.circle.fill": "arrow-forward",
  "lock.fill": "lock",
  "doc.fill": "description",
  "questionmark.circle.fill": "help",
  "gearshape.fill": "settings",
  "bell.fill": "notifications",
  "key.fill": "vpn-key",
  "chart.bar.fill": "bar-chart",
  "person.2.fill": "people",
  "doc.text.fill": "description",
  "magnifyingglass": "search",
  "xmark": "close",
  "checkmark": "check",
  "exclamationmark.triangle.fill": "warning",
  "info.circle.fill": "info",
  "bubble.left.fill": "chat",
  "mic.fill": "mic",
  "photo.fill": "photo",
  "arrow.up.circle.fill": "arrow-upward",
  "star.fill": "star",
  "bookmark.fill": "bookmark",
  "gear": "settings",
  "globe": "language",
  "moon.fill": "dark-mode",
  "arrow.right.square.fill": "logout",
  "trash.fill": "delete",
  "square.and.arrow.up": "share",
  "checkmark.shield.fill": "verified-user",
  "xmark.shield.fill": "gpp-bad",
  "paperclip": "attach-file",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
