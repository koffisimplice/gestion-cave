package com.gestioncave.commande;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gestioncave.boisson.Boisson;
import com.gestioncave.boisson.BoissonRepository;
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
class CommandeFlowTest {

    @Autowired MockMvc mockMvc;
    @Autowired UtilisateurRepository utilisateurRepository;
    @Autowired EtablissementRepository etablissementRepository;
    @Autowired BoissonRepository boissonRepository;
    @Autowired CommandeFournisseurRepository commandeRepository;
    @Autowired RegistreJournalierRepository registreRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired ObjectMapper objectMapper;

    private Long etablissementId;
    private Long boissonId;

    @BeforeEach
    void setUp() {
        commandeRepository.deleteAll();
        registreRepository.deleteAll();
        boissonRepository.deleteAll();
        utilisateurRepository.deleteAll();
        etablissementRepository.deleteAll();

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
        // Contexte Spring partagé : on nettoie les dépendances (FK) pour ne pas gêner les autres tests.
        commandeRepository.deleteAll();
        registreRepository.deleteAll();
        boissonRepository.deleteAll();
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

    private JsonNode point(String token, String date) throws Exception {
        String response = mockMvc.perform(get("/api/registre")
                        .header("Authorization", "Bearer " + token)
                        .param("etablissementId", String.valueOf(etablissementId))
                        .param("date", date))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response);
    }

    @Test
    void achat_alimente_la_commande_du_jour_du_registre() throws Exception {
        String token = login("gerant@test.local");

        String body = "{\"boissonId\":" + boissonId + ",\"etablissementId\":" + etablissementId
                + ",\"date\":\"2026-01-15\",\"nombreCasiers\":5,\"fournisseur\":\"Depot central\"}";
        String rep = mockMvc.perform(post("/api/commandes")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        JsonNode achat = objectMapper.readTree(rep);

        // Conversion : 5 casiers x 12 = 60 bouteilles
        assertThat(achat.get("bouteillesAjoutees").asInt()).isEqualTo(60);
        // Coûts masqués pour le gérant
        assertThat(achat.get("montantTotal").isNull()).isTrue();
        assertThat(achat.get("prixAchatCasier").isNull()).isTrue();

        // Le registre du jour reflète l'entrée de stock
        JsonNode ligne = point(token, "2026-01-15").get("lignes").get(0);
        assertThat(ligne.get("commandeDuJour").asInt()).isEqualTo(60);
        assertThat(ligne.get("nouveauStock").asInt()).isEqualTo(60);
    }

    @Test
    void deux_achats_cumulent_puis_suppression_retranche() throws Exception {
        String token = login("gerant@test.local");

        creerAchat(token, 5); // +60
        String rep = creerAchat(token, 2); // +24
        long deuxiemeId = objectMapper.readTree(rep).get("id").asLong();

        assertThat(point(token, "2026-01-15").get("lignes").get(0).get("commandeDuJour").asInt())
                .isEqualTo(84);

        // Suppression du 2e achat -> retour à 60
        mockMvc.perform(delete("/api/commandes/" + deuxiemeId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        assertThat(point(token, "2026-01-15").get("lignes").get(0).get("commandeDuJour").asInt())
                .isEqualTo(60);
    }

    @Test
    void proprietaire_voit_le_montant_total() throws Exception {
        String tokenGerant = login("gerant@test.local");
        creerAchat(tokenGerant, 5);

        String tokenProprio = login("proprio@test.local");
        String rep = mockMvc.perform(get("/api/commandes")
                        .header("Authorization", "Bearer " + tokenProprio)
                        .param("etablissementId", String.valueOf(etablissementId)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode achat = objectMapper.readTree(rep).get(0);

        // 5 casiers x 6000 = 30000
        assertThat(achat.get("montantTotal").asInt()).isEqualTo(30000);
        assertThat(achat.get("prixAchatCasier").asInt()).isEqualTo(6000);
    }

    private String creerAchat(String token, int casiers) throws Exception {
        String body = "{\"boissonId\":" + boissonId + ",\"etablissementId\":" + etablissementId
                + ",\"date\":\"2026-01-15\",\"nombreCasiers\":" + casiers + "}";
        return mockMvc.perform(post("/api/commandes")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
    }
}
