import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchCountries, type Country } from "../../data/countries";
import { preloadFlagImages } from "../utils/flagImages";

type CountryLoad =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; countries: Country[] };

const colors = {
  background: "#03091F",
  ink: "#F7F9FF",
  muted: "#A8B6D8",
  gold: "#FFD447",
};

export default function Countries() {
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [countryLoad, setCountryLoad] = useState<CountryLoad>({
    status: "loading",
  });
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;

    fetchCountries()
      .then((countries) => {
        if (active) {
          setCountryLoad({ status: "ready", countries });
          const initialFlags = [...countries]
            .sort((first, second) =>
              first.country.localeCompare(second.country),
            )
            .slice(0, 12)
            .map((country) => country.flag);
          void preloadFlagImages(initialFlags);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setCountryLoad({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "An unexpected error occurred.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [loadAttempt]);

  const visibleCountries = useMemo(() => {
    if (countryLoad.status !== "ready") return [];

    const query = search.trim().toLocaleLowerCase();
    return countryLoad.countries
      .filter(
        (country) =>
          country.country.toLocaleLowerCase().includes(query) ||
          country.code.toLocaleLowerCase().includes(query),
      )
      .sort((first, second) => first.country.localeCompare(second.country));
  }, [countryLoad, search]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={["#03091F", "#07163D", "#06102E"]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <View style={styles.topBar}>
          <Link href="/" asChild>
            <Pressable
              accessibilityLabel="Back to FlagOra"
              accessibilityRole="button"
              style={styles.backButton}
            >
              <Text style={styles.backArrow}>←</Text>
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          </Link>
          <Text style={styles.directoryBadge}>WORLD DIRECTORY</Text>
        </View>

        <Text style={styles.eyebrow}>EXPLORE THE WORLD</Text>
        <Text style={styles.title}>Countries & flags</Text>
        <Text style={styles.subtitle}>
          Find a country, discover its flag, and get ready for your next quiz.
        </Text>

        {countryLoad.status === "loading" && (
          <Text style={styles.message}>Loading country flags...</Text>
        )}

        {countryLoad.status === "error" && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Country data is unavailable</Text>
            <Text style={styles.errorMessage}>{countryLoad.message}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setCountryLoad({ status: "loading" });
                setLoadAttempt((attempt) => attempt + 1);
              }}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        )}

        {countryLoad.status === "ready" && (
          <>
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                accessibilityLabel="Search countries"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setSearch}
                placeholder="Search countries or codes"
                placeholderTextColor="#8294BC"
                returnKeyType="search"
                style={styles.searchInput}
                value={search}
              />
              {search.length > 0 && (
                <Pressable
                  accessibilityLabel="Clear search"
                  accessibilityRole="button"
                  onPress={() => setSearch("")}
                  style={styles.clearButton}
                >
                  <Text style={styles.clearText}>×</Text>
                </Pressable>
              )}
            </View>
            <View style={styles.listHeading}>
              <Text style={styles.listCount}>
                {visibleCountries.length}{" "}
                {visibleCountries.length === 1 ? "FLAG" : "FLAGS"}
              </Text>
              <Text style={styles.listSort}>SORTED A–Z</Text>
            </View>
            <FlatList
              data={visibleCountries}
              keyExtractor={(country) => country.code}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No countries found</Text>
                  <Text style={styles.emptyMessage}>
                    Try another country name or code.
                  </Text>
                </View>
              }
              renderItem={({ item }) => <CountryRow country={item} />}
              showsVerticalScrollIndicator={false}
              style={styles.list}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function CountryRow({ country }: { country: Country }) {
  return (
    <View style={styles.countryRow}>
      <View style={styles.flagFrame}>
        <Image
          accessibilityLabel={`Flag of ${country.country}`}
          cachePolicy="memory-disk"
          contentFit="contain"
          source={{ uri: country.flag }}
          style={styles.flagImage}
          transition={150}
        />
      </View>
      <Text numberOfLines={1} style={styles.countryName}>
        {country.country}
      </Text>
      <Text style={styles.countryCode}>{country.code.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  topBar: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 19,
  },
  backButton: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(117, 171, 255, 0.35)",
    borderRadius: 13,
    backgroundColor: "rgba(20, 45, 99, 0.72)",
  },
  backArrow: {
    color: colors.gold,
    fontSize: 18,
    fontWeight: "700",
  },
  backText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  directoryBadge: {
    color: "#9EC8FF",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  eyebrow: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.8,
  },
  title: {
    marginTop: 8,
    color: colors.ink,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    maxWidth: 430,
    marginTop: 7,
    marginBottom: 18,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  searchBox: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(110, 158, 234, 0.36)",
    borderRadius: 16,
    backgroundColor: "rgba(13, 31, 72, 0.94)",
  },
  searchIcon: {
    color: "#8DBAFF",
    fontSize: 25,
    lineHeight: 28,
    transform: [{ rotate: "-20deg" }],
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 11,
    color: colors.ink,
    fontSize: 14,
  },
  clearButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "rgba(114, 147, 203, 0.18)",
  },
  clearText: {
    color: colors.ink,
    fontSize: 20,
    lineHeight: 23,
  },
  listHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    marginBottom: 9,
  },
  listCount: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  listSort: {
    color: "#8294BC",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 18,
  },
  countryRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: "rgba(107, 154, 226, 0.25)",
    borderRadius: 17,
    backgroundColor: "rgba(12, 29, 68, 0.88)",
  },
  flagFrame: {
    width: 55,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(162, 190, 235, 0.3)",
    borderRadius: 9,
    backgroundColor: "#0A1B3C",
  },
  flagImage: {
    width: "100%",
    height: "100%",
  },
  countryName: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  countryCode: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    overflow: "hidden",
    borderRadius: 8,
    color: "#B7CEFA",
    backgroundColor: "rgba(82, 124, 194, 0.2)",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  message: {
    paddingVertical: 22,
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
  },
  errorCard: {
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 137, 148, 0.4)",
    borderRadius: 18,
    backgroundColor: "rgba(104, 34, 57, 0.35)",
  },
  errorTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  errorMessage: {
    marginTop: 7,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  retryButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: "#123C83",
  },
  retryButtonText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 38,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  emptyMessage: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 12,
  },
});
