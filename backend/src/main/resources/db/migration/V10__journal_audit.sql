-- ============================================================
-- Module « Sécurité » : journal d'audit (qui a fait quoi, quand).
-- Trace les actions sensibles : connexions, gestion des comptes,
-- des fournisseurs, etc. Pas de FK vers utilisateur : on garde
-- l'acteur en snapshot texte pour préserver l'historique même
-- après suppression d'un compte.
-- ============================================================

CREATE TABLE journal_audit (
    id             BIGSERIAL PRIMARY KEY,
    date_heure     TIMESTAMP    NOT NULL,
    utilisateur_id BIGINT,
    acteur         VARCHAR(255) NOT NULL,
    action         VARCHAR(64)  NOT NULL,
    cible          VARCHAR(255),
    details        VARCHAR(500)
);

CREATE INDEX idx_journal_audit_date ON journal_audit (date_heure DESC);
CREATE INDEX idx_journal_audit_action ON journal_audit (action);
