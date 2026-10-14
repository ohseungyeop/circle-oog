package com.circle.oog;

import org.junit.jupiter.api.Test;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;

class AnalysisServiceTest {
    @Test void rotatesWideCargoWhenLengthAlreadyFits() {
        var c=new Cargo();c.length=2000;c.width=6000;c.height=1000;c.grossWeight=1000;c.quantity=1;c.rotationAllowed=true;
        assertThat(new AnalysisService().analyze(c,List.of(equipment("40HC",false)),List.of(rule("40HC"))).recommended()).isEqualTo("40HC");
    }
    @Test void recommendsAdditionalRegisteredOpenTop() {
        var c=new Cargo();c.length=2000;c.width=2000;c.height=3500;c.grossWeight=1000;c.quantity=1;
        var ot=equipment("20OT",true);var r=rule("20OT");r.maxOverHeight=1500;
        assertThat(new AnalysisService().analyze(c,List.of(equipment("40HC",false),ot),List.of(rule("40HC"),r)).recommended()).isEqualTo("20OT");
    }
    Equipment equipment(String code, boolean open) {
        var e=new Equipment();e.code=code;e.length=12000;e.width=2400;e.height=2700;
        e.payload=40000;e.openWidth=open;e.openHeight=open;return e;
    }
    PlanningRule rule(String code) {
        var r=new PlanningRule();r.equipmentCode=code;r.usableLengthRatio=.94;r.planningWeightRatio=.9;
        r.maxOverWidth=code.equals("40FR")?1600:0;r.maxOverHeight=code.equals("40FR")?1800:0;return r;
    }
    @Test void boundariesAndReasons() {
        var c=new Cargo();c.length=11280;c.width=2400;c.height=2700;c.grossWeight=36000;c.quantity=2;
        var service=new AnalysisService();var eq=List.of(equipment("40HC",false),equipment("40FR",true));var rules=List.of(rule("40HC"),rule("40FR"));
        var exact=service.analyze(c,eq,rules);assertThat(exact.classification()).containsExactly("NORMAL");
        assertThat(exact.cbm()).isEqualTo(146.1888);
        c.width=2401;var over=service.analyze(c,eq,rules);
        assertThat(over.classification()).containsExactly("OW");assertThat(over.recommended()).isEqualTo("40FR");
        assertThat(over.candidates().get(0).reasons()).contains("폭 1mm 초과");
        c.grossWeight=36001;assertThat(service.analyze(c,eq,rules).recommended()).isEqualTo("ENGINEERING_REVIEW");
    }
}
