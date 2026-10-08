package com.gestioncave.tableaubord;

import com.gestioncave.analyse.AnalyseService;
import com.gestioncave.analyse.dto.AnalyseMargeResponse;
import com.gestioncave.analyse.dto.LigneMargeResponse;
import com.gestioncave.charge.RentabiliteService;
import com.gestioncave.charge.dto.ChargeResponse;
import com.gestioncave.charge.dto.RentabiliteResponse;
import com.gestioncave.common.BusinessException;
import com.gestioncave.etablissement.EtablissementRepository;
import com.gestioncave.security.AppUserDetails;
import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.util.Locale;

/**
 * Génère les rapports mensuels exportables (Excel .xlsx et PDF), réservés au propriétaire.
 * Réutilise l'analyse des marges (module 6) et la rentabilité (module 7).
 */
@Service
@Transactional(readOnly = true)
public class RapportService {

    private static final String[] MOIS = {
            "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
            "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    };

    private final AnalyseService analyseService;
    private final RentabiliteService rentabiliteService;
    private final EtablissementRepository etablissementRepository;

    public RapportService(AnalyseService analyseService,
                          RentabiliteService rentabiliteService,
                          EtablissementRepository etablissementRepository) {
        this.analyseService = analyseService;
        this.rentabiliteService = rentabiliteService;
        this.etablissementRepository = etablissementRepository;
    }

    public String nomFichier(int annee, int mois, String extension) {
        return "rapport-" + annee + "-" + String.format("%02d", mois) + "." + extension;
    }

    private String perimetre(Long etablissementId) {
        if (etablissementId == null) {
            return "Consolidé (tous les maquis)";
        }
        return etablissementRepository.findById(etablissementId)
                .map(e -> e.getNom())
                .orElse("Établissement " + etablissementId);
    }

    private static String fmt(BigDecimal montant) {
        if (montant == null) {
            return "—";
        }
        DecimalFormatSymbols s = new DecimalFormatSymbols(Locale.FRANCE);
        s.setGroupingSeparator(' ');
        DecimalFormat df = new DecimalFormat("#,##0", s);
        return df.format(montant.setScale(0, RoundingMode.HALF_UP)) + " FCFA";
    }

    // ==================================================================
    //  Excel (.xlsx)
    // ==================================================================

    public byte[] excel(AppUserDetails user, Long etablissementId, int annee, int mois) {
        if (mois < 1 || mois > 12) {
            throw new BusinessException("Le mois doit être compris entre 1 et 12.");
        }
        LocalDate debut = LocalDate.of(annee, mois, 1);
        LocalDate fin = debut.plusMonths(1).minusDays(1);
        AnalyseMargeResponse analyse = analyseService.analyserMarges(user, etablissementId, debut, fin);
        RentabiliteResponse rent = rentabiliteService.rentabilite(user, etablissementId, annee, mois);

        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            CellStyle titre = styleGras(wb, 14);
            CellStyle entete = styleEntete(wb);
            CellStyle money = styleMoney(wb);

            // --- Feuille Synthèse ---
            Sheet synth = wb.createSheet("Synthèse");
            int r = 0;
            ecrire(synth, r++, 0, "Rapport mensuel — " + MOIS[mois - 1] + " " + annee, titre);
            ecrire(synth, r++, 0, "Périmètre : " + perimetre(etablissementId), null);
            r++;
            r = ligneKpi(synth, r, "Chiffre d'affaires", rent.chiffreAffaires(), money);
            r = ligneKpi(synth, r, "Bénéfice brut", rent.beneficeBrut(), money);
            r = ligneKpi(synth, r, "Total des charges", rent.totalCharges(), money);
            r = ligneKpi(synth, r, "Bénéfice net", rent.beneficeNet(), money);
            r = ligneKpi(synth, r, "Résultat", null, null);
            ecrire(synth, r - 1, 1, rent.beneficiaire() ? "Bénéficiaire" : "Déficitaire", null);
            r = ligneKpi(synth, r, "Seuil de rentabilité (C.A.)", rent.chiffreAffairesSeuil(), money);
            synth.setColumnWidth(0, 8000);
            synth.setColumnWidth(1, 6000);

            // --- Feuille Marges par boisson ---
            Sheet mrg = wb.createSheet("Marges par boisson");
            String[] cols = {"Boisson", "Vendu", "C.A.", "Revient/u", "Marge/u", "Bénéfice", "Stock", "Valeur stock"};
            enteteLigne(mrg, 0, cols, entete);
            int rm = 1;
            for (LigneMargeResponse l : analyse.lignes()) {
                Row row = mrg.createRow(rm++);
                row.createCell(0).setCellValue(l.designation());
                row.createCell(1).setCellValue(l.quantiteVendue());
                cellMoney(row, 2, l.chiffreAffaires(), money);
                cellMoney(row, 3, l.prixRevientUnitaire(), money);
                cellMoney(row, 4, l.margeUnitaire(), money);
                cellMoney(row, 5, l.benefice(), money);
                row.createCell(6).setCellValue(l.stockRestant());
                cellMoney(row, 7, l.valorisationStockRevient(), money);
            }
            for (int c = 0; c < cols.length; c++) {
                mrg.setColumnWidth(c, c == 0 ? 7000 : 4000);
            }

            // --- Feuille Charges ---
            Sheet chg = wb.createSheet("Charges");
            String[] colsC = {"Catégorie", "Libellé", "Périodicité", "Montant"};
            enteteLigne(chg, 0, colsC, entete);
            int rc = 1;
            for (ChargeResponse c : rent.charges()) {
                Row row = chg.createRow(rc++);
                row.createCell(0).setCellValue(c.categorie().name());
                row.createCell(1).setCellValue(c.libelle());
                row.createCell(2).setCellValue(c.periodicite().name());
                cellMoney(row, 3, c.montant(), money);
            }
            for (int c = 0; c < colsC.length; c++) {
                chg.setColumnWidth(c, c == 1 ? 7000 : 4000);
            }

            wb.write(out);
            return out.toByteArray();
        } catch (java.io.IOException e) {
            throw new BusinessException("Impossible de générer le fichier Excel : " + e.getMessage());
        }
    }

