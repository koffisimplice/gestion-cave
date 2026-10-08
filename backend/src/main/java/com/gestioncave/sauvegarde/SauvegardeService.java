package com.gestioncave.sauvegarde;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gestioncave.boisson.Boisson;
import com.gestioncave.boisson.BoissonRepository;
import com.gestioncave.charge.Charge;
import com.gestioncave.charge.ChargeRepository;
import com.gestioncave.commande.CommandeFournisseur;
import com.gestioncave.commande.CommandeFournisseurRepository;
import com.gestioncave.common.BusinessException;
import com.gestioncave.etablissement.Etablissement;
import com.gestioncave.etablissement.EtablissementRepository;
import com.gestioncave.registre.RegistreJournalier;
import com.gestioncave.registre.RegistreJournalierRepository;
import com.gestioncave.sauvegarde.dto.SauvegardeFichier;
import com.gestioncave.sauvegarde.dto.SnapshotData;
import com.gestioncave.sauvegarde.dto.SnapshotData.*;
import com.gestioncave.utilisateur.Utilisateur;
import com.gestioncave.utilisateur.UtilisateurRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.*;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Sauvegarde et restauration des données (module 9). Produit un instantané JSON
 * complet, planifie des sauvegardes automatiques sur disque et permet la restauration.
 */
@Service
public class SauvegardeService {

    private static final Logger log = LoggerFactory.getLogger(SauvegardeService.class);
    private static final String PREFIXE = "sauvegarde-";
    private static final String SUFFIXE = ".json";
    private static final DateTimeFormatter HORODATAGE =
            DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss");

    private final EtablissementRepository etablissementRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final BoissonRepository boissonRepository;
    private final RegistreJournalierRepository registreRepository;
    private final CommandeFournisseurRepository commandeRepository;
    private final ChargeRepository chargeRepository;
    private final ObjectMapper objectMapper;

    @Value("${app.sauvegarde.dossier:sauvegardes}")
    private String dossier;

    @Value("${app.sauvegarde.max-fichiers:14}")
    private int maxFichiers;

    public SauvegardeService(EtablissementRepository etablissementRepository,
                             UtilisateurRepository utilisateurRepository,
                             BoissonRepository boissonRepository,
                             RegistreJournalierRepository registreRepository,
                             CommandeFournisseurRepository commandeRepository,
                             ChargeRepository chargeRepository,
                             ObjectMapper objectMapper) {
        this.etablissementRepository = etablissementRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.boissonRepository = boissonRepository;
        this.registreRepository = registreRepository;
        this.commandeRepository = commandeRepository;
        this.chargeRepository = chargeRepository;
        this.objectMapper = objectMapper;
    }

    // ==================================================================
    //  Export (instantané)
    // ==================================================================

    @Transactional(readOnly = true)
    public SnapshotData creerSnapshot() {
        List<EtablissementSnap> etabs = etablissementRepository.findAll().stream()
                .map(e -> new EtablissementSnap(e.getId(), e.getNom(), e.getAdresse(),
                        e.getResponsable(), e.isActif()))
                .toList();

        List<UtilisateurSnap> users = utilisateurRepository.findAll().stream()
                .map(u -> new UtilisateurSnap(u.getId(), u.getNom(), u.getEmail(),
                        u.getMotDePasseHash(), u.getRole(), u.isActif(),
                        u.getEtablissements().stream().map(Etablissement::getId).sorted().toList()))
                .toList();

        List<BoissonSnap> boissons = boissonRepository.findAll().stream()
                .map(b -> new BoissonSnap(b.getId(), b.getDesignation(),
                        b.getTypeConditionnement(),
                        b.getBouteillesParConditionnement(), b.getPrixAchatCasier(),
                        b.getPrixVenteUnitaire(), b.getSeuilAlerte(), b.getCategorie(),
                        b.getPhotoUrl(), b.isActif(),
                        b.getEtablissements().stream().map(Etablissement::getId).sorted().toList()))
                .toList();

        List<RegistreSnap> registres = registreRepository.findAll().stream()
                .map(r -> new RegistreSnap(r.getId(), r.getBoisson().getId(),
                        r.getEtablissement().getId(), r.getDate(), r.getAncienStock(),
                        r.getCommandeDuJour(), r.getNouveauStock(), r.getStockRestant(),
                        r.getStockVendu(), r.getPrixUnitaire(), r.getPrixVenteTotal(),
                        r.getStatut(), r.getClotureAt()))
                .toList();

        List<CommandeSnap> commandes = commandeRepository.findAll().stream()
                .map(c -> new CommandeSnap(c.getId(), c.getBoisson().getId(),
                        c.getEtablissement().getId(), c.getDate(),
                        c.getTypeConditionnement(), c.getNombreCasiers(),
                        c.getBouteillesParCasier(), c.getBouteillesAjoutees(),
                        c.getFournisseur(), c.getPrixAchatCasier(), c.getMontantTotal()))
                .toList();

        List<ChargeSnap> charges = chargeRepository.findAll().stream()
                .map(c -> new ChargeSnap(c.getId(), c.getEtablissement().getId(),
                        c.getCategorie(), c.getLibelle(), c.getMontant(),
                        c.getPeriodicite(), c.getAnnee(), c.getMois()))
                .toList();

        return new SnapshotData(SnapshotData.VERSION_COURANTE, Instant.now(),
                etabs, users, boissons, registres, commandes, charges);
    }

