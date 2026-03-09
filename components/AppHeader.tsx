import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
} from "react-native";

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  showStats?: boolean;
  statsText?: string;
  showAddButton?: boolean;
  onAddPress?: () => void;
  showHistoryButton?: boolean;
  onHistoryPress?: () => void;
  historyIcon?: string;
  rightComponent?: React.ReactNode;
  rightIcon?: string;
  onRightPress?: () => void;
  fallbackRoute?: string;
  primaryColor?: string;
  backgroundColor?: string;
  variant?: string;
  children?: React.ReactNode;
}

export default function AppHeader({
  title,
  showBack = false,
  onBackPress,
  showStats = false,
  statsText,
  showAddButton = false,
  onAddPress,
  showHistoryButton = false,
  onHistoryPress,
  historyIcon = "time-outline",
  rightComponent,
  rightIcon,
  onRightPress,
  fallbackRoute,
  primaryColor = "#fff",
  backgroundColor = "#004643",
  variant,
  children,
}: AppHeaderProps) {
  const router = useRouter();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push((fallbackRoute || "/(tabs)/beranda") as any);
      }
    }
  };

  // Jika variant dashboard, render children
  if (variant === "dashboard") {
    return (
      <View style={[styles.headerSection, { backgroundColor }]}>
        {children}
      </View>
    );
  }

  return (
    <SafeAreaView style={{ backgroundColor }}>
      <View style={[styles.headerSection, { backgroundColor }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            {showBack && (
              <TouchableOpacity style={styles.backBtn} onPress={handleBackPress}>
                <Ionicons name="chevron-back" size={28} color={primaryColor} />
              </TouchableOpacity>
            )}
            <Text style={[styles.headerTitle, { color: primaryColor }]}>
              {title}
            </Text>
          </View>

          {showStats && statsText && (
            <View style={styles.headerStats}>
              <Text style={[styles.statsText, { color: primaryColor }]}>
                {statsText}
              </Text>
            </View>
          )}

          {showAddButton && (
            <TouchableOpacity style={styles.addButton} onPress={onAddPress}>
              <Ionicons name="add" size={28} color={primaryColor} />
            </TouchableOpacity>
          )}

          {showHistoryButton && (
            <TouchableOpacity style={styles.addButton} onPress={onHistoryPress}>
              <Ionicons name={historyIcon as any} size={28} color={primaryColor} />
            </TouchableOpacity>
          )}

          {rightIcon && onRightPress && (
            <TouchableOpacity style={styles.addButton} onPress={onRightPress}>
              <Ionicons name={rightIcon as any} size={28} color={primaryColor} />
            </TouchableOpacity>
          )}

          {rightComponent}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerSection: {
    paddingTop: Platform.OS === "ios" ? 0 : 20,
    paddingBottom: Platform.OS === "ios" ? 15 : 20,
    paddingHorizontal: 20,
    borderBottomWidth: 0,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 0 : 15,
    minHeight: 28,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  backBtn: {
    position: "absolute",
    left: 0,
    padding: 0,
    marginRight: 0,
    justifyContent: "center",
    alignItems: "center",
    height: 28,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    alignItems: "center",
  },
  headerStats: {
    backgroundColor: "#E6F0EF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statsText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  addButton: {
    position: "absolute",
    right: 0,
    padding: 0,
    justifyContent: "center",
    alignItems: "center",
    height: 28,
    top: Platform.OS === "ios" ? 4 : 15
  },
  addButtonText: {
    display: "none",
  },
});