    private int ligneKpi(Sheet sheet, int r, String libelle, BigDecimal valeur, CellStyle money) {
        Row row = sheet.createRow(r);
        row.createCell(0).setCellValue(libelle);
        if (valeur != null) {
            Cell c = row.createCell(1);
            c.setCellValue(valeur.doubleValue());
            if (money != null) c.setCellStyle(money);
        }
        return r + 1;
    }

    private void enteteLigne(Sheet sheet, int r, String[] cols, CellStyle style) {
        Row row = sheet.createRow(r);
        for (int i = 0; i < cols.length; i++) {
            Cell c = row.createCell(i);
            c.setCellValue(cols[i]);
            c.setCellStyle(style);
        }
    }

    private void ecrire(Sheet sheet, int r, int col, String valeur, CellStyle style) {
        Row row = sheet.getRow(r);
        if (row == null) row = sheet.createRow(r);
        Cell c = row.createCell(col);
        c.setCellValue(valeur);
        if (style != null) c.setCellStyle(style);
    }

    private void cellMoney(Row row, int col, BigDecimal valeur, CellStyle money) {
        Cell c = row.createCell(col);
        if (valeur != null) {
            c.setCellValue(valeur.doubleValue());
            c.setCellStyle(money);
        }
    }

    private CellStyle styleGras(Workbook wb, int taille) {
        CellStyle s = wb.createCellStyle();
        org.apache.poi.ss.usermodel.Font f = wb.createFont();
        f.setBold(true);
        f.setFontHeightInPoints((short) taille);
        s.setFont(f);
        return s;
    }

    private CellStyle styleEntete(Workbook wb) {
        CellStyle s = wb.createCellStyle();
        org.apache.poi.ss.usermodel.Font f = wb.createFont();
        f.setBold(true);
        s.setFont(f);
        s.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        s.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        return s;
    }

    private CellStyle styleMoney(Workbook wb) {
        CellStyle s = wb.createCellStyle();
        s.setDataFormat(wb.createDataFormat().getFormat("#,##0 \"FCFA\""));
        return s;
    }

    // ==================================================================
    //  PDF
    // ==================================================================

