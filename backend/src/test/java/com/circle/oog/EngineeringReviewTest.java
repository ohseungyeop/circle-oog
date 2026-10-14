package com.circle.oog;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;
import static org.assertj.core.api.Assertions.*;
class EngineeringReviewTest {
 @Test void plannerCannotRecordEngineeringReview()throws Exception {
  var actor=new com.fms.security.FmsPrincipal("planner",1L,2L,3L,0,"PLANNER",java.util.List.of(),null);
  var jdbc=org.mockito.Mockito.mock(org.springframework.jdbc.core.JdbcTemplate.class);
  org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(actor,null,actor.getAuthorities()));
  try{assertThatThrownBy(()->new EngineeringReviewController(jdbc,new ObjectMapper()).record(java.util.UUID.randomUUID(),java.util.UUID.randomUUID(),new EngineeringReviewController.Review(Map.of(),"note"))).isInstanceOf(ResponseStatusException.class).hasMessageContaining("403");org.mockito.Mockito.verifyNoInteractions(jdbc);}
  finally{org.springframework.security.core.context.SecurityContextHolder.clearContext();}
 }
 @Test void automaticScreenKeepsMissingPhysicalDataAndUnassignedVisible()throws Exception {
  var json=new ObjectMapper();var input=json.readTree("{\"cargos\":[{\"estimated\":true}]}");var result=json.readTree("{\"scenarios\":[{\"objective\":\"MIN_EQUIPMENT\",\"unassigned\":[{}]}]}");
  var screen=EngineeringReviewController.screen(input,result);assertThat(screen.get("approved")).isEqualTo(false);assertThat(screen.get("engineeringRequired")).isEqualTo(true);assertThat(screen.get("physicalCalculation")).isEqualTo("SEPARATE_CALCULATION_WORKFLOW");assertThat((java.util.List<?>)screen.get("warnings")).hasSize(2);
 }
 @Test void manualReviewRequiresRecognizedEvidenceAndReason(){
  assertThatThrownBy(()->EngineeringReviewController.validate(new EngineeringReviewController.Review(Map.of("APPROVED","yes"),"reason"))).isInstanceOf(ResponseStatusException.class);
  assertThatThrownBy(()->EngineeringReviewController.validate(new EngineeringReviewController.Review(Map.of()," "))).isInstanceOf(ResponseStatusException.class);
  EngineeringReviewController.validate(new EngineeringReviewController.Review(Map.of("COG_MEASURED","Customer measurement report"),"review note"));
 }
}
