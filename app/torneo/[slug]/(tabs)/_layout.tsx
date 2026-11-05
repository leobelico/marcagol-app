// app/torneo/[slug]/(tabs)/_layout.tsx
import { Tabs, useLocalSearchParams, router } from "expo-router";
import { Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { TorneoContext } from "../../../../src/context/TorneoContext";
import { makeStyles, useTheme } from "../../../../src/theme/ThemeContext";

function BackButton() {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={12}
      style={{ paddingRight: 12 }}
    >
      <Ionicons name="chevron-back" size={26} color={colors.headerText} />
    </Pressable>
  );
}

export default function TorneoTabsLayout() {
  const { colors } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  return (
    <TorneoContext.Provider value={{ slug: slug ?? "" }}>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: colors.header },
          headerShadowVisible: false,
          headerTintColor: colors.headerText,
          headerTitleStyle: { fontWeight: "800" },
          headerLeft: () => <BackButton />,
          tabBarStyle: {
            backgroundColor: colors.bgElevated,
            borderTopColor: colors.cardBorder,
            borderTopWidth: 1,
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Inicio",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" color={color as string} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="tabla"
          options={{
            title: "Tabla",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="podium" color={color as string} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="goleo"
          options={{
            title: "Goleo",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="football" color={color as string} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="calendario"
          options={{
            title: "Calendario",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar" color={color as string} size={size} />
            ),
          }}
        />
      </Tabs>
    </TorneoContext.Provider>
  );
}
