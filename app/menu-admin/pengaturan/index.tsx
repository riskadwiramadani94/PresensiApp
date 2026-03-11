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
            <View style={styles.elegantCard}>
              <View style={styles.cardHeader}>
                <View style={styles.skeletonIconCircle} />
                <View style={[styles.skeletonMenuText, { marginLeft: 10 }]} />
              </View>
              <View style={styles.separator} />
              {[1, 2, 3].map((item) => (
                <View key={item}>
                  <View style={styles.menuItem}>
                    <View style={styles.menuLeft}>
                      <View style={styles.skeletonIconCircle} />
                      <View style={styles.skeletonMenuText} />
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
            <View style={styles.elegantCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="settings-outline" size={20} color="#004643" />
                <Text style={styles.cardTitle}>Pengaturan Absensi</Text>
              </View>
              
              <View style={styles.separator} />
              
              <TouchableOpacity
                style={[styles.menuItem, { marginTop: 12 }]}
                onPress={() => router.push("/menu-admin/pengaturan/jam-kerja" as any)}
              >
                <View style={styles.menuLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: "#F0F7F7" }]}>
                    <Ionicons name="time-outline" size={18} color="#00695C" />
                  </View>
                  <Text style={styles.menuText}>Jam Kerja</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#00695C" />
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push("/menu-admin/pengaturan/kalender-libur" as any)}
              >
                <View style={styles.menuLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: "#F0F7F7" }]}>
                    <Ionicons name="calendar-outline" size={18} color="#00695C" />
                  </View>
                  <Text style={styles.menuText}>Kalender Libur</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#00695C" />
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push("/menu-admin/pengaturan/lokasi-kantor" as any)}
              >
                <View style={styles.menuLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: "#F0F7F7" }]}>
                    <Ionicons name="location-outline" size={18} color="#00695C" />
                  </View>
                  <Text style={styles.menuText}>Lokasi Kantor</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#00695C" />
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
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  section: {
    marginTop: 0,
  },
  elegantCard: {
    backgroundColor: '#FFF',
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginLeft: 10 },
  separator: { height: 1, backgroundColor: '#F0F3F3', marginBottom: 0 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F0F3F3',
    marginVertical: 4,
  },

  /* ========================================
     SKELETON STYLES - PENGATURAN
  ======================================== */
  skeletonIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    marginRight: 12,
  },
  skeletonMenuText: {
    width: '60%',
    height: 14,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  skeletonChevron: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
});
