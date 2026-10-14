package com.circle.oog;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
class CarrierRuleServiceTest {
    final LocalDate date=LocalDate.of(2026,10,13);
    PlanningRule rule(String code,String carrier,long version){var r=new PlanningRule();r.equipmentCode=code;r.carrier=carrier;r.version=version;r.usableLengthRatio=.94;r.planningWeightRatio=.9;return r;}
    Equipment equipment(String code){var e=new Equipment();e.code=code;return e;}
    CarrierRuleService.Input input(LocalDate until,double ratio){return new CarrierRuleService.Input("MSC","40HC",date,until,ratio,.9,0,0,"검증된 계약");}
    @Test void validatesEffectivePeriodAndFiniteNumericRules(){
        assertThatCode(()->CarrierRuleService.validate(input(date,.94))).doesNotThrowAnyException();
        assertThatThrownBy(()->CarrierRuleService.validate(input(date.minusDays(1),.94))).isInstanceOf(ResponseStatusException.class);
        for(double n:List.of(Double.NaN,Double.POSITIVE_INFINITY,.09,1.01))assertThatThrownBy(()->CarrierRuleService.validate(input(null,n))).isInstanceOf(ResponseStatusException.class);
    }
    @Test void selectedImmutableVersionIsPreservedAndFallbackIsExplicit(){var chosen=rule("40HC","MSC",3);var defaults=List.of(rule("40HC","DEFAULT",0),rule("40FR","DEFAULT",5));
        var result=CarrierRuleService.assemble("MSC",date,true,List.of(equipment("40HC"),equipment("40FR")),defaults,List.of(new CarrierRuleService.Matched(chosen,Map.of("id","immutable-id"))));
        assertThat(result.rules()).containsExactly(chosen,defaults.get(1));
        var versions=(List<Map<String,Object>>)result.ruleSelection().get("versions");
        assertThat(versions.get(0)).containsEntry("version",3L).containsEntry("id","immutable-id").containsEntry("usedFallback",false);
        assertThat(versions.get(1)).containsEntry("version",5L).containsEntry("source","DEFAULT").containsEntry("usedFallback",true);
        assertThat(result.ruleSelection()).containsEntry("effectiveDate","2026-10-13");
    }
    @Test void strictSelectionRejectsMissingEquipmentRule(){assertThatThrownBy(()->CarrierRuleService.assemble("MSC",date,false,List.of(equipment("40HC")),List.of(rule("40HC","DEFAULT",0)),List.of())).isInstanceOf(ResponseStatusException.class).hasMessageContaining("규칙 없음");}
    @Test void defaultRequestRemainsCompatibleAndMissingDefaultFails(){
        assertThat(CarrierRuleService.assemble("DEFAULT",date,false,List.of(equipment("40HC")),List.of(rule("40HC","DEFAULT",0)),List.of()).rules()).hasSize(1);
        assertThatThrownBy(()->CarrierRuleService.assemble("DEFAULT",date,true,List.of(equipment("40HC")),List.of(),List.of())).hasMessageContaining("DEFAULT 규칙 없음");
    }
    @Test void ambiguousEffectiveVersionsAreNeverSilentlyChosen(){var match=new CarrierRuleService.Matched(rule("40HC","MSC",1),Map.of());assertThatThrownBy(()->CarrierRuleService.assemble("MSC",date,true,List.of(equipment("40HC")),List.of(),List.of(match,match))).hasMessageContaining("기간 중복");}
}
