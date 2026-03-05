import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { AppHeader } from "../../../components";
import { useState } from "react";

export default function PengaturanScreen() {
  const router = useRouter();
  const [loading] = useState(false); // Untuk future use jika ada loading

  return (
    <View style={styles.container}>
      <StatusBar
        style="light"
        translucent={true}
        backgroundColor="transparent"
      />

      <AppHeader title="Pengaturan" showBack={true} />

      {loading ? (
        /* ========================================
             SKELETON LOADING STATE - PENGATURAN
        ======================================== */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.section}>
            <View style={styles.skeletonSectionLabel} />
            <View style={styles.menuCard}>
              {[1, 2, 3].map((item) => (
                <View key={item}>
                  <View style={styles.menuItem}>
                    <View style={styles.menuLeft}>
                      <View style={styles.skeletonIconCircle} />
                      <View style={styles.menuTextContainer}>
                        <View style={styles.skeletonMenuText} />
                        <View style={styles.skeletonMenuDesc} />
                      </View>
                    </View>
                    <View style={styles.skeletonChevron} />
                  </View>
                  {item < 3 && <View style={styles.menuDivider} />}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PENGATURAN ABSENSI</Text>
            <View style={styles.menuCard}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push("/menu-admin/pengaturan/jam-kerja" as any)}
              >
                <View style={styles.menuLeft}>
                  <View
                    style={[styles.iconCircle, { backgroundColor: "#E3F2FD" }]}
                  >
                    <Ionicons name="time-outline" size={22} color="#1976D2" />
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={styles.menuText}>Jam Kerja</Text>
                    <Text style={styles.menuDesc}>
                      Atur jam masuk dan pulang kerja
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward-outline" size={20} color="#999" />
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push("/menu-admin/pengaturan/kalender-libur" as any)}
              >
                <View style={styles.menuLeft}>
                  <View
                    style={[styles.iconCircle, { backgroundColor: "#FFEBEE" }]}
                  >
                    <Ionicons name="calendar-outline" size={22} color="#F44336" />
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={styles.menuText}>Kalender Libur</Text>
                    <Text style={styles.menuDesc}>
                      Kelola hari libur dan tanggal merah
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward-outline" size={20} color="#999" />
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push("/menu-admin/pengaturan/lokasi-kantor" as any)}
              >
                <View style={styles.menuLeft}>
                  <View
                    style={[styles.iconCircle, { backgroundColor: "#E8F5E9" }]}
                  >
                    <Ionicons name="location-outline" size={22} color="#4CAF50" />
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={styles.menuText}>Lokasi Kantor</Text>
                    <Text style={styles.menuDesc}>
                      Tentukan lokasi dan radius absensi
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward-outline" size={20} color="#999" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  section: {
    marginTop: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    marginBottom: 10,
    marginLeft: 5,
    letterSpacing: 0.5,
  },
  menuCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8F0EF',
    shadowColor: '#004643',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
    marginBottom: 2,
  },
  menuDesc: {
    fontSize: 12,
    color: "#999",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#F0F0F0",
  },

  /* ========================================
     SKELETON STYLES - PENGATURAN
  ======================================== */
  // Skeleton untuk Section Label
  skeletonSectionLabel: {
    width: '50%',
    height: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginBottom: 10,
    marginLeft: 5,
  },
  // Skeleton untuk Icon Circle
  skeletonIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    marginRight: 12,
  },
  // Skeleton untuk Menu Text
  skeletonMenuText: {
    width: '60%',
    height: 15,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 4,
  },
  // Skeleton untuk Menu Description
  skeletonMenuDesc: {
    width: '80%',
    height: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
  },
  // Skeleton untuk Chevron
  skeletonChevron: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E0E0E0',
  },
});
