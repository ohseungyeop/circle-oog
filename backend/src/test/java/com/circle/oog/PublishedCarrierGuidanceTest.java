package com.circle.oog;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class PublishedCarrierGuidanceTest {
    PublishedCarrierGuidance.Request request(String chart,Double weight,Double length,Double plate){return new PublishedCarrierGuidance.Request(chart,weight,length,plate,true,true,"Fixture verified unit/loading geometry; no actual shipping approval");}
    @Test void official54200ColumnSixMeterRowIs36100(){var r=PublishedCarrierGuidance.check(request("HL40_54200",36000d,6000d,54200d));assertThat(r).containsEntry("screeningLimitKg",36100d).containsEntry("reviewCandidate",true).containsEntry("carrierApproved",false).containsEntry("eligibleForInternalApproval",false);}
    @Test void betweenRowsDoesNotInventInterpolation(){var r=PublishedCarrierGuidance.check(request("HL40_54200",37000d,7000d,54200d));assertThat(r).containsEntry("publishedRowRestingLengthMm",6000).containsEntry("screeningLimitKg",36100d).containsEntry("status","EXCEEDS_PUBLISHED_GUIDANCE");}
    @Test void actualPlateAlwaysCapsGuidance(){assertThat(PublishedCarrierGuidance.check(request("HL40_54200",35001d,6000d,35000d))).containsEntry("screeningLimitKg",35000d).containsEntry("reviewCandidate",false);}
    @Test void ambiguousOriginalColumnIsBlockedEvenForLightLoad(){assertThat(PublishedCarrierGuidance.check(request("HL40_49000",1000d,2000d,49100d))).containsEntry("status","SOURCE_CONFLICT_REQUIRES_CARRIER_CONFIRMATION").containsEntry("reviewCandidate",false);}
    @Test void noExtrapolationBeyondPublishedRows(){for(double length:new double[]{1999,12001})assertThat(PublishedCarrierGuidance.check(request("HL40_54200",1000d,length,54200d))).containsEntry("status","OUTSIDE_PUBLISHED_ROWS").containsEntry("screeningLimitKg",null).containsEntry("reviewCandidate",false);}
    @Test void missingMeasuredValuesNeverDefaultToPackingDimensions(){assertThat(PublishedCarrierGuidance.check(request("HL40_54200",null,null,null))).containsEntry("status","NEEDS_INFORMATION").containsEntry("reviewCandidate",false);}
    @Test void loadingPathConfirmationIsRequired(){var v=new PublishedCarrierGuidance.Request("HL40_54200",1000d,6000d,54200d,false,true,"reference");assertThat(PublishedCarrierGuidance.check(v)).containsEntry("status","NEEDS_INFORMATION").containsEntry("reviewCandidate",false);}
    @Test void unknownAndNonfiniteValuesAreRejected(){assertThatThrownBy(()->PublishedCarrierGuidance.check(request("OTHER",1000d,6000d,54200d))).hasMessageContaining("정확한 열");assertThatThrownBy(()->PublishedCarrierGuidance.check(request("HL40_54200",Double.NaN,6000d,54200d))).hasMessageContaining("중량");}
}
