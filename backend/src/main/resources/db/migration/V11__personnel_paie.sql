-- ============================================================
-- Module « Personnel & Paie » : employés rattachés à un maquis
-- et paiement mensuel des salaires. Chaque paiement génère une
-- charge (catégorie SALAIRE) pour un bénéfice net exact.
-- ============================================================

-- Étend la catégorie des charges pour accepter les salaires générés.
ALTER TABLE charge DROP CONSTRAINT ck_charge_categorie;
ALTER TABLE charge ADD CONSTRAINT ck_charge_categorie
    CHECK (categorie IN ('VARIABLE', 'FIXE', 'OBLIGATOIRE', 'SALAIRE'));

CREATE TABLE employe (
    id               BIGSERIAL PRIMARY KEY,
    etablissement_id BIGINT         NOT NULL,
    nom              VARCHAR(120)   NOT NULL,
    poste            VARCHAR(80),
    salaire_mensuel  NUMERIC(14, 2) NOT NULL,
    telephone        VARCHAR(30),
    date_embauche    DATE,
    actif            BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP      NOT NULL DEFAULT now(),
    CONSTRAINT fk_employe_etablissement FOREIGN KEY (etablissement_id) REFERENCES etablissement (id),
    CONSTRAINT ck_employe_salaire CHECK (salaire_mensuel >= 0)
);

CREATE INDEX idx_employe_etab ON employe (etablissement_id);

CREATE TABLE paiement_salaire (
    id            BIGSERIAL PRIMARY KEY,
    employe_id    BIGINT         NOT NULL,
    annee         INTEGER        NOT NULL,
    mois          INTEGER        NOT NULL,
    montant       NUMERIC(14, 2) NOT NULL,
    date_paiement DATE           NOT NULL,
    charge_id     BIGINT,
    created_at    TIMESTAMP      NOT NULL DEFAULT now(),
    CONSTRAINT fk_paiement_employe FOREIGN KEY (employe_id) REFERENCES employe (id),
    CONSTRAINT fk_paiement_charge  FOREIGN KEY (charge_id) REFERENCES charge (id),
    CONSTRAINT uq_paiement_employe_periode UNIQUE (employe_id, annee, mois),
    CONSTRAINT ck_paiement_mois    CHECK (mois BETWEEN 1 AND 12),
    CONSTRAINT ck_paiement_montant CHECK (montant >= 0)
);

CREATE INDEX idx_paiement_periode ON paiement_salaire (annee, mois);
