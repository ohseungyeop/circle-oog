package com.circle.oog;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.io.IOException;
import java.util.*;

/** Serves the same canonical feature inventory used by the development documents. */
@RestController
public class DevelopmentStatusController {
    private final Map<String,Object> status;

    public DevelopmentStatusController(ObjectMapper json) throws IOException {
        try(var input=new ClassPathResource("development/feature-status.json").getInputStream()) {
            JsonNode source=json.readTree(input);
            var result=new LinkedHashMap<String,Object>();
            result.put("updated",requiredText(source,"updated"));
            result.put("version",requiredText(source,"version"));
            result.put("summary",summarize(source));
            result.put("items",source.get("items"));
            result.put("verificationRuns",source.path("verificationRuns"));
            result.put("notes",source.path("notes"));
            status=Collections.unmodifiableMap(result);
        }
    }

    @GetMapping("/api/development/status")
    public Map<String,Object> status() {return status;}

    public static Map<String,Integer> summarize(JsonNode source) {
        if(source==null||!source.isObject()||!source.path("items").isArray()) throw new IllegalArgumentException("개발상태 items 배열이 필요합니다");
        int complete=0,progress=0,notStarted=0,verified=0,pending=0;
        var ids=new HashSet<String>();
        for(JsonNode item:source.get("items")) {
            String id=requiredText(item,"id");
            if(!ids.add(id)) throw new IllegalArgumentException("개발상태 ID 중복: "+id);
            requiredText(item,"name");requiredText(item,"description");
            switch(requiredText(item,"development")) {
                case "COMPLETE" -> complete++;
                case "IN_PROGRESS" -> progress++;
                case "NOT_STARTED" -> notStarted++;
                default -> throw new IllegalArgumentException("개발상태 코드 오류: "+id);
            }
            switch(requiredText(item,"verification")) {
                case "PASSED" -> verified++;
                case "PENDING" -> pending++;
                default -> throw new IllegalArgumentException("검증상태 코드 오류: "+id);
            }
        }
        int total=source.get("items").size(),incomplete=progress+notStarted;
        if(complete+incomplete!=total||verified+pending!=total) throw new IllegalArgumentException("개발상태 합계 불일치");
        return Map.of("total",total,"completed",complete,"inProgress",progress,"notStarted",notStarted,"incomplete",incomplete,"verified",verified,"verificationPending",pending);
    }

    private static String requiredText(JsonNode node,String field) {
        if(node==null||!node.isObject()||!node.path(field).isTextual()||node.get(field).asText().isBlank()) throw new IllegalArgumentException("개발상태 필수 항목 오류: "+field);
        return node.get(field).asText();
    }
}
