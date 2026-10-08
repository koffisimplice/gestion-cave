-- ============================================================
-- Module 7 : charges d'exploitation et rentabilité
-- ============================================================

CREATE TABLE charge (
    id               BIGSERIAL PRIMARY KEY,
    etablissement_id BIGINT         NOT NULL,
    categorie        VARCHAR(12)    NOT NULL,
    libelle          VARCHAR(200)   NOT NULL,
    montant          NUMERIC(14, 2) NOT NULL,
    periodicite      VARCHAR(16)    NOT NULL,
    annee            INTEGER        NOT NULL,
    mois             INTEGER        NOT NULL,
    created_at       TIMESTAMP      NOT NULL DEFAULT now(),
    CONSTRAINT fk_charge_etablissement FOREIGN KEY (etablissement_id) REFERENCES etablissement (id),
    CONSTRAINT ck_charge_categorie CHECK (categorie IN ('VARIABLE', 'FIXE', 'OBLIGATOIRE')),
    CONSTRAINT ck_charge_periodicite CHECK (periodicite IN
        ('PONCTUELLE', 'HEBDOMADAIRE', 'MENSUELLE', 'TRIMESTRIELLE', 'ANNUELLE')),
    CONSTRAINT ck_charge_mois     CHECK (mois BETWEEN 1 AND 12),
    CONSTRAINT ck_charge_montant  CHECK (montant >= 0)
);

CREATE INDEX idx_charge_etab_periode ON charge (etablissement_id, annee, mois);
