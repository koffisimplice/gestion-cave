import React, { useCallback, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { Badge, Button, Card, EmptyView, ErrorBanner, Field, LoadingView } from "@/components/ui";
import { Select } from "@/components/Select";
import { useAuth } from "@/context/auth";
import { useEtablissement } from "@/context/etablissement";
import {
  changerActivationUtilisateur,
  creerUtilisateur,
  listerUtilisateurs,
  modifierUtilisateur,
} from "@/api/endpoints";
import type { Role, UtilisateurAdmin, UtilisateurInput } from "@/types";
import { colors, fontSize, radius, spacing } from "@/theme";

export default function UtilisateursScreen() {
  const { estProprietaire, utilisateur } = useAuth();
  const [liste, setListe] = useState<UtilisateurAdmin[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [edition, setEdition] = useState<UtilisateurAdmin | null>(null);
  const [formOuvert, setFormOuvert] = useState(false);

  const charger = useCallback(async () => {
    setErreur("");
    try {
      setListe(await listerUtilisateurs());
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setChargement(false);
    }
  }, []);

  React.useEffect(() => {
    charger();
  }, [charger]);

  async function basculerActivation(u: UtilisateurAdmin) {
    try {
      await changerActivationUtilisateur(u.id, !u.actif);
      charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Opération impossible.");
    }
  }

  if (!estProprietaire) return <Redirect href="/(tabs)" />;
  if (chargement && liste.length === 0) return <LoadingView />;

  return (
    <Screen onRefresh={charger} refreshing={chargement}>
      <Button
        title="+ Nouvel utilisateur"
        onPress={() => {
          setEdition(null);
          setFormOuvert(true);
        }}
        style={{ marginBottom: spacing.md }}
      />
      <ErrorBanner message={erreur} />

      {liste.length === 0 ? (
        <EmptyView label="Aucun utilisateur." />
      ) : (
        liste.map((u) => (
          <Card key={u.id}>
            <View style={styles.head}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nom}>{u.nom}</Text>
                <Text style={styles.sub}>{u.email}</Text>
              </View>
              <Badge text={u.role === "PROPRIETAIRE" ? "Propriétaire" : "Gérant"} tone={u.role === "PROPRIETAIRE" ? "primary" : "neutral"} />
            </View>
            {u.etablissements.length > 0 && (
              <Text style={styles.etabs}>{u.etablissements.map((e) => e.nom).join(", ")}</Text>
            )}
            <View style={styles.actions}>
              <Badge text={u.actif ? "Actif" : "Désactivé"} tone={u.actif ? "success" : "danger"} />
              <View style={{ flexDirection: "row", gap: spacing.lg }}>
                <Pressable
                  style={styles.action}
                  onPress={() => {
                    setEdition(u);
                    setFormOuvert(true);
                  }}
                >
                  <Ionicons name="create-outline" size={16} color={colors.primary} />
                  <Text style={[styles.actionText, { color: colors.primary }]}>Modifier</Text>
                </Pressable>
                {u.id !== utilisateur?.id && (
                  <Pressable style={styles.action} onPress={() => basculerActivation(u)}>
                    <Ionicons
                      name={u.actif ? "pause-circle-outline" : "play-circle-outline"}
                      size={16}
                      color={u.actif ? colors.danger : colors.success}
                    />
                    <Text style={[styles.actionText, { color: u.actif ? colors.danger : colors.success }]}>
                      {u.actif ? "Désactiver" : "Activer"}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </Card>
        ))
      )}

      <UtilisateurForm
        visible={formOuvert}
        utilisateur={edition}
        onClose={() => setFormOuvert(false)}
        onSaved={() => {
          setFormOuvert(false);
          charger();
        }}
      />
    </Screen>
  );
}

function UtilisateurForm({
  visible,
  utilisateur,
  onClose,
  onSaved,
}: {
  visible: boolean;
  utilisateur: UtilisateurAdmin | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { etablissements } = useEtablissement();
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [role, setRole] = useState<Role>("GERANT");
  const [motDePasse, setMotDePasse] = useState("");
  const [voirMdp, setVoirMdp] = useState(false);
  const [etabIds, setEtabIds] = useState<number[]>([]);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  React.useEffect(() => {
    if (!visible) return;
    setErreur("");
    setMotDePasse("");
    setVoirMdp(false);
    if (utilisateur) {
      setNom(utilisateur.nom);
      setEmail(utilisateur.email);
      setTelephone(utilisateur.telephone ?? "");
      setRole(utilisateur.role);
      setEtabIds(utilisateur.etablissements.map((e) => e.id));
    } else {
      setNom("");
      setEmail("");
      setTelephone("");
      setRole("GERANT");
      setEtabIds([]);
    }
  }, [visible, utilisateur]);

  function toggleEtab(id: number) {
    setEtabIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function soumettre() {
    setErreur("");
    if (!nom.trim() || !email.trim()) {
      setErreur("Nom et identifiant sont requis.");
      return;
    }
    if (!utilisateur && !motDePasse) {
      setErreur("Le mot de passe est requis à la création.");
      return;
    }
    if (role === "GERANT" && etabIds.length === 0) {
      setErreur("Un gérant doit être rattaché à au moins un établissement.");
      return;
    }
    const input: UtilisateurInput = {
      nom: nom.trim(),
      email: email.trim(),
      telephone: telephone.trim() || undefined,
      role,
      motDePasse: motDePasse || undefined,
      etablissementIds: role === "GERANT" ? etabIds : [],
    };
    setEnvoi(true);
    try {
      if (utilisateur) await modifierUtilisateur(utilisateur.id, input);
      else await creerUtilisateur(input);
      onSaved();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>{utilisateur ? "Modifier" : "Nouvel utilisateur"}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <ErrorBanner message={erreur} />
            <Field label="Nom" value={nom} onChangeText={setNom} />
            <Field
              label="Identifiant (email ou téléphone)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Field label="Téléphone (optionnel)" value={telephone} onChangeText={setTelephone} keyboardType="phone-pad" />
            <View>
              <Field
                label={utilisateur ? "Mot de passe (laisser vide = inchangé)" : "Mot de passe"}
                value={motDePasse}
                onChangeText={setMotDePasse}
                secureTextEntry={!voirMdp}
                style={{ paddingRight: 48 }}
              />
              <Pressable style={styles.eye} onPress={() => setVoirMdp((v) => !v)} hitSlop={10}>
                <Ionicons name={voirMdp ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            <Select
              label="Rôle"
              value={role}
              onChange={setRole}
              options={[
                { value: "GERANT", label: "Gérant" },
                { value: "PROPRIETAIRE", label: "Propriétaire" },
              ]}
            />
            {role === "GERANT" && (
              <>
                <Text style={styles.label}>Établissements rattachés</Text>
                <View style={styles.chips}>
                  {etablissements.map((e) => {
                    const actif = etabIds.includes(e.id);
                    return (
                      <Pressable key={e.id} onPress={() => toggleEtab(e.id)} style={[styles.chip, actif && styles.chipActif]}>
                        <Text style={[styles.chipText, actif && { color: colors.white }]}>{e.nom}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
            <Button title="Enregistrer" onPress={soumettre} loading={envoi} style={{ marginTop: spacing.sm }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  nom: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
  sub: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 },
  etabs: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: spacing.sm },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  action: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  actionText: { fontSize: fontSize.sm, fontWeight: "600" },
  label: { color: colors.textMuted, fontSize: fontSize.sm, marginBottom: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActif: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: fontSize.sm },
  eye: { position: "absolute", right: spacing.md, top: 34 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: "92%",
  },
  modalHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  modalTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: "800" },
});
