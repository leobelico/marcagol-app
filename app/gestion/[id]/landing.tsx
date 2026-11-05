// app/gestion/[id]/landing.tsx
//
// Editar la página pública / flyer del torneo
// (equivalente a /admin/torneos/[id]/landing en la web).
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { api, ApiError } from "../../../src/api/client";
import { useAuth } from "../../../src/context/AuthContext";
import type { LandingData } from "../../../src/types/api";
import { LoadingState, ErrorState } from "../../../src/components/AsyncState";
import {
  Card,
  ErrorText,
  Field,
  PrimaryButton,
  SectionLabel,
  SwitchRow,
} from "../../../src/components/ui";
import { spacing, typography } from "../../../src/theme/tokens";
import { makeStyles, useTheme } from "../../../src/theme/ThemeContext";

type Form = Record<
  | "description"
  | "endDate"
  | "maxTeams"
  | "inscriptionFee"
  | "bannerUrl"
  | "contactName"
  | "contactPhone"
  | "contactEmail"
  | "instagram"
  | "facebook"
  | "whatsapp",
  string
>;

export default function LandingScreen() {
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [slug, setSlug] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    api
      .getTorneoAdmin(token, id)
      .then(({ torneo: t }) => {
        setSlug(t.slug);
        setPublished(t.published);
        setForm({
          description: t.description ?? "",
          endDate: t.endDate ? t.endDate.slice(0, 10) : "",
          maxTeams: t.maxTeams != null ? String(t.maxTeams) : "",
          inscriptionFee: t.inscriptionFee != null ? String(t.inscriptionFee) : "",
          bannerUrl: t.bannerUrl ?? "",
          contactName: t.contactName ?? "",
          contactPhone: t.contactPhone ?? "",
          contactEmail: t.contactEmail ?? "",
          instagram: t.instagram ?? "",
          facebook: t.facebook ?? "",
          whatsapp: t.whatsapp ?? "",
        });
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "No se pudo cargar"));
  }, [token, id]);

  if (loadError) return <ErrorState message={loadError} />;
  if (!form) return <LoadingState label="Cargando..." />;

  const set = (key: keyof Form) => (value: string) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  async function handleSave() {
    if (!token || !id || !form) return;
    if (form.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(form.endDate)) {
      setError("La fecha de fin debe tener el formato AAAA-MM-DD.");
      return;
    }
    const data: LandingData = {
      published,
      description: form.description.trim() || null,
      endDate: form.endDate || null,
      maxTeams: form.maxTeams ? Number(form.maxTeams) : null,
      inscriptionFee: form.inscriptionFee ? Number(form.inscriptionFee) : null,
      bannerUrl: form.bannerUrl.trim() || null,
      contactName: form.contactName.trim() || null,
      contactPhone: form.contactPhone.trim() || null,
      contactEmail: form.contactEmail.trim() || null,
      instagram: form.instagram.trim() || null,
      facebook: form.facebook.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
    };
    setError(null);
    setSaving(true);
    try {
      await api.updateLanding(token, id, data);
      Alert.alert("Guardado", "La página del torneo se actualizó.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <SwitchRow
            label="Publicado"
            detail="Mostrar la página pública del torneo"
            value={published}
            onValueChange={setPublished}
          />
        </Card>

        <SectionLabel>INFORMACIÓN</SectionLabel>
        <Field label="Descripción" value={form.description} onChangeText={set("description")} multiline />
        <Field
          label="Fecha de fin del torneo (AAAA-MM-DD)"
          value={form.endDate}
          onChangeText={set("endDate")}
          autoCapitalize="none"
        />
        <Field
          label="Máximo de equipos"
          value={form.maxTeams}
          onChangeText={set("maxTeams")}
          keyboardType="number-pad"
          placeholder="16"
        />
        <Field
          label="Costo de inscripción ($)"
          value={form.inscriptionFee}
          onChangeText={set("inscriptionFee")}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />
        <Field
          label="URL del banner"
          value={form.bannerUrl}
          onChangeText={set("bannerUrl")}
          autoCapitalize="none"
          keyboardType="url"
          placeholder="https://..."
        />

        <SectionLabel>CONTACTO</SectionLabel>
        <Field label="Nombre" value={form.contactName} onChangeText={set("contactName")} />
        <Field
          label="Teléfono"
          value={form.contactPhone}
          onChangeText={set("contactPhone")}
          keyboardType="phone-pad"
        />
        <Field
          label="Email"
          value={form.contactEmail}
          onChangeText={set("contactEmail")}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <SectionLabel>REDES SOCIALES</SectionLabel>
        <Field
          label="Instagram"
          value={form.instagram}
          onChangeText={set("instagram")}
          autoCapitalize="none"
          placeholder="@torneo"
        />
        <Field
          label="Facebook"
          value={form.facebook}
          onChangeText={set("facebook")}
          autoCapitalize="none"
        />
        <Field
          label="WhatsApp"
          value={form.whatsapp}
          onChangeText={set("whatsapp")}
          autoCapitalize="none"
          placeholder="Número o link, ej. 81 1234 5678"
        />

        <ErrorText message={error} />
        <PrimaryButton label="Guardar cambios" onPress={handleSave} loading={saving} />
        {slug && (
          <Pressable
            style={styles.link}
            onPress={() => Linking.openURL(`https://${slug}.marcagol.site/info`)}
          >
            <Text style={styles.linkText}>Ver página pública →</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  link: { alignItems: "center", marginTop: spacing.lg },
  linkText: { ...typography.bodyStrong, color: colors.accent },
}));
