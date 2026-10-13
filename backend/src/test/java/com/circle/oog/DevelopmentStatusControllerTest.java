package com.circle.oog;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.assertj.core.api.Assertions.*;

class DevelopmentStatusControllerTest {
    private final ObjectMapper json=new ObjectMapper();
    private final String sample="""
        {"items":[
          {"id":"A01","name":"등록","description":"화물 등록","development":"COMPLETE","verification":"PASSED"},
          {"id":"A02","name":"수정","description":"화물 수정","development":"IN_PROGRESS","verification":"PENDING"},
          {"id":"A03","name":"삭제","description":"화물 삭제","development":"NOT_STARTED","verification":"PENDING"}
        ]}
        """;

    @Test void computesCountsFromItemsAndPreservesBothTotalInvariants() throws Exception {
        var summary=DevelopmentStatusController.summarize(json.readTree(sample));
        assertThat(summary).isEqualTo(Map.of("total",3,"completed",1,"inProgress",1,"notStarted",1,"incomplete",2,"verified",1,"verificationPending",2));
        assertThat(summary.get("completed")+summary.get("incomplete")).isEqualTo(summary.get("total"));
        assertThat(summary.get("verified")+summary.get("verificationPending")).isEqualTo(summary.get("total"));
    }
    @Test void duplicateFeatureIdsFailInsteadOfInflatingCounts() {
        assertThatThrownBy(()->DevelopmentStatusController.summarize(json.readTree(sample.replace("A02","A01")))).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("중복");
    }
    @Test void unknownDevelopmentOrVerificationStatesFailInsteadOfDisappearing() {
        assertThatThrownBy(()->DevelopmentStatusController.summarize(json.readTree(sample.replace("IN_PROGRESS","UNKNOWN")))).hasMessageContaining("개발상태 코드 오류");
        assertThatThrownBy(()->DevelopmentStatusController.summarize(json.readTree(sample.replace("PENDING","UNKNOWN")))).hasMessageContaining("검증상태 코드 오류");
    }
}
