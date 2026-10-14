package com.circle.oog;
import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.Test;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import java.nio.file.*;
import java.util.*;
import java.io.ByteArrayInputStream;
import static org.junit.jupiter.api.Assertions.*;
class ComparisonExportTest {
 @Test void movementRotationLockRuleAndStateAreCompared()throws Exception{
  var json=new ObjectMapper();var left=json.readTree("""
   {"input":{"rules":[{"version":1}]},"result":{"scenarios":[{"objective":"MIN","containers":[{"number":1,"equipment":"40FR","ruleVersion":1,"assignments":[{"cargoId":"A","piece":1,"x":0,"rotated":false,"locked":false}]}],"unassigned":[{"cargoId":"B","piece":1,"reason":"pending"}]}]}}
   """);
  var right=left.deepCopy();var box=right.path("result").path("scenarios").get(0).path("containers").get(0);((com.fasterxml.jackson.databind.node.ObjectNode)box).put("ruleVersion",2);var a=(com.fasterxml.jackson.databind.node.ObjectNode)box.path("assignments").get(0);a.put("x",500);a.put("locked",true);a.put("rotated",true);
  var report=PlanComparisonController.difference(left,right);assertEquals("SNAPSHOT_COMPARISON",report.get("status"));var changes=json.valueToTree(report).path("scenarios").get(0).path("changes");assertEquals(1,changes.size());String fields=changes.get(0).path("fields").toString();assertTrue(fields.contains("x"));assertTrue(fields.contains("rotated"));assertTrue(fields.contains("locked"));assertTrue(fields.contains("ruleVersion"));assertTrue(json.valueToTree(PlanComparisonController.difference(left,left)).path("scenarios").get(0).path("changes").isEmpty());
 }
 @Test void assignmentToUnassignedIsReportedAsStateChange()throws Exception{
  var json=new ObjectMapper();var left=json.readTree("""
   {"input":{},"result":{"scenarios":[{"objective":"MIN","containers":[{"number":1,"equipment":"40FR","assignments":[{"cargoId":"A","piece":1}]}],"unassigned":[]}]}}
   """);
  var right=left.deepCopy();var scenario=(com.fasterxml.jackson.databind.node.ObjectNode)right.path("result").path("scenarios").get(0);scenario.putArray("containers");scenario.putArray("unassigned").addObject().put("cargoId","A").put("piece",1).put("reason","review required");
  var changes=json.valueToTree(PlanComparisonController.difference(left,right)).path("scenarios").get(0).path("changes");assertEquals(1,changes.size());assertEquals("ASSIGNED",changes.get(0).path("left").path("state").asText());assertEquals("UNASSIGNED",changes.get(0).path("right").path("state").asText());assertTrue(changes.get(0).path("fields").toString().contains("state"));
 }
 @Test void missingRatesRemainUnconfirmedInExcelAndKoreanPdf()throws Exception{
  var json=new ObjectMapper();var quote=json.readTree("""
   {"status":"PRE_QUOTE","currency":"USD","mode":"AUTO","alternatives":[{"scenarioIndex":0,"objective":"MIN","status":"MISSING_RATE","equipmentQuantity":1,"unassignedPieces":2,"knownSubtotal":0,"packingFee":0,"lashingFee":0,"total":null,"lines":[{"equipmentCode":"40FR","quantity":1,"status":"MISSING_RATE","unitRate":null,"amount":null}],"warnings":["PACKING_FEE_NOT_PROVIDED","UNASSIGNED_CARGO_EXCLUDED_FROM_EQUIPMENT_COST"]},{"scenarioIndex":1,"objective":"EASY","status":"PRICED","equipmentQuantity":1,"total":100,"lines":[],"warnings":[]}]}
   """);
  var lines=QuotationExportController.lines(UUID.randomUUID(),"한국어 견적 검증","2026-10-14",quote,json.createObjectNode());byte[] excel=QuotationExportController.excel(lines);try(var wb=new XSSFWorkbook(new ByteArrayInputStream(excel))){assertEquals("PRE_QUOTE",wb.getSheetAt(0).getSheetName());assertTrue(wb.getSheetAt(0).getLastRowNum()>10);}
  byte[] pdf=PlanningPdfRenderer.report(lines,Path.of(System.getenv().getOrDefault("OOG_PDF_FONT","C:/Windows/Fonts/malgun.ttf")));try(var doc=Loader.loadPDF(pdf)){String text=new PDFTextStripper().getText(doc);assertTrue(text.contains("미확정"));assertTrue(text.contains("MISSING_RATE"));assertTrue(text.contains("대안 2"));assertTrue(text.contains("한국어 견적 검증"));assertTrue(text.contains("PRE_QUOTE"));}
  var file=Path.of("../output/pdf/quotation-qa.pdf").toAbsolutePath().normalize();Files.createDirectories(file.getParent());Files.write(file,pdf);
 }
}
