package com.circle.oog;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

class ImportMappingServiceTest {
    final ImportMappingService service=new ImportMappingService();
    final ObjectMapper json=new ObjectMapper();
    final String columns="{\"itemNo\":0,\"quantity\":1,\"length\":2,\"width\":3,\"height\":4,\"grossWeight\":5,\"netWeight\":6,\"originalLength\":7,\"originalWidth\":8,\"originalHeight\":9}";

    @Test void mergedCustomerHeadersSeparateBareItemAndBoxDimensions() throws Exception {
        try(var wb=new XSSFWorkbook()) {
            var s=wb.createSheet();var top=s.createRow(0);var bottom=s.createRow(1);
            String[] first={"No\n번호","Item Name\n품목","Package Dimension(㎜)","","","Q'ty\n수량","Net Weight\n중량(㎏)","Box Dimension(㎜)","","","Gross Weight\n중량(㎏)"};
            String[] second={"","","Length\n길이","Width\n폭","Height\n높이","","G/W","Length","Width","Height","G/W"};
            for(int i=0;i<first.length;i++){top.createCell(i).setCellValue(first[i]);bottom.createCell(i).setCellValue(second[i]);}
            s.addMergedRegion(new CellRangeAddress(0,0,2,4));s.addMergedRegion(new CellRangeAddress(0,0,7,9));
            var result=service.suggest(s,0,2);
            assertThat((Map<String,Integer>)result.get("suggestedMapping")).containsEntry("itemNo",0).containsEntry("originalLength",2).containsEntry("originalWidth",3).containsEntry("originalHeight",4).containsEntry("length",7).containsEntry("width",8).containsEntry("height",9).containsEntry("netWeight",6).containsEntry("grossWeight",10);
        }
    }
    @Test void ambiguousDimensionColumnsAreNotSilentlySelected() throws Exception {
        try(var wb=new XSSFWorkbook()){var s=wb.createSheet();var r=s.createRow(0);r.createCell(0).setCellValue("Length");r.createCell(1).setCellValue("Length");
            var result=service.suggest(s,0,1);assertThat(((Map<?,?>)result.get("suggestedMapping")).containsKey("length")).isFalse();assertThat((List<?>)result.get("suggestionsWarnings")).hasSize(2);}
    }
    @Test void rowTotalAndUnitsPreserveWeightTotalsAndOriginalDimensions() throws Exception {
        try(var wb=new XSSFWorkbook()){var row=wb.createSheet().createRow(0);String[] v={"CASE-1","4","2","1","1.5","8","6","1.8","0.8","1.2"};for(int i=0;i<v.length;i++)row.createCell(i).setCellValue(v[i]);
            var c=service.read(row,json.readTree(columns),1000,1000,"ROW_TOTAL",UUID.randomUUID());
            assertThat(c.quantity).isEqualTo(4);assertThat(c.length).isEqualTo(2000);assertThat(c.originalLength).isEqualTo(1800);assertThat(c.grossWeight).isEqualTo(2000);assertThat(c.grossWeight*c.quantity).isEqualTo(8000);assertThat(c.netWeight*c.quantity).isEqualTo(6000);
            assertThat(service.read(row,json.readTree(columns),1000,1000,"PER_PIECE",UUID.randomUUID()).grossWeight).isEqualTo(8000);
            var missingQuantity=(com.fasterxml.jackson.databind.node.ObjectNode)json.readTree(columns);missingQuantity.remove("quantity");
            assertThatThrownBy(()->service.read(row,missingQuantity,1000,1000,"ROW_TOTAL",UUID.randomUUID())).hasMessageContaining("필수 컬럼 매핑 누락: quantity");}
    }
    @Test void rejectsMissingNonFiniteAndOverflowingQuantityBeforeDivision() throws Exception {
        try(var wb=new XSSFWorkbook()){var row=wb.createSheet().createRow(0);String[] v={"CASE-1","4","2","1","1.5","8","6","1.8","0.8","1.2"};for(int i=0;i<v.length;i++)row.createCell(i).setCellValue(v[i]);var map=json.readTree(columns);
            for(String invalid:List.of("","0","-1","1.5","10001","4294967297","NaN","Infinity")){row.getCell(1).setCellValue(invalid);assertThatThrownBy(()->service.read(row,map,1,1,"ROW_TOTAL",UUID.randomUUID())).isInstanceOf(IllegalArgumentException.class);}
            row.getCell(1).setCellValue("4");row.getCell(2).setCellValue("");assertThatThrownBy(()->service.read(row,map,1,1,"PER_PIECE",UUID.randomUUID())).hasMessageContaining("필수 값 누락");
            row.getCell(2).setCellValue("2");row.getCell(6).setCellValue("NaN");assertThatThrownBy(()->service.read(row,map,1,1,"PER_PIECE",UUID.randomUUID())).hasMessageContaining("숫자 오류");}
    }
    @Test void partialOriginalDimensionsAndMalformedMappingAreRejected() throws Exception {
        try(var wb=new XSSFWorkbook()){var row=wb.createSheet().createRow(0);String[] v={"CASE-1","1","2","1","1.5","8","6","1.8","",""};for(int i=0;i<v.length;i++)row.createCell(i).setCellValue(v[i]);
            assertThatThrownBy(()->service.read(row,json.readTree(columns),1,1,"PER_PIECE",UUID.randomUUID())).hasMessageContaining("모두 입력");
            assertThatThrownBy(()->service.column(json.readTree("{\"length\":\"2\"}"),"length",true)).hasMessageContaining("매핑 오류");}
    }
    @Test void overlongDescriptionInvalidBasisAndHeaderRangeFailClearly() throws Exception {
        try(var wb=new XSSFWorkbook()){var s=wb.createSheet();var row=s.createRow(0);String[] v={"CASE-1","1","2","1","1.5","8","6","0","0","0"};for(int i=0;i<v.length;i++)row.createCell(i).setCellValue(v[i]);
            row.createCell(10).setCellValue("a".repeat(501));var map=json.readTree(columns);((com.fasterxml.jackson.databind.node.ObjectNode)map).put("description",10);
            assertThatThrownBy(()->service.read(row,map,1,1,"PER_PIECE",UUID.randomUUID())).hasMessageContaining("500자");
            assertThatThrownBy(()->service.read(row,map,1,1,"UNKNOWN",UUID.randomUUID())).hasMessageContaining("중량 기준");
            assertThatThrownBy(()->service.suggest(s,0,2)).hasMessageContaining("헤더 행");}
    }
}
