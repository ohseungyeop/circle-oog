package com.circle.oog;
import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class MeasurementReconciliationTest {
 ObjectMapper json=new ObjectMapper();
 JsonNode cargo()throws Exception{return json.readTree("{\"length\":1000,\"width\":2000,\"height\":3000,\"grossWeight\":500.1}");}
 @Test void confirmedValuesMatchWithoutApprovingDocument()throws Exception{var r=MeasurementReconciliation.compare("CARGO",cargo(),cargo(),false,true);assertThat(r.get("status")).isEqualTo("MATCHES_DECLARED_MEASUREMENTS");assertThat(r.get("carrierApproved")).isEqualTo(false);assertThat(r.get("documentAuthenticityVerified")).isEqualTo(false);}
 @Test void exactNumericComparisonPreservesMismatch()throws Exception{var m=cargo().deepCopy();((com.fasterxml.jackson.databind.node.ObjectNode)m).put("length",1000.001);assertThat(MeasurementReconciliation.compare("CARGO",m,cargo(),false,true).get("status")).isEqualTo("MISMATCH_REQUIRES_NEW_RECORD");}
 @Test void matchingEstimatedValuesStillNeedNewConfirmedCopy()throws Exception{assertThat(MeasurementReconciliation.compare("CARGO",cargo(),cargo(),true,true).get("status")).isEqualTo("ESTIMATED_SOURCE_REQUIRES_NEW_RECORD");assertThat(MeasurementReconciliation.compare("CARGO",cargo(),cargo(),false,false).get("status")).isEqualTo("DOCUMENT_SUBJECT_REVIEW_REQUIRED");}
 @Test void missingExtraNonfiniteAndNegativeMeasurementsRejected()throws Exception{var m=cargo().deepCopy();((com.fasterxml.jackson.databind.node.ObjectNode)m).put("unexpected",1);assertThatThrownBy(()->MeasurementReconciliation.compare("CARGO",m,cargo(),false,true)).hasMessageContaining("400");assertThatThrownBy(()->MeasurementReconciliation.compare("CARGO",json.createObjectNode(),cargo(),false,true)).hasMessageContaining("400");}
 @Test void zeroCogIsValidButMissingSavedCogNeverMatches()throws Exception{var c=json.readTree("{\"weightKg\":500,\"cogXmm\":0,\"cogYmm\":0,\"cogZmm\":0}");assertThat(MeasurementReconciliation.compare("CALCULATION",c,c,false,true).get("status")).isEqualTo("MATCHES_DECLARED_MEASUREMENTS");assertThat(MeasurementReconciliation.compare("CALCULATION",c,json.createObjectNode(),false,true).get("status")).isEqualTo("SAVED_INPUT_INCOMPLETE");}
}