    public byte[] exporterJson() {
        try {
            return objectMapper.writerWithDefaultPrettyPrinter()
                    .writeValueAsBytes(creerSnapshot());
        } catch (IOException e) {
            throw new BusinessException("Impossible de générer la sauvegarde : " + e.getMessage());
        }
    }

    // ==================================================================
    //  Restauration
    // ==================================================================

    /** Restaure les données à partir d'un JSON de sauvegarde. REMPLACE toutes les données. */
    @Transactional
    public void restaurer(byte[] json) {
        SnapshotData data;
        try {
            data = objectMapper.readValue(json, SnapshotData.class);
        } catch (IOException e) {
            throw new BusinessException("Fichier de sauvegarde invalide ou illisible.");
        }
        if (data == null || data.etablissements() == null) {
            throw new BusinessException("Fichier de sauvegarde invalide (contenu manquant).");
        }
        restaurerData(data);
    }

    @Transactional
    public void restaurerData(SnapshotData data) {
        // 1) Purge (enfants d'abord pour respecter les clés étrangères).
        chargeRepository.deleteAll();
        commandeRepository.deleteAll();
        registreRepository.deleteAll();
        boissonRepository.deleteAll();
        utilisateurRepository.deleteAll();
        etablissementRepository.deleteAll();
        etablissementRepository.flush();

        // 2) Reconstruction avec remappage des identifiants d'origine.
        Map<Long, Etablissement> etabByOld = new HashMap<>();
        for (EtablissementSnap e : nn(data.etablissements())) {
            Etablissement saved = etablissementRepository.save(Etablissement.builder()
                    .nom(e.nom()).adresse(e.adresse()).responsable(e.responsable())
                    .actif(e.actif()).build());
            etabByOld.put(e.id(), saved);
        }

        for (UtilisateurSnap u : nn(data.utilisateurs())) {
            utilisateurRepository.save(Utilisateur.builder()
                    .nom(u.nom()).email(u.email()).motDePasseHash(u.motDePasseHash())
                    .role(u.role()).actif(u.actif())
                    .etablissements(resoudreEtabs(u.etablissementIds(), etabByOld))
                    .build());
        }

        Map<Long, Boisson> boissonByOld = new HashMap<>();
        for (BoissonSnap b : nn(data.boissons())) {
            Boisson saved = boissonRepository.save(Boisson.builder()
                    .designation(b.designation())
                    .typeConditionnement(b.typeConditionnement() != null
                            ? b.typeConditionnement()
                            : com.gestioncave.boisson.TypeConditionnement.CASIER)
                    .bouteillesParConditionnement(b.bouteillesParConditionnement())
                    .prixAchatCasier(b.prixAchatCasier())
                    .prixVenteUnitaire(b.prixVenteUnitaire())
                    .seuilAlerte(b.seuilAlerte())
                    .categorie(b.categorie()).photoUrl(b.photoUrl()).actif(b.actif())
                    .etablissements(resoudreEtabs(b.etablissementIds(), etabByOld))
                    .build());
            boissonByOld.put(b.id(), saved);
        }

        for (RegistreSnap r : nn(data.registres())) {
            Boisson boisson = boissonByOld.get(r.boissonId());
            Etablissement etab = etabByOld.get(r.etablissementId());
            if (boisson == null || etab == null) continue;
            registreRepository.save(RegistreJournalier.builder()
                    .boisson(boisson).etablissement(etab).date(r.date())
                    .ancienStock(r.ancienStock()).commandeDuJour(r.commandeDuJour())
                    .nouveauStock(r.nouveauStock()).stockRestant(r.stockRestant())
                    .stockVendu(r.stockVendu()).prixUnitaire(r.prixUnitaire())
                    .prixVenteTotal(r.prixVenteTotal()).statut(r.statut())
                    .clotureAt(r.clotureAt()).build());
        }

        for (CommandeSnap c : nn(data.commandes())) {
            Boisson boisson = boissonByOld.get(c.boissonId());
            Etablissement etab = etabByOld.get(c.etablissementId());
            if (boisson == null || etab == null) continue;
            commandeRepository.save(CommandeFournisseur.builder()
                    .boisson(boisson).etablissement(etab).date(c.date())
                    .typeConditionnement(c.typeConditionnement() != null
                            ? c.typeConditionnement()
                            : com.gestioncave.boisson.TypeConditionnement.CASIER)
                    .nombreCasiers(c.nombreCasiers()).bouteillesParCasier(c.bouteillesParCasier())
                    .bouteillesAjoutees(c.bouteillesAjoutees()).fournisseur(c.fournisseur())
                    .prixAchatCasier(c.prixAchatCasier()).montantTotal(c.montantTotal()).build());
        }

        for (ChargeSnap c : nn(data.charges())) {
            Etablissement etab = etabByOld.get(c.etablissementId());
            if (etab == null) continue;
            chargeRepository.save(Charge.builder()
                    .etablissement(etab).categorie(c.categorie()).libelle(c.libelle())
                    .montant(c.montant()).periodicite(c.periodicite())
                    .annee(c.annee()).mois(c.mois()).build());
        }

        log.info("Restauration terminée : {} établissements, {} utilisateurs, {} boissons.",
                etabByOld.size(), nn(data.utilisateurs()).size(), boissonByOld.size());
    }

