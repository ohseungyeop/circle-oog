package com.circle.oog;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class CoupledBeamChecksTest {
 CoupledBeamChecks.Support s(String id,double x,double k){return new CoupledBeamChecks.Support(id,x,k,100d,1000d,100d);}
 CoupledBeamChecks.Input input(List<CoupledBeamChecks.Support> supports,double x){return new CoupledBeamChecks.Input(1000d,200000d,1e8,1e6,1000d,200d,100d,1d,true,"drawing and load case",supports,List.of(new CoupledBeamChecks.Load("P",x,10d)));}
 @Test void elasticTwoSupportClosedFormAndInteriorMaximum(){var r=new ObjectMapper().valueToTree(CoupledBeamChecks.calculate(input(List.of(s("A",0,100),s("B",1000,100)),500)));assertThat(r.path("status").asText()).isEqualTo("DECLARED_MODEL_LIMITS_PASSED");assertThat(r.path("maximumDeflectionMm").asDouble()).isCloseTo(.05+10000d*Math.pow(1000,3)/(48*200000*1e8),within(1e-8));assertThat(r.path("maximumMomentKnMm").asDouble()).isCloseTo(2500,within(1e-6));assertThat(r.path("maximumShearKn").asDouble()).isCloseTo(5,within(1e-8));assertThat(r.path("forceResidualKn").asDouble()).isCloseTo(0,within(1e-8));}
 @Test void thirdElasticSupportCouplesBeamBendingAndReaction(){var r=new ObjectMapper().valueToTree(CoupledBeamChecks.calculate(input(List.of(s("A",0,100),s("B",500,100),s("C",1000,100)),500)));double end=10/(3+100000d*Math.pow(1000,3)/(24*200000*1e8));assertThat(r.path("supports").get(0).path("reactionKn").asDouble()).isCloseTo(end,within(1e-7));assertThat(r.path("supports").get(1).path("reactionKn").asDouble()).isCloseTo(10-2*end,within(1e-7));}
 @Test void inactiveSupportCannotCarryTension(){var r=new ObjectMapper().valueToTree(CoupledBeamChecks.calculate(input(List.of(s("A",0,100000),s("B",500,100000),s("C",1000,100000)),250)));assertThat(r.path("supports").get(2).path("active").asBoolean()).isFalse();assertThat(r.path("supports").get(2).path("reactionKn").asDouble()).isZero();assertThat(r.path("forceResidualKn").asDouble()).isCloseTo(0,within(1e-7));}
 @Test void outsideSupportFootprintNeverReceivesFalseProof(){var r=CoupledBeamChecks.calculate(input(List.of(s("A",200,100),s("B",1000,100)),0));assertThat(r.get("status")).isEqualTo("CONTACT_EQUILIBRIUM_NOT_PROVEN");}
 @Test void duplicateSupportAndMissingTheoryEvidenceRejected(){assertThatThrownBy(()->CoupledBeamChecks.calculate(input(List.of(s("A",0,100),s("B",0,100)),500))).hasMessageContaining("400");}
 @Test void asymmetricPointLoadMaximumBetweenNodesMatchesClosedForm(){var r=new ObjectMapper().valueToTree(CoupledBeamChecks.calculate(input(List.of(s("A",0,100000),s("B",1000,100000)),250)));double l=1000,a=250,p=10000,ei=200000*1e8,k=1e8,wa=p*.75/k,wb=p*.25/k,slope=(wb-wa)/l;double x=l-Math.sqrt((l*l-a*a-6*l*ei*slope/(p*a))/3);double expected=wa+(wb-wa)*x/l+p*a*(l-x)/(6*l*ei)*(l*l-a*a-(l-x)*(l-x));assertThat(r.path("maximumDeflectionMm").asDouble()).isCloseTo(expected,within(1e-9));assertThat(x).isBetween(250d,1000d);}
}
