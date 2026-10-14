package com.circle.oog;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class CarrierRuleExportTest {
    @BeforeEach void authenticate(){CoreAuthorizationInterceptorTest.authenticate();}
    @AfterEach void cleanup(){org.springframework.security.core.context.SecurityContextHolder.clearContext();}
    @Test void analysisExcelUsesSelectedCarrierRatherThanDefaultAndPreservesOriginalHeader() throws Exception {
        var projects=mock(Projects.class);var cargos=mock(Cargos.class);var equipment=mock(Equipments.class);var rules=mock(Rules.class);var jdbc=mock(JdbcTemplate.class);var json=new ObjectMapper();var date=LocalDate.of(2026,10,14);var id=UUID.randomUUID();var project=new Project();project.id=id;project.tenantId=2;
        when(projects.findByIdAndTenantId(id,2L)).thenReturn(Optional.of(project));
        var cargo=new Cargo();cargo.itemNo="CASE-1";cargo.length=9000;cargo.width=1000;cargo.height=1000;cargo.grossWeight=100;
        var eq=new Equipment();eq.code="40HC";eq.length=10000;eq.width=2000;eq.height=3000;eq.payload=10000;
        var standard=new PlanningRule();standard.equipmentCode="40HC";standard.usableLengthRatio=.94;standard.planningWeightRatio=.9;
        var selected=new PlanningRule();selected.equipmentCode="40HC";selected.carrier="MSC";selected.usableLengthRatio=.5;selected.planningWeightRatio=.9;selected.version=3;
        when(cargos.findByProjectIdOrderByItemNo(id)).thenReturn(List.of(cargo));when(equipment.findAll()).thenReturn(List.of(eq));when(rules.findAll()).thenReturn(List.of(standard));
        when(jdbc.query(anyString(),any(RowMapper.class),eq(2L),eq("MSC"),eq(date),eq(date))).thenReturn(List.of(new CarrierRuleService.Matched(selected,Map.of("id","saved-rule-id"))));
        var controller=new OogController(projects,cargos,equipment,rules,new AnalysisService(),jdbc,json,".","http://127.0.0.1:1");
        try(var wb=new XSSFWorkbook(new ByteArrayInputStream(controller.export(id,"MSC",date,true).getBody()))){
            assertThat(wb.getSheet("OOG Analysis").getLastRowNum()).isEqualTo(1);assertThat(wb.getSheet("OOG Analysis").getRow(0).getLastCellNum()).isEqualTo((short)11);
            assertThat(wb.getSheet("OOG Analysis").getRow(1).getCell(8).getStringCellValue()).isEqualTo("OL");
            assertThat(wb.getSheet("Rule Selection").getRow(0).getCell(1).getStringCellValue()).isEqualTo("MSC");
            assertThat(wb.getSheet("Rule Selection").getRow(4).getCell(2).getStringCellValue()).isEqualTo("3");
        }
    }
    @Test void clpSummaryPreservesSavedSelectionAndExactlyElevenSheets() throws Exception {
        var json=new ObjectMapper();var result=json.readTree("{\"containers\":[],\"unassigned\":[]}");var input=json.readTree("""
            {"ruleSelection":{"carrier":"MSC","effectiveDate":"2026-10-14","fallbackPolicy":"DEFAULT_FALLBACK","versions":[{"equipmentCode":"40FR","carrier":"DEFAULT","version":7,"source":"DEFAULT","usedFallback":true}]}}
            """);
        try(var wb=new XSSFWorkbook(new ByteArrayInputStream(PlanningExportController.workbook(UUID.randomUUID(),result,input,"2026-10-14")))){
            assertThat(wb.getNumberOfSheets()).isEqualTo(11);var sheet=wb.getSheet("Summary");var values=new ArrayList<String>();for(var row:sheet)for(var cell:row)values.add(cell.toString());
            assertThat(values).contains("MSC","2026-10-14","DEFAULT_FALLBACK","usedFallback","true","7");
        }
    }
}