    private Set<Etablissement> resoudreEtabs(List<Long> ids, Map<Long, Etablissement> map) {
        Set<Etablissement> resultat = new HashSet<>();
        for (Long id : nn(ids)) {
            Etablissement e = map.get(id);
            if (e != null) resultat.add(e);
        }
        return resultat;
    }

    private static <T> List<T> nn(List<T> l) {
        return l != null ? l : List.of();
    }

    // ==================================================================
    //  Fichiers sur disque + planification
    // ==================================================================

    /** Sauvegarde automatique quotidienne (par défaut à 02h00). */
    @Scheduled(cron = "${app.sauvegarde.cron:0 0 2 * * *}")
    public void sauvegardeAutomatique() {
        try {
            SauvegardeFichier f = sauvegarderSurDisque();
            log.info("Sauvegarde automatique créée : {} ({} octets).", f.nom(), f.tailleOctets());
        } catch (Exception e) {
            log.error("Échec de la sauvegarde automatique.", e);
        }
    }

    public SauvegardeFichier sauvegarderSurDisque() {
        try {
            Path dir = Paths.get(dossier);
            Files.createDirectories(dir);
            String nom = PREFIXE + LocalDateTime.now().format(HORODATAGE) + SUFFIXE;
            Path fichier = dir.resolve(nom);
            byte[] contenu = exporterJson();
            Files.write(fichier, contenu);
            nettoyerAnciennes(dir);
            return new SauvegardeFichier(nom, contenu.length, Instant.now());
        } catch (IOException e) {
            throw new BusinessException("Impossible d'écrire la sauvegarde sur disque : " + e.getMessage());
        }
    }

    public List<SauvegardeFichier> listerFichiers() {
        Path dir = Paths.get(dossier);
        if (!Files.isDirectory(dir)) {
            return List.of();
        }
        try (var flux = Files.list(dir)) {
            return flux
                    .filter(p -> p.getFileName().toString().startsWith(PREFIXE)
                            && p.getFileName().toString().endsWith(SUFFIXE))
                    .map(this::versFichier)
                    .filter(Objects::nonNull)
                    .sorted(Comparator.comparing(SauvegardeFichier::nom).reversed())
                    .toList();
        } catch (IOException e) {
            throw new BusinessException("Impossible de lister les sauvegardes : " + e.getMessage());
        }
    }

    public byte[] lireFichier(String nom) {
        valider(nom);
        Path fichier = Paths.get(dossier).resolve(nom).normalize();
        if (!fichier.startsWith(Paths.get(dossier).normalize()) || !Files.exists(fichier)) {
            throw new BusinessException("Sauvegarde introuvable : " + nom);
        }
        try {
            return Files.readAllBytes(fichier);
        } catch (IOException e) {
            throw new BusinessException("Impossible de lire la sauvegarde : " + e.getMessage());
        }
    }

    /** Restaure à partir d'un fichier de sauvegarde stocké sur le serveur. */
    public void restaurerDepuisFichier(String nom) {
        restaurer(lireFichier(nom));
    }

    private void valider(String nom) {
        if (nom == null || !nom.startsWith(PREFIXE) || !nom.endsWith(SUFFIXE)
                || nom.contains("/") || nom.contains("\\") || nom.contains("..")) {
            throw new BusinessException("Nom de sauvegarde invalide.");
        }
    }

    private void nettoyerAnciennes(Path dir) throws IOException {
        try (var flux = Files.list(dir)) {
            List<Path> fichiers = flux
                    .filter(p -> p.getFileName().toString().startsWith(PREFIXE)
                            && p.getFileName().toString().endsWith(SUFFIXE))
                    .sorted(Comparator.comparing((Path p) -> p.getFileName().toString()).reversed())
                    .toList();
            for (int i = maxFichiers; i < fichiers.size(); i++) {
                Files.deleteIfExists(fichiers.get(i));
            }
        }
    }

    private SauvegardeFichier versFichier(Path p) {
        try {
            return new SauvegardeFichier(p.getFileName().toString(), Files.size(p),
                    Files.getLastModifiedTime(p).toInstant());
        } catch (IOException e) {
            return null;
        }
    }
}
