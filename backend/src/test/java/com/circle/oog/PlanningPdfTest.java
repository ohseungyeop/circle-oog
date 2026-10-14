package com.circle.oog;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.web.server.ResponseStatusException;
import java.nio.file.*;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

class PlanningPdfTest {
    @TempDir Path temp;
    @Test void savedScenariosKeepKoreanWarningsAllAssignmentsAndUnassignedWithDiagrams()throws Exception {
        Path font=Path.of(System.getenv().getOrDefault("OOG_PDF_FONT","C:/Windows/Fonts/malgun.ttf"));
        assertTrue(Files.isRegularFile(font),"Set OOG_PDF_FONT to a Korean TrueType font for PDF generation QA");
        var json=new ObjectMapper();var scenario=json.readTree("""
          {"objective":"MIN_EQUIPMENT","containers":[{"number":1,"equipment":"40FR","length":12000,"width":2400,"height":2200,"usableLength":11280,"payloadLimit":36000,"weight":12500,"ruleVersion":7,"assignments":[{"itemNo":"한국어 화물","piece":1,"x":0,"y":-200,"z":0,"length":6000,"width":2800,"height":2000,"weight":12500,"rotated":false,"locked":true}]}],"unassigned":[{"itemNo":"미배정 대형화물","piece":2,"reason":"선사와 공학 검토 필요"}],"warnings":["지지점, 하중 분포, CoG, 라싱 및 선사 승인은 별도 검토해야 합니다."]}
          """);
        var result=json.createObjectNode().put("algorithm","SAVED-SNAPSHOT");var array=result.putArray("scenarios");array.add(scenario);var second=scenario.deepCopy();((com.fasterxml.jackson.databind.node.ObjectNode)second).put("objective","ONE_CARGO_PER_EQUIPMENT");array.add(second);
        result.putObject("revision").put("sourcePlanId","SOURCE-PLAN-TEST").put("scenarioIndex",0);result.putArray("warnings").add("전체 계획 경고 유지");
        var input=json.readTree("""
          {"ruleSelection":{"carrier":"TEST-CARRIER","effectiveDate":"2026-10-14","fallback":true,"fallbackVersion":7},"rules":[{"equipmentCode":"40FR","usableLengthRatio":0.94,"planningWeightRatio":0.9,"maxOverWidth":1600,"maxOverHeight":1800,"version":7}]}
          """);
        byte[] bytes=PlanningPdfRenderer.render(UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),"한글 OOG 검증 프로젝트","2026-10-13 23:00 KST",result,input,font);
        try(var doc=Loader.loadPDF(bytes)) {
            String text=new PDFTextStripper().getText(doc);assertEquals(5,doc.getNumberOfPages());
            assertTrue(text.contains("MIN_EQUIPMENT"));assertTrue(text.contains("ONE_CARGO_PER_EQUIPMENT"));assertTrue(text.contains("미배정 대형화물"));assertTrue(text.contains("한국어 화물"));assertTrue(text.contains("선사와 공학 검토 필요"));assertTrue(text.contains("PRE_PLAN"));assertTrue(text.contains("TOP (X / Y)"));assertTrue(text.contains("SIDE (X / Z)"));assertTrue(text.contains("FRONT (Y / Z)"));
            assertTrue(text.contains("TEST-CARRIER"));assertTrue(text.contains("2026-10-14"));assertTrue(text.contains("fallbackVersion"));assertTrue(text.contains("SOURCE-PLAN-TEST"));assertTrue(text.contains("전체 계획 경고 유지"));
        }
        Path output=Path.of("../output/pdf/oog-clp-qa.pdf").toAbsolutePath().normalize();Files.createDirectories(output.getParent());Files.write(output,bytes);
    }
    @Test void missingFontGivesActionable503()throws Exception {
        var empty=new ObjectMapper().createObjectNode();var failure=assertThrows(ResponseStatusException.class,()->PlanningPdfRenderer.render(UUID.randomUUID(),"project","saved",empty,empty,temp.resolve("absent.ttf")));
        assertEquals(503,failure.getStatusCode().value());assertTrue(failure.getReason().contains("OOG_PDF_FONT"));
    }
    @Test void longWarningsPaginateWithoutDroppingLastUnassignedPiece()throws Exception {
        var json=new ObjectMapper();var scenario=json.createObjectNode().put("objective","PAGINATION-TEST");
        var warnings=scenario.putArray("warnings");for(int i=0;i<100;i++)warnings.add("긴 경고 "+i+": "+"공학 검토가 필요합니다. ".repeat(12));
        scenario.putArray("containers");scenario.putArray("unassigned").addObject().put("itemNo","LAST-UNASSIGNED").put("piece",99).put("reason","마지막 미배정 화물 유지");
        byte[] bytes=PlanningPdfRenderer.render(UUID.randomUUID(),"페이지 분할 검증","saved",scenario,json.createObjectNode(),Path.of(System.getenv().getOrDefault("OOG_PDF_FONT","C:/Windows/Fonts/malgun.ttf")));
        try(var doc=Loader.loadPDF(bytes)){assertTrue(doc.getNumberOfPages()>3);String text=new PDFTextStripper().getText(doc);assertTrue(text.contains("LAST-UNASSIGNED"));assertTrue(text.contains("긴 경고 99"));}
    }
}
