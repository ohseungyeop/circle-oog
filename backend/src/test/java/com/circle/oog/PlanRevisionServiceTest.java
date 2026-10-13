package com.circle.oog;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.assertj.core.api.Assertions.*;

class PlanRevisionServiceTest {
    final ObjectMapper json=new ObjectMapper();
    final PlanRevisionService service=new PlanRevisionService(null,json);
    JsonNode snapshot() throws Exception {return json.readTree("""
      {"cargos":[{"id":"a","quantity":2,"length":1000,"width":1000,"height":1000,"grossWeight":1000,"rotationAllowed":false}],
      "equipment":[{"code":"HC","length":5000,"width":2000,"height":2000,"payload":3000,"openWidth":false,"openHeight":false}],
      "rules":[{"equipmentCode":"HC","usableLengthRatio":1,"planningWeightRatio":1,"maxOverWidth":0,"maxOverHeight":0}]}
      """);}
    JsonNode source() throws Exception {var s=json.readTree("""
      {"scenarios":[{"containers":[{"number":1,"equipment":"HC","assignments":[
      {"cargoId":"a","piece":1,"x":0,"y":0,"z":0,"length":1000,"width":1000,"locked":false},
      {"cargoId":"a","piece":2,"x":1000,"y":0,"z":0,"length":1000,"width":1000,"locked":false}]}],"unassigned":[]}]}
      """);((com.fasterxml.jackson.databind.node.ArrayNode)s.path("scenarios")).add(s.path("scenarios").get(0).deepCopy());return s;}
    PlanRevisionService.Revision patch(double x,double y,Boolean locked,Boolean rotated) {
        return new PlanRevisionService.Revision(0,List.of(new PlanRevisionService.Change("a",2,1,x,y,locked,rotated)));
    }
    @Test void validMovePreservesSourceAndOtherScenario() throws Exception {
        JsonNode source=source(),before=source.deepCopy();var result=service.apply(snapshot(),source,patch(2500,0,true,null));
        assertThat(source).isEqualTo(before);assertThat(result.path("scenarios").get(1)).isEqualTo(before.path("scenarios").get(1));
        assertThat(result.path("scenarios").get(0).path("containers").get(0).path("usedLength").asDouble()).isEqualTo(3500);
    }
    @Test void rejectsOverlapAndBoundsAndRotation() throws Exception {
        JsonNode snap=snapshot(),source=source();
        assertThatThrownBy(()->service.apply(snap,source,patch(500,0,null,null))).isInstanceOf(ResponseStatusException.class).hasMessageContaining("겹칩니다");
        assertThatThrownBy(()->service.apply(snap,source,patch(4500,0,null,null))).hasMessageContaining("범위");
        assertThatThrownBy(()->service.apply(snap,source,patch(2000,1200,null,null))).hasMessageContaining("범위");
        assertThatThrownBy(()->service.apply(snap,source,patch(2000,0,null,true))).hasMessageContaining("회전 금지");
    }
    @Test void lockedCargoNeedsExplicitUnlock() throws Exception {
        JsonNode snap=snapshot(),source=source();((ObjectNode)source.path("scenarios").get(0).path("containers").get(0).path("assignments").get(1)).put("locked",true);
        assertThatThrownBy(()->service.apply(snap,source,patch(2000,0,null,null))).hasMessageContaining("잠금을 해제");
        assertThat(service.apply(snap,source,patch(2000,0,false,null)).path("scenarios").get(0).path("containers").get(0).path("assignments").get(1).path("locked").asBoolean()).isFalse();
    }
    @Test void snapshotWeightAndQuantityAreEnforced() throws Exception {
        JsonNode snap=snapshot(),source=source();((ObjectNode)snap.path("cargos").get(0)).put("grossWeight",2000);
        assertThatThrownBy(()->service.apply(snap,source,patch(2000,0,null,null))).hasMessageContaining("중량 초과");
        ((ObjectNode)snap.path("cargos").get(0)).put("quantity",3);
        ((ObjectNode)snap.path("cargos").get(0)).put("grossWeight",1000);
        assertThatThrownBy(()->service.apply(snap,source,patch(2000,0,null,null))).hasMessageContaining("수량 보존");
    }
}
