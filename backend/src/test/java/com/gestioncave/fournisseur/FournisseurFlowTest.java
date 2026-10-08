package com.gestioncave.fournisseur;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gestioncave.boisson.Boisson;
import com.gestioncave.boisson.BoissonRepository;
import com.gestioncave.commande.CommandeFournisseurRepository;
import com.gestioncave.etablissement.Etablissement;
import com.gestioncave.etablissement.EtablissementRepository;
import com.gestioncave.registre.RegistreJournalierRepository;
import com.gestioncave.utilisateur.Role;
import com.gestioncave.utilisateur.Utilisateur;
import com.gestioncave.utilisateur.UtilisateurRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FournisseurFlowTest {

    @Autowired MockMvc mockMvc;
    @Autowired UtilisateurRepository utilisateurRepository;
    @Autowired EtablissementRepository etablissementRepository;
    @Autowired BoissonRepository boissonRepository;
    @Autowired CommandeFournisseurRepository commandeRepository;
    @Autowired FournisseurRepository fournisseurRepository;
    @Autowired RegistreJournalierRepository registreRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired ObjectMapper objectMapper;

    private Long etablissementId;
    private Long boissonId;

    @BeforeEach
    void setUp() {
        nettoyer();

        Etablissement maquis = etablissementRepository.save(Etablissement.builder().nom("Maquis A").build());
        etablissementId = maquis.getId();

        boissonId = boissonRepository.save(Boisson.builder()
                .designation("Biere 60cl")
                .bouteillesParConditionnement(12)
                .prixAchatCasier(new BigDecimal("6000"))
                .prixVenteUnitaire(new BigDecimal("800"))
                .seuilAlerte(24)
                .etablissements(Set.of(maquis))
                .build()).getId();

        utilisateurRepository.save(Utilisateur.builder()
                .nom("Gerant").email("gerant@test.local")
                .motDePasseHash(passwordEncoder.encode("secret"))
                .role(Role.GERANT).etablissements(Set.of(maquis)).build());

        utilisateurRepository.save(Utilisateur.builder()
                .nom("Proprio").email("proprio@test.local")
                .motDePasseHash(passwordEncoder.encode("secret"))
                .role(Role.PROPRIETAIRE).etablissements(Set.of()).build());
    }

    @AfterEach
    void tearDown() {
        nettoyer();
    }

    private void nettoyer() {
        commandeRepository.deleteAll();
        registreRepository.deleteAll();
        boissonRepository.deleteAll();
        fournisseurRepository.deleteAll();
        utilisateurRepository.deleteAll();
        etablissementRepository.deleteAll();
    }

    private String login(String email) throws Exception {
        String body = "{\"email\":\"%s\",\"motDePasse\":\"secret\"}".formatted(email);
        String response = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("token").asText();
    }

    private long creerFournisseur(String token, String nom) throws Exception {
        String body = "{\"nom\":\"" + nom + "\",\"telephone\":\"0700000009\"}";
        String rep = mockMvc.perform(post("/api/fournisseurs")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(rep).get("id").asLong();
    }

    @Test
    void gerant_ne_peut_pas_creer_un_fournisseur() throws Exception {
        String token = login("gerant@test.local");
        String body = "{\"nom\":\"Interdit\"}";
        mockMvc.perform(post("/api/fournisseurs")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
    }

    @Test
    void achat_lie_a_un_fournisseur_alimente_ses_statistiques() throws Exception {
        String proprio = login("proprio@test.local");
        long fournisseurId = creerFournisseur(proprio, "Brasserie Test");

        // Achat lié à la fiche fournisseur (5 casiers x 6000 = 30000)
        String body = "{\"boissonId\":" + boissonId + ",\"etablissementId\":" + etablissementId
                + ",\"date\":\"2026-01-15\",\"nombreCasiers\":5,\"fournisseurId\":" + fournisseurId + "}";
        String rep = mockMvc.perform(post("/api/commandes")
                        .header("Authorization", "Bearer " + proprio)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        JsonNode achat = objectMapper.readTree(rep);
        assertThat(achat.get("fournisseurId").asLong()).isEqualTo(fournisseurId);
        // Le nom est repris comme snapshot texte.
        assertThat(achat.get("fournisseur").asText()).isEqualTo("Brasserie Test");

        // La fiche fournisseur reflète l'achat (nombre + montant pour le propriétaire).
        String liste = mockMvc.perform(get("/api/fournisseurs")
                        .header("Authorization", "Bearer " + proprio))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode f = objectMapper.readTree(liste).get(0);
        assertThat(f.get("nombreAchats").asInt()).isEqualTo(1);
        assertThat(f.get("montantTotalAchats").asInt()).isEqualTo(30000);
    }

    @Test
    void suppression_desactive_si_le_fournisseur_a_des_achats() throws Exception {
        String proprio = login("proprio@test.local");
        long fournisseurId = creerFournisseur(proprio, "Avec Achats");

        String body = "{\"boissonId\":" + boissonId + ",\"etablissementId\":" + etablissementId
                + ",\"date\":\"2026-01-15\",\"nombreCasiers\":1,\"fournisseurId\":" + fournisseurId + "}";
        mockMvc.perform(post("/api/commandes")
                        .header("Authorization", "Bearer " + proprio)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());

        mockMvc.perform(delete("/api/fournisseurs/" + fournisseurId)
                        .header("Authorization", "Bearer " + proprio))
                .andExpect(status().isNoContent());

        // La fiche existe toujours mais désactivée (historique préservé).
        Fournisseur f = fournisseurRepository.findById(fournisseurId).orElseThrow();
        assertThat(f.isActif()).isFalse();
    }

    @Test
    void suppression_retire_completement_si_aucun_achat() throws Exception {
        String proprio = login("proprio@test.local");
        long fournisseurId = creerFournisseur(proprio, "Sans Achat");

        mockMvc.perform(delete("/api/fournisseurs/" + fournisseurId)
                        .header("Authorization", "Bearer " + proprio))
                .andExpect(status().isNoContent());

        assertThat(fournisseurRepository.findById(fournisseurId)).isEmpty();
    }
}
