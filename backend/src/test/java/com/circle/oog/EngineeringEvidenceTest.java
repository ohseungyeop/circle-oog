package com.circle.oog;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class EngineeringEvidenceTest {
 EngineeringEvidenceController.Metadata m(String category,String decision,LocalDate issue,LocalDate expiry){return new EngineeringEvidenceController.Metadata(category,"unit-1","issuer","drawing-1",decision,issue,expiry,"verified source reference");}
 @Test void categoryAndDateMustBeDeclared(){assertThatThrownBy(()->EngineeringEvidenceController.validate(m(null,"SUBMITTED",LocalDate.now(),null))).hasMessageContaining("400");assertThatThrownBy(()->EngineeringEvidenceController.validate(m("COG_MEASURED","SUBMITTED",LocalDate.now().plusDays(1),null))).hasMessageContaining("400");assertThatThrownBy(()->EngineeringEvidenceController.validate(m("COG_MEASURED","SUBMITTED",LocalDate.now(),LocalDate.now().minusDays(1)))).hasMessageContaining("400");}
 @Test void onlyCarrierDocumentsRecordExternalDecisions(){assertThatThrownBy(()->EngineeringEvidenceController.validate(m("COG_MEASURED","ACCEPTED",LocalDate.now(),null))).hasMessageContaining("400");assertThatCode(()->EngineeringEvidenceController.validate(m("CARRIER_APPROVAL","REJECTED",LocalDate.now(),null))).doesNotThrowAnyException();}
 @Test void misleadingExtensionsAndEmptyFilesRejected(){assertThatThrownBy(()->EngineeringEvidenceController.media("file.pdf","fake".getBytes())).hasMessageContaining("400");assertThatThrownBy(()->EngineeringEvidenceController.media("file.exe","%PDF-1.7".getBytes())).hasMessageContaining("400");assertThatThrownBy(()->EngineeringEvidenceController.media("file.png",new byte[0])).hasMessageContaining("400");assertThat(EngineeringEvidenceController.media("file.PDF","%PDF-1.7".getBytes())).isEqualTo("application/pdf");}
 @Test void digestChecksRealBytes()throws Exception {assertThat(EngineeringEvidenceController.sha("abc".getBytes())).isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");assertThat(EngineeringEvidenceController.sha("abcd".getBytes())).isNotEqualTo(EngineeringEvidenceController.sha("abc".getBytes()));}
}
