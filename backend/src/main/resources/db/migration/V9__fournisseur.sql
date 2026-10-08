-- ============================================================
-- Module « Fiche fournisseur » : répertoire des fournisseurs
-- + lien depuis les achats (historique et comparaison de prix).
-- ============================================================

CREATE TABLE fournisseur (
    id         BIGSERIAL PRIMARY KEY,
    nom        VARCHAR(255) NOT NULL,
    telephone  VARCHAR(30),
    contact    VARCHAR(255),
    adresse    VARCHAR(255),
    notes      VARCHAR(1000),
    actif      BOOLEAN   NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uk_fournisseur_nom UNIQUE (nom)
);

-- Lien optionnel depuis un achat vers une fiche fournisseur. La colonne texte
-- « fournisseur » existante est conservée comme snapshot du nom (rapports/legacy).
ALTER TABLE commande_fournisseur
    ADD COLUMN fournisseur_id BIGINT;

ALTER TABLE commande_fournisseur
    ADD CONSTRAINT fk_commande_fournisseur
        FOREIGN KEY (fournisseur_id) REFERENCES fournisseur (id);

CREATE INDEX idx_commande_fournisseur_ref ON commande_fournisseur (fournisseur_id);
