package com.circle.oog;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.io.ByteArrayInputStream;
import java.nio.file.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PlanningHistoryTest {
    @org.junit.jupiter.api.BeforeEach void authenticate(){CoreAuthorizationInterceptorTest.authenticate();}
    @org.junit.jupiter.api.AfterEach void cleanup(){org.springframework.security.core.context.SecurityContextHolder.clearContext();}
    @TempDir Path temp;
    @Test void workbookUsesSavedRulesAndKeepsUnassignedAndDiagrams() throws Exception {
        var json=new ObjectMapper();
        var result=json.readTree("""
            {"status":"PRE_PLAN","objective":"MIN_EQUIPMENT","equipmentCount":1,"containers":[{"number":1,"equipment":"40FR","length":12000,"width":2400,"height":2200,"assignments":[{"itemNo":"=SUM(1,2)","piece":1,"x":0,"y":-100,"z":0,"length":3000,"width":2600,"height":2000}]}],"unassigned":[{"itemNo":"TOO-LARGE","piece":2,"reason":"Engineering required"}],"warnings":["No engineering approval"]}
            """);
        var input=json.readTree("""
            {"cargos":[{"itemNo":"=SUM(1,2)"}],"equipment":[],"rules":[{"equipmentCode":"40FR","version":7}]}
            """);
        var wrapper=json.createObjectNode();wrapper.put("algorithm","TEST-HEURISTIC");var scenarios=wrapper.putArray("scenarios");scenarios.add(result);var second=result.deepCopy();((com.fasterxml.jackson.databind.node.ObjectNode)second).put("objective","ONE_CARGO_PER_EQUIPMENT");scenarios.add(second);
        try(var wb=new XSSFWorkbook(new ByteArrayInputStream(PlanningExportController.workbook(UUID.randomUUID(),wrapper,input,"2026-10-13")))) {
            assertEquals("PRE_PLAN",wb.getSheet("Summary").getRow(2).getCell(1).getStringCellValue());
            assertEquals(7,wb.getSheet("Rules").getRow(1).getCell(1).getNumericCellValue());
            assertEquals("TOO-LARGE",wb.getSheet("Unassigned").getRow(1).getCell(0).getStringCellValue());
            assertEquals(org.apache.poi.ss.usermodel.CellType.STRING,wb.getSheet("Assignments").getRow(1).getCell(0).getCellType());
            assertEquals(2,wb.getSheet("Assignments").getLastRowNum());assertEquals(2,wb.getSheet("Unassigned").getLastRowNum());
            assertEquals("2",wb.getSheet("Summary").getRow(8).getCell(1).getStringCellValue());
            for(String name:List.of("Top","Side","Front")) {
                var sheet=wb.getSheet(name);assertTrue(sheet.getLastRowNum()>15);
                assertEquals(1152,sheet.getColumnWidth(0));assertEquals(16,sheet.getRow(3).getHeightInPoints());
                long filled=0;for(var row:sheet)for(var cell:row)if(cell.getCellStyle().getFillPattern()==org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND)filled++;
                assertTrue(filled>1,name+" must contain filled cargo regions for both scenarios");
                assertTrue(sheet.getRow(13).getCell(0).getStringCellValue().contains("Scenario 1"));
            }
        }
    }
    @Test void originalPathRejectsTraversalAndMissingFile() throws Exception {
        Files.writeString(temp.resolve("source.xlsx"),"test");
        assertEquals(temp.resolve("source.xlsx"),HistoryController.safeOriginal(temp,"source.xlsx"));
        assertThrows(ResponseStatusException.class,()->HistoryController.safeOriginal(temp,"../source.xlsx"));
        assertThrows(ResponseStatusException.class,()->HistoryController.safeOriginal(temp,"missing.xlsx"));
        assertThrows(ResponseStatusException.class,()->HistoryController.safeOriginal(temp,temp.resolve("source.xlsx").toString()));
    }
    @Test void foreignProjectPlanDoesNotExport() {
        var jdbc=mock(JdbcTemplate.class);var id=UUID.randomUUID();var plan=UUID.randomUUID();
        when(jdbc.queryForList(anyString(),eq(id),eq(plan),eq(2L))).thenReturn(List.of());
        assertThrows(ResponseStatusException.class,()->new PlanningExportController(jdbc,new ObjectMapper()).export(id,plan));
        verify(jdbc).queryForList(contains("p.tenant_id=?"),eq(id),eq(plan),eq(2L));
    }
    @Test void historyLimitsValidatedBeforeDatabaseRead() {
        var jdbc=mock(JdbcTemplate.class);var controller=new HistoryController(jdbc,new ObjectMapper(),temp.toString());
        assertThrows(ResponseStatusException.class,()->controller.history(UUID.randomUUID(),0,20,101));
        assertThrows(ResponseStatusException.class,()->controller.history(UUID.randomUUID(),-1,20,null));
        verifyNoInteractions(jdbc);
    }
    @Test void originalLookupIsScopedToProjectAndUpload() {
        var jdbc=mock(JdbcTemplate.class);var id=UUID.randomUUID();var upload=UUID.randomUUID();
        when(jdbc.queryForList(anyString(),eq(id),eq(upload),eq(2L))).thenReturn(List.of());
        var controller=new HistoryController(jdbc,new ObjectMapper(),temp.toString());
        assertThrows(ResponseStatusException.class,()->controller.original(id,upload));
        verify(jdbc).queryForList(contains("p.tenant_id=?"),eq(id),eq(upload),eq(2L));
    }
    @Test void historyReturnsStructuredJsonInsteadOfDatabaseJsonStrings() {
        var jdbc=mock(JdbcTemplate.class);var id=UUID.randomUUID();
        when(jdbc.queryForObject(anyString(),eq(Long.class),eq(id),eq(2L))).thenReturn(1L);
        Map<String,Object> audit=new HashMap<>(Map.of("detail","{\"count\":3}"));
        Map<String,Object> upload=new HashMap<>(Map.of("mapping","{\"columns\":{\"itemNo\":0}}"));
        Map<String,Object> plan=new HashMap<>(Map.of("result","{\"status\":\"PRE_PLAN\"}","inputSnapshot","{\"rules\":[]}"));
        when(jdbc.queryForList(contains("core_audit_history"),eq(id),eq(2L),eq(50),eq(0L))).thenReturn(List.of(audit));
        when(jdbc.queryForList(contains("oog_packing_list"),eq(id),eq(50),eq(0L))).thenReturn(List.of(upload));
        when(jdbc.queryForList(contains("oog_clp_scenario"),eq(id),eq(50),eq(0L))).thenReturn(List.of(plan));
        var output=(Map<?,?>)new HistoryController(jdbc,new ObjectMapper(),temp.toString()).history(id,0,20,50);
        assertEquals(50,output.get("size"));
        assertEquals(3,((com.fasterxml.jackson.databind.JsonNode)audit.get("detail")).path("count").asInt());
        assertTrue(upload.get("mapping") instanceof com.fasterxml.jackson.databind.JsonNode);
        assertEquals("PRE_PLAN",((com.fasterxml.jackson.databind.JsonNode)plan.get("result")).path("status").asText());
    }
}