    public byte[] pdf(AppUserDetails user, Long etablissementId, int annee, int mois) {
        if (mois < 1 || mois > 12) {
            throw new BusinessException("Le mois doit être compris entre 1 et 12.");
        }
        LocalDate debut = LocalDate.of(annee, mois, 1);
        LocalDate fin = debut.plusMonths(1).minusDays(1);
        AnalyseMargeResponse analyse = analyseService.analyserMarges(user, etablissementId, debut, fin);
        RentabiliteResponse rent = rentabiliteService.rentabilite(user, etablissementId, annee, mois);

        Font h1 = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16);
        Font h2 = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
        Font normal = FontFactory.getFont(FontFactory.HELVETICA, 10);
        Font gras = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 36, 36, 36, 36);
            PdfWriter.getInstance(doc, out);
            doc.open();

            doc.add(new Paragraph("Rapport mensuel — " + MOIS[mois - 1] + " " + annee, h1));
            doc.add(new Paragraph("Périmètre : " + perimetre(etablissementId), normal));
            doc.add(Chunk.NEWLINE);

            // Synthèse
            doc.add(new Paragraph("Synthèse", h2));
            PdfPTable synth = new PdfPTable(2);
            synth.setWidthPercentage(100);
            synth.setSpacingBefore(6);
            kpi(synth, "Chiffre d'affaires", fmt(rent.chiffreAffaires()), normal, gras);
            kpi(synth, "Bénéfice brut", fmt(rent.beneficeBrut()), normal, gras);
            kpi(synth, "Total des charges", fmt(rent.totalCharges()), normal, gras);
            kpi(synth, "Bénéfice net", fmt(rent.beneficeNet()), normal, gras);
            kpi(synth, "Résultat", rent.beneficiaire() ? "Bénéficiaire" : "Déficitaire", normal, gras);
            kpi(synth, "Seuil de rentabilité (C.A.)", fmt(rent.chiffreAffairesSeuil()), normal, gras);
            doc.add(synth);
            doc.add(Chunk.NEWLINE);

            // Marges par boisson
            doc.add(new Paragraph("Marges par boisson", h2));
            PdfPTable tm = new PdfPTable(new float[]{3, 1, 2, 2, 2, 2, 1.5f});
            tm.setWidthPercentage(100);
            tm.setSpacingBefore(6);
            for (String c : new String[]{"Boisson", "Vendu", "C.A.", "Revient/u", "Marge/u", "Bénéfice", "Stock"}) {
                enteteCell(tm, c, gras);
            }
            for (LigneMargeResponse l : analyse.lignes()) {
                celluleGauche(tm, l.designation(), normal);
                celluleDroite(tm, String.valueOf(l.quantiteVendue()), normal);
                celluleDroite(tm, fmt(l.chiffreAffaires()), normal);
                celluleDroite(tm, fmt(l.prixRevientUnitaire()), normal);
                celluleDroite(tm, fmt(l.margeUnitaire()), normal);
                celluleDroite(tm, fmt(l.benefice()), normal);
                celluleDroite(tm, String.valueOf(l.stockRestant()), normal);
            }
            doc.add(tm);
            doc.add(Chunk.NEWLINE);

            // Charges
            doc.add(new Paragraph("Charges du mois", h2));
            PdfPTable tc = new PdfPTable(new float[]{2, 4, 2, 2});
            tc.setWidthPercentage(100);
            tc.setSpacingBefore(6);
            for (String c : new String[]{"Catégorie", "Libellé", "Périodicité", "Montant"}) {
                enteteCell(tc, c, gras);
            }
            if (rent.charges().isEmpty()) {
                PdfPCell vide = new PdfPCell(new Phrase("Aucune charge saisie pour ce mois.", normal));
                vide.setColspan(4);
                tc.addCell(vide);
            } else {
                for (ChargeResponse c : rent.charges()) {
                    celluleGauche(tc, c.categorie().name(), normal);
                    celluleGauche(tc, c.libelle(), normal);
                    celluleGauche(tc, c.periodicite().name(), normal);
                    celluleDroite(tc, fmt(c.montant()), normal);
                }
            }
            doc.add(tc);

            doc.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new BusinessException("Impossible de générer le PDF : " + e.getMessage());
        }
    }

    private void kpi(PdfPTable table, String libelle, String valeur, Font normal, Font gras) {
        table.addCell(cellSansBordure(new Phrase(libelle, normal)));
        PdfPCell v = cellSansBordure(new Phrase(valeur, gras));
        v.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(v);
    }

    private PdfPCell cellSansBordure(Phrase p) {
        PdfPCell c = new PdfPCell(p);
        c.setBorder(Rectangle.NO_BORDER);
        c.setPadding(3);
        return c;
    }

    private void enteteCell(PdfPTable table, String texte, Font gras) {
        PdfPCell c = new PdfPCell(new Phrase(texte, gras));
        c.setBackgroundColor(new java.awt.Color(230, 230, 230));
        c.setPadding(4);
        table.addCell(c);
    }

    private void celluleGauche(PdfPTable table, String texte, Font font) {
        PdfPCell c = new PdfPCell(new Phrase(texte, font));
        c.setPadding(4);
        table.addCell(c);
    }

    private void celluleDroite(PdfPTable table, String texte, Font font) {
        PdfPCell c = new PdfPCell(new Phrase(texte, font));
        c.setHorizontalAlignment(Element.ALIGN_RIGHT);
        c.setPadding(4);
        table.addCell(c);
    }
}
