package com.circle.oog;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
class QuotationServiceTest {
    final ObjectMapper json=new ObjectMapper();
    QuotationService.QuoteInput quote(String currency,String mode,Map<String,BigDecimal> overrides){return new QuotationService.QuoteInput(UUID.randomUUID(),currency,null,mode,overrides,new BigDecimal("1.10"),new BigDecimal("2.20"),"사용자 단가/작업료 확인");}
    @Test void automaticPackingUsesCompanyRulePerPieceAndPreservesOriginalQuantity() throws Exception {
        var cargo=json.readTree("{\"quantity\":3,\"original_length\":1000,\"original_width\":500,\"original_height\":400,\"net_weight\":100}");
        var rule=json.readTree("{\"id\":\"r1\",\"version\":2,\"weight_basis\":\"NET_WEIGHT\",\"allowance_length_mm\":100,\"allowance_width_mm\":20,\"allowance_height_mm\":30,\"tare_weight_kg\":10}");
        var result=QuotationService.packing(cargo,rule,new QuotationService.EstimateInput(UUID.randomUUID(),"CRATE",null,null,null));
        assertThat(result).containsEntry("status","PRE_PACK").containsEntry("mode","AUTO").containsEntry("length",new BigDecimal("1100")).containsEntry("grossWeight",new BigDecimal("110")).containsEntry("totalGrossWeight",new BigDecimal("330")).containsEntry("ruleVersion",2L);
        assertThat(cargo.path("original_length").asInt()).isEqualTo(1000);
    }
    @Test void missingPackingConfigurationAndOriginalDimensionsStayExplicit() throws Exception {
        var cargo=json.readTree("{\"quantity\":1}");var input=new QuotationService.EstimateInput(UUID.randomUUID(),"CRATE",null,null,null);
        assertThat(QuotationService.packing(cargo,json.nullNode(),input)).containsEntry("status","MISSING_PACKING_RULE");
        assertThat(QuotationService.packing(cargo,json.readTree("{\"weight_basis\":\"NET_WEIGHT\"}"),input)).containsEntry("status","MISSING_ORIGINAL_DIMENSIONS");
    }
    @Test void manualPackingRequiresReasonAndRejectsGrossBelowNet() throws Exception {
        var cargo=json.readTree("{\"quantity\":1,\"net_weight\":100}");var dims=new QuotationService.ManualPacking(BigDecimal.TEN,BigDecimal.TEN,BigDecimal.TEN,BigDecimal.TEN);
        assertThatThrownBy(()->QuotationService.packing(cargo,json.nullNode(),new QuotationService.EstimateInput(UUID.randomUUID(),"CRATE","MANUAL",dims,null))).hasMessageContaining("근거");
        assertThatThrownBy(()->QuotationService.packing(cargo,json.nullNode(),new QuotationService.EstimateInput(UUID.randomUUID(),"CRATE","MANUAL",dims,"manual"))).hasMessageContaining("순중량");
    }
    @Test void alternativesUseActualContainersAndDecimalArithmeticWithoutAddingScenarios() throws Exception {
        var plan=json.readTree("{\"scenarios\":[{\"objective\":\"A\",\"containers\":[{\"equipment\":\"40FR\"},{\"equipment\":\"40FR\"}],\"unassigned\":[]},{\"objective\":\"B\",\"containers\":[{\"equipment\":\"40FR\"}],\"unassigned\":[]}]}");
        var rate=json.readTree("{\"id\":\"r1\",\"equipment_code\":\"40FR\",\"currency\":\"USD\",\"unit_rate\":0.10,\"version\":3}");var result=QuotationService.quotation(plan,List.of(rate),quote("USD",null,null));
        var a=(List<Map<String,Object>>)result.get("alternatives");assertThat(a.get(0)).containsEntry("equipmentQuantity",2).containsEntry("total",new BigDecimal("3.50"));assertThat(a.get(1)).containsEntry("total",new BigDecimal("3.40"));assertThat(result).containsEntry("status","PRE_QUOTE").containsEntry("engineeringApproved",false);
    }
    @Test void missingRateNeverProducesInventedTotalAndUnassignedIsExplicit() throws Exception {
        var plan=json.readTree("{\"containers\":[{\"equipment\":\"40FR\"}],\"unassigned\":[{\"itemNo\":\"X\"}]}");var result=QuotationService.quotation(plan,List.of(),quote("USD",null,null));var a=((List<Map<String,Object>>)result.get("alternatives")).getFirst();
        assertThat(a).containsEntry("status","MISSING_RATE").containsEntry("total",null).containsEntry("unassignedPieces",1);assertThat((List<String>)a.get("warnings")).contains("MISSING_RATE: 40FR","UNASSIGNED_CARGO_EXCLUDED_FROM_EQUIPMENT_COST");
    }
    @Test void mixedCurrencyAndAutomaticOverrideAreRejected() throws Exception {
        var plan=json.readTree("{\"containers\":[{\"equipment\":\"40FR\"}],\"unassigned\":[]}");var rate=json.readTree("{\"equipment_code\":\"40FR\",\"currency\":\"KRW\",\"unit_rate\":100}");
        assertThatThrownBy(()->QuotationService.quotation(plan,List.of(rate),quote("USD",null,null))).hasMessageContaining("통화");assertThatThrownBy(()->QuotationService.quotation(plan,List.of(),quote("USD","AUTO",Map.of("40FR",BigDecimal.TEN)))).hasMessageContaining("수동 모드");
        var manual=QuotationService.quotation(plan,List.of(),quote("USD","MANUAL",Map.of("40FR",BigDecimal.TEN)));assertThat(((List<Map<String,Object>>)manual.get("alternatives")).getFirst()).containsEntry("total",new BigDecimal("13.30"));
    }
}
