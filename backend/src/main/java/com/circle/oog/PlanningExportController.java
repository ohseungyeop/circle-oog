package com.circle.oog;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.io.ByteArrayOutputStream;
import java.util.*;

@RestController
@RequestMapping("/api/projects/{id}/plans")
public class PlanningExportController {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    public PlanningExportController(JdbcTemplate jdbc,ObjectMapper json) { this.jdbc=jdbc;this.json=json; }

    @GetMapping("/{planId}/export")
    public ResponseEntity<byte[]> export(@PathVariable UUID id,@PathVariable UUID planId) throws Exception {
        var rows=jdbc.queryForList("select s.result::text,s.input_snapshot::text,s.created_at from oog_clp_scenario s join oog_project p on p.id=s.project_id where s.project_id=? and s.id=? and p.tenant_id=?",id,planId,VerifiedActor.tenantId());
        if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"계획을 찾을 수 없습니다");
        var row=rows.getFirst();
        byte[] bytes=workbook(planId,json.readTree((String)row.get("result")),json.readTree((String)row.get("input_snapshot")),String.valueOf(row.get("created_at")));
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=oog-clp-"+planId+".xlsx")
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).body(bytes);
    }

    static byte[] workbook(UUID id,JsonNode result,JsonNode input,String createdAt) throws Exception {
        JsonNode savedResult=result;
        result=flattenScenarios(result);
        try(var wb=new XSSFWorkbook();var out=new ByteArrayOutputStream()) {
            var summary=wb.createSheet("Summary");
            String[][] meta={{"Plan",id.toString()},{"Created",createdAt},{"Status",result.path("status").asText("PRE_PLAN")},{"Objective",result.path("objective").asText()},{"Equipment count",result.path("equipmentCount").asText()},{"Unassigned pieces",""+result.path("unassigned").size()},{"Units","mm / kg; saved snapshot"},{"Approval","PRE_PLAN - engineering and carrier approval required"},{"Scenario count",result.path("scenarioCount").asText("1")},{"Algorithm",result.path("algorithm").asText()}};
            for(int i=0;i<meta.length;i++) {var r=summary.createRow(i);r.createCell(0).setCellValue(meta[i][0]);r.createCell(1).setCellValue(meta[i][1]);}
            if(savedResult.path("scenarios").isArray()) {
                summary.getRow(4).getCell(0).setCellValue("Equipment counts are alternatives");summary.getRow(4).getCell(1).setCellValue("See per-scenario summary below; do not add alternatives");
                summary.getRow(5).getCell(0).setCellValue("Unassigned counts are alternatives");summary.getRow(5).getCell(1).setCellValue("See per-scenario summary below");
                int index=0,row=meta.length+2;var header=summary.createRow(row++);String[] columns={"Scenario index","Objective","Equipment count","Unassigned pieces","Status"};
                for(int c=0;c<columns.length;c++)header.createCell(c).setCellValue(columns[c]);
                for(var scenario:savedResult.path("scenarios")) {var entry=summary.createRow(row++);entry.createCell(0).setCellValue(index++);entry.createCell(1).setCellValue(scenario.path("objective").asText());entry.createCell(2).setCellValue(scenario.path("equipmentCount").asInt());entry.createCell(3).setCellValue(scenario.path("unassigned").size());entry.createCell(4).setCellValue("PRE_PLAN");}
            }
            summary.createRow(summary.getLastRowNum()+2).createCell(0).setCellValue("Source plan: "+savedResult.path("revision").path("sourcePlanId").asText("original generated plan"));
            var assignments=wb.createSheet("Assignments");
            var assignmentRows=jsonArray();
            for(var box:result.path("containers")) for(var a:box.path("assignments")) {
                var node=a.deepCopy();if(node.isObject()) {var object=(com.fasterxml.jackson.databind.node.ObjectNode)node;object.put("container",box.path("number").asInt());object.put("equipment",box.path("equipment").asText());object.set("scenarioIndex",box.path("scenarioIndex"));object.set("objective",box.path("objective"));}assignmentRows.add(node);
            }
            table(assignments,assignmentRows);
            table(wb.createSheet("Containers"),result.path("containers"));
            table(wb.createSheet("Input Cargos"),input.path("cargos"));
            table(wb.createSheet("Equipment"),input.path("equipment"));
            table(wb.createSheet("Rules"),input.path("rules"));
            table(wb.createSheet("Unassigned"),result.path("unassigned"));
            var warnings=wb.createSheet("Warnings");warnings.createRow(0).createCell(0).setCellValue("Warning");int w=1;
            for(var warning:result.path("warnings")) warnings.createRow(w++).createCell(0).setCellValue(warning.asText());
            draw(wb,"Top",result,0,1);draw(wb,"Side",result,0,2);draw(wb,"Front",result,1,2);
            for(var sheet:wb) {sheet.createFreezePane(0,1);if(List.of("Top","Side","Front").contains(sheet.getSheetName())){for(int c=0;c<24;c++)sheet.setColumnWidth(c,1152);for(var r:sheet)r.setHeightInPoints(16);}else for(int c=0;c<Math.min(30,sheet.getRow(0).getLastCellNum());c++) sheet.setColumnWidth(c,6000);}
            wb.write(out);return out.toByteArray();
        }
    }
    private static com.fasterxml.jackson.databind.node.ArrayNode jsonArray() {return com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.arrayNode();}
    private static JsonNode flattenScenarios(JsonNode source) {
        var scenarios=source.path("scenarios");if(!scenarios.isArray())return source;
        var merged=com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode();
        merged.put("status","PRE_PLAN");merged.put("objective","ALL SAVED SCENARIOS");merged.put("scenarioCount",scenarios.size());merged.set("algorithm",source.path("algorithm"));
        var containers=jsonArray();var unassigned=jsonArray();var warnings=jsonArray();int index=0,count=0;
        for(var scenario:scenarios) {
            int scenarioIndex=index++;String objective=scenario.path("objective").asText();count+=scenario.path("equipmentCount").asInt();
            for(var box:scenario.path("containers")){var copy=(com.fasterxml.jackson.databind.node.ObjectNode)box.deepCopy();copy.put("scenarioIndex",scenarioIndex);copy.put("objective",objective);containers.add(copy);}
            for(var row:scenario.path("unassigned")){var copy=(com.fasterxml.jackson.databind.node.ObjectNode)row.deepCopy();copy.put("scenarioIndex",scenarioIndex);copy.put("objective",objective);unassigned.add(copy);}
            for(var warning:scenario.path("warnings"))warnings.add("Scenario "+scenarioIndex+" / "+objective+": "+warning.asText());
        }
        merged.put("equipmentCount",count);merged.set("containers",containers);merged.set("unassigned",unassigned);merged.set("warnings",warnings);return merged;
    }
    private static void table(Sheet sheet,JsonNode values) {
        Set<String> keys=new LinkedHashSet<>();for(var value:values) value.fieldNames().forEachRemaining(keys::add);
        var h=sheet.createRow(0);int col=0;for(var key:keys) h.createCell(col++).setCellValue(key);
        if(keys.isEmpty()) h.createCell(0).setCellValue("No rows");
        int row=1;for(var value:values) {var r=sheet.createRow(row++);col=0;for(var key:keys) {var cell=r.createCell(col++);var v=value.path(key);if(v.isNumber())cell.setCellValue(v.asDouble());else if(v.isBoolean())cell.setCellValue(v.asBoolean());else {String text=v.isMissingNode()||v.isNull()?"":v.isTextual()?v.asText():v.toString();if(key.equals("assignments"))text="See Assignments sheet";cell.setCellValue(text.length()>32767?text.substring(0,32740)+" [truncated]":text);}}}
    }
    private static void draw(XSSFWorkbook wb,String name,JsonNode result,int horizontal,int vertical) {
        var s=wb.createSheet(name);s.createRow(0).createCell(0).setCellValue(name+" schematic: 24 x 8 grid; colors identify cargo; labels item #piece; exact mm coordinates in Assignments");
        CellStyle[] styles=new CellStyle[8];for(int i=0;i<8;i++){styles[i]=wb.createCellStyle();styles[i].setFillForegroundColor((short)(40+i));styles[i].setFillPattern(FillPatternType.SOLID_FOREGROUND);}
        String[] dims={"length","width","height"},pos={"x","y","z"};int base=2;
        for(var box:result.path("containers")) {
            s.createRow(base++).createCell(0).setCellValue("Scenario "+box.path("scenarioIndex").asText("0")+" / "+box.path("objective").asText()+" / Container "+box.path("number").asText()+" "+box.path("equipment").asText()+" / PRE_PLAN");
            double maxX=Math.max(1,box.path(dims[horizontal]).asDouble()),maxY=Math.max(1,box.path(dims[vertical]).asDouble());
            double minX=0,minY=0;
            for(var a:box.path("assignments")) {minX=Math.min(minX,a.path(pos[horizontal]).asDouble());minY=Math.min(minY,a.path(pos[vertical]).asDouble());maxX=Math.max(maxX,a.path(pos[horizontal]).asDouble()+a.path(dims[horizontal]).asDouble());maxY=Math.max(maxY,a.path(pos[vertical]).asDouble()+a.path(dims[vertical]).asDouble());}
            for(int y=0;y<8;y++) s.createRow(base+y);
            int index=0;
            for(var a:box.path("assignments")) {
                var style=styles[index++%8];
                int x1=(int)Math.floor((a.path(pos[horizontal]).asDouble()-minX)/(maxX-minX)*24),y1=(int)Math.floor((a.path(pos[vertical]).asDouble()-minY)/(maxY-minY)*8);
                int x2=(int)Math.ceil((a.path(pos[horizontal]).asDouble()+a.path(dims[horizontal]).asDouble()-minX)/(maxX-minX)*24),y2=(int)Math.ceil((a.path(pos[vertical]).asDouble()+a.path(dims[vertical]).asDouble()-minY)/(maxY-minY)*8);
                for(int y=Math.max(0,y1);y<Math.min(8,Math.max(y1+1,y2));y++) for(int x=Math.max(0,x1);x<Math.min(24,Math.max(x1+1,x2));x++) {var cell=s.getRow(base+y).getCell(x,Row.MissingCellPolicy.CREATE_NULL_AS_BLANK);cell.setCellStyle(style);if(x==x1&&y==y1)cell.setCellValue(a.path("itemNo").asText()+" #"+a.path("piece").asText());}
            }
            base+=10;
        }
    }
}
