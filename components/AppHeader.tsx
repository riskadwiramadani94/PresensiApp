import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  onBackPress?: () => void;
  showStats?: boolean;
  statsText?: string;
  showAddButton?: boolean;
  onAddPress?: () => void;
  rightComponent?: React.ReactNode;
  fallbackRoute?: string;
  primaryColor?: string;
  backgroundColor?: string;
}

export default function AppHeader({
  title,
  showBack = false,
  onBackPress,
  showStats = false,
  statsText,
  showAddButton = false,
  onAddPress,
  rightComponent,
  fallbackRoute,
  primaryColor = "#004643",
  backgroundColor = "#fff",
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

  return (
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

        {rightComponent}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerSection: {
    paddingTop: Platform.OS === "ios" ? 5 : 35,
    paddingBottom: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  },
  headerTitle: {
    fontSize: Platform.OS === "ios" ? 20 : 18,
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
  },
  addButtonText: {
    display: "none",
  },
});
