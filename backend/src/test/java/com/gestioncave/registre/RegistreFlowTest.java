package com.gestioncave.registre;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gestioncave.boisson.Boisson;
import com.gestioncave.boisson.BoissonRepository;
import com.gestioncave.etablissement.Etablissement;
import com.gestioncave.etablissement.EtablissementRepository;
import com.gestioncave.utilisateur.Role;
import com.gestioncave.utilisateur.Utilisateur;
import com.gestioncave.utilisateur.UtilisateurRepository;
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
class RegistreFlowTest {

    @Autowired MockMvc mockMvc;
    @Autowired UtilisateurRepository utilisateurRepository;
    @Autowired EtablissementRepository etablissementRepository;
    @Autowired BoissonRepository boissonRepository;
    @Autowired RegistreJournalierRepository registreRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired ObjectMapper objectMapper;

    private Long etablissementId;
    private String token;

    @BeforeEach
    void setUp() throws Exception {
        registreRepository.deleteAll();
        boissonRepository.deleteAll();
        utilisateurRepository.deleteAll();
        etablissementRepository.deleteAll();

        Etablissement maquis = etablissementRepository.save(Etablissement.builder().nom("Maquis A").build());
        etablissementId = maquis.getId();

        boissonRepository.save(Boisson.builder()
                .designation("Biere 60cl")
                .bouteillesParConditionnement(12)
                .prixAchatCasier(new BigDecimal("6000"))
                .prixVenteUnitaire(new BigDecimal("800"))
                .seuilAlerte(24)
                .etablissements(Set.of(maquis))
                .build());

        utilisateurRepository.save(Utilisateur.builder()
                .nom("Gerant").email("gerant@test.local")
                .motDePasseHash(passwordEncoder.encode("secret"))
                .role(Role.GERANT).etablissements(Set.of(maquis)).build());

        token = login("gerant@test.local");
    }

    private String login(String email) throws Exception {
        String body = "{\"email\":\"%s\",\"motDePasse\":\"secret\"}".formatted(email);
        String response = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("token").asText();
    }

    private JsonNode point(String date) throws Exception {
        String response = mockMvc.perform(get("/api/registre")
                        .header("Authorization", "Bearer " + token)
                        .param("etablissementId", String.valueOf(etablissementId))
                        .param("date", date))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response);
    }

    private JsonNode majLigne(long ligneId, int commande, Integer vendu) throws Exception {
        String body = vendu == null
                ? "{\"commandeDuJour\":" + commande + "}"
                : "{\"commandeDuJour\":" + commande + ",\"stockVendu\":" + vendu + "}";
        String response = mockMvc.perform(put("/api/registre/lignes/" + ligneId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response);
    }

    @Test
    void flux_complet_avec_report_du_stock_le_lendemain() throws Exception {
        // Jour 1 : ancien stock 0
        JsonNode j1 = point("2026-01-10");
        JsonNode ligne = j1.get("lignes").get(0);
        assertThat(ligne.get("ancienStock").asInt()).isZero();
        long ligneId = ligne.get("id").asLong();

        // Commande 60 (5 casiers), vendu 42 -> nouveau 60, restant 18, PVT 42*800 = 33600
        JsonNode apres = majLigne(ligneId, 60, 42);
        JsonNode l = apres.get("lignes").get(0);
        assertThat(l.get("nouveauStock").asInt()).isEqualTo(60);
        assertThat(l.get("stockVendu").asInt()).isEqualTo(42);
        assertThat(l.get("stockRestant").asInt()).isEqualTo(18);
        assertThat(l.get("prixVenteTotal").asInt()).isEqualTo(33600);
        assertThat(apres.get("totalVendu").asInt()).isEqualTo(42);

        // Arrêter le point
        mockMvc.perform(post("/api/registre/cloturer")
                        .header("Authorization", "Bearer " + token)
                        .param("etablissementId", String.valueOf(etablissementId))
                        .param("date", "2026-01-10"))
                .andExpect(status().isOk());

        // Jour 2 : ancien stock repris = 18
        JsonNode j2 = point("2026-01-11");
        assertThat(j2.get("lignes").get(0).get("ancienStock").asInt()).isEqualTo(18);
    }

    @Test
    void saisie_impossible_apres_cloture() throws Exception {
        JsonNode j1 = point("2026-02-01");
        long ligneId = j1.get("lignes").get(0).get("id").asLong();
        majLigne(ligneId, 12, 0);

        mockMvc.perform(post("/api/registre/cloturer")
                        .header("Authorization", "Bearer " + token)
                        .param("etablissementId", String.valueOf(etablissementId))
                        .param("date", "2026-02-01"))
                .andExpect(status().isOk());

        // Toute nouvelle saisie doit être refusée (409)
        mockMvc.perform(put("/api/registre/lignes/" + ligneId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"commandeDuJour\":5}"))
                .andExpect(status().isConflict());
    }

    @Test
    void cloture_sans_vente_met_vendu_a_zero() throws Exception {
        JsonNode j1 = point("2026-03-01");
        long ligneId = j1.get("lignes").get(0).get("id").asLong();
        majLigne(ligneId, 24, null); // commande saisie, aucune vente

        // La clôture est autorisée : vendu = 0, restant = nouveau (24).
        mockMvc.perform(post("/api/registre/cloturer")
                        .header("Authorization", "Bearer " + token)
                        .param("etablissementId", String.valueOf(etablissementId))
                        .param("date", "2026-03-01"))
                .andExpect(status().isOk());

        JsonNode l = point("2026-03-01").get("lignes").get(0);
        assertThat(l.get("stockVendu").asInt()).isZero();
        assertThat(l.get("stockRestant").asInt()).isEqualTo(24);
    }

    @Test
    void bouton_plus_un_incremente_le_vendu() throws Exception {
        JsonNode j1 = point("2026-04-01");
        long ligneId = j1.get("lignes").get(0).get("id").asLong();
        majLigne(ligneId, 10, null); // nouveau stock 10, rien vendu

        // Deux ventes de +1 -> vendu 2, restant 8, PVT 2*800 = 1600
        vente(ligneId, 1);
        JsonNode apres = vente(ligneId, 1);
        JsonNode l = apres.get("lignes").get(0);
        assertThat(l.get("stockVendu").asInt()).isEqualTo(2);
        assertThat(l.get("stockRestant").asInt()).isEqualTo(8);
        assertThat(l.get("prixVenteTotal").asInt()).isEqualTo(1600);
    }

    @Test
    void vente_refusee_au_dela_du_stock() throws Exception {
        JsonNode j1 = point("2026-05-01");
        long ligneId = j1.get("lignes").get(0).get("id").asLong();
        majLigne(ligneId, 3, null); // nouveau stock 3

        // Vendre 4 alors qu'il n'y a que 3 -> refus (409)
        mockMvc.perform(post("/api/registre/lignes/" + ligneId + "/vente")
                        .header("Authorization", "Bearer " + token)
                        .param("quantite", "4"))
                .andExpect(status().isConflict());
    }

    private JsonNode vente(long ligneId, int quantite) throws Exception {
        String response = mockMvc.perform(post("/api/registre/lignes/" + ligneId + "/vente")
                        .header("Authorization", "Bearer " + token)
                        .param("quantite", String.valueOf(quantite)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response);
    }
}
