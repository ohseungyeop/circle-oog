package com.circle.oog;
import com.fasterxml.jackson.databind.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.nio.file.Path;
import java.io.ByteArrayOutputStream;
import java.util.*;
@RestController @RequestMapping("/api/projects/{id}/quotations")
public class QuotationExportController {
 private final JdbcTemplate jdbc;private final ObjectMapper json;private final Path font;
 public QuotationExportController(JdbcTemplate jdbc,ObjectMapper json,@Value("${oog.pdf-font:${OOG_PDF_FONT:C:/Windows/Fonts/malgun.ttf}}")String font){this.jdbc=jdbc;this.json=json;this.font=Path.of(font);}
 private List<String> load(UUID project,UUID quote)throws Exception {var rows=jdbc.queryForList("select q.result::text,q.input_snapshot::text,q.created_at,p.name from oog_quotation q join oog_project p on p.id=q.project_id and p.tenant_id=q.tenant_id where q.project_id=? and q.id=? and q.tenant_id=?",project,quote,VerifiedActor.tenantId());if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND);var row=rows.getFirst();return lines(quote,row.get("name").toString(),row.get("created_at").toString(),json.readTree(row.get("result").toString()),json.readTree(row.get("input_snapshot").toString()));}
 @GetMapping("/{quoteId}/export")public ResponseEntity<byte[]> excel(@PathVariable UUID id,@PathVariable UUID quoteId)throws Exception{return download(quoteId,"xlsx",excel(load(id,quoteId)));}
 @GetMapping("/{quoteId}/export/pdf")public ResponseEntity<byte[]> pdf(@PathVariable UUID id,@PathVariable UUID quoteId)throws Exception{return download(quoteId,"pdf",PlanningPdfRenderer.report(load(id,quoteId),font));}
 private ResponseEntity<byte[]> download(UUID id,String ext,byte[] bytes){return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=oog-quotation-"+id+"."+ext).contentType(MediaType.parseMediaType(ext.equals("pdf")?"application/pdf":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).body(bytes);}
 static List<String> lines(UUID id,String project,String created,JsonNode quote,JsonNode input){var lines=new ArrayList<String>();lines.add("CIRCLE OOG | 사전 견적서 PRE_QUOTE");lines.add("프로젝트: "+project+" | 견적 ID: "+id);lines.add("저장 일시: "+created+" | 통화: "+quote.path("currency").asText()+" | 계산: "+quote.path("mode").asText());lines.add("공학 및 선사 승인 미완료. 대안 금액을 서로 더하지 않습니다. 세금, 운임, 미배정 화물 작업비는 제외됩니다.");lines.add("요청 / 단가 적용일 / 근거: "+input.path("request")+" / "+input.path("rateDate").asText());
  for(var alt:quote.path("alternatives")){lines.add("대안 "+(alt.path("scenarioIndex").asInt()+1)+" | "+alt.path("objective").asText()+" | "+alt.path("status").asText());lines.add("장비 "+alt.path("equipmentQuantity").asText()+"대 | 미배정 "+alt.path("unassignedPieces").asText()+"개");for(var row:alt.path("lines"))lines.add("장비 "+row.path("equipmentCode").asText()+" | "+row.path("quantity").asText()+"대 | 단가 "+value(row,"unitRate")+" | 금액 "+value(row,"amount")+" "+quote.path("currency").asText()+" | "+row.path("status").asText()+" | 근거 "+row.path("source").asText()+" / 버전 "+row.path("rateVersion").asText()+" / "+row.path("reason").asText());lines.add("확인된 장비비 "+value(alt,"knownSubtotal")+" | 포장비 "+fee(alt,"packingFee","PACKING_FEE_NOT_PROVIDED")+" | 라싱비 "+fee(alt,"lashingFee","LASHING_FEE_NOT_PROVIDED")+" | 합계 (입력 비용만) "+value(alt,"total"));for(var warning:alt.path("warnings"))lines.add("경고: "+warning.asText());}
  for(var note:quote.path("notes"))lines.add("안내: "+note.asText());lines.add("저장 단가 근거 (현재 단가 재계산 없음)");for(var rate:input.path("rates"))lines.add(rate.toString());return lines;
 }
 private static String fee(JsonNode alt,String key,String warning){for(var w:alt.path("warnings"))if(warning.equals(w.asText()))return "미확인 (합산 미포함)";return value(alt,key);}
 private static String value(JsonNode node,String key){return node.path(key).isNull()||node.path(key).isMissingNode()?"미확정":node.path(key).asText();}
 static byte[] excel(List<String> lines)throws Exception{try(var wb=new XSSFWorkbook();var out=new ByteArrayOutputStream()){var s=wb.createSheet("PRE_QUOTE");int n=0;for(var line:lines){int offset=0;do{int end=Math.min(line.length(),offset+110);s.createRow(n++).createCell(0).setCellValue(line.substring(offset,end));offset=end;}while(offset<line.length());}s.setColumnWidth(0,30000);var style=wb.createCellStyle();style.setWrapText(true);for(var row:s){row.getCell(0).setCellStyle(style);row.setHeightInPoints(Math.max(20,(float)Math.ceil(row.getCell(0).getStringCellValue().length()/80d)*15));}wb.write(out);return out.toByteArray();}}
}



