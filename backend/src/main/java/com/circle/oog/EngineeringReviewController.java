package com.circle.oog;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** Review records support engineering work; no action grants physical or carrier approval. */
@RestController
@RequestMapping("/api/projects/{id}/plans/{planId}/engineering")
public class EngineeringReviewController {
    static final List<String> REQUIRED=List.of("PACKED_DIMENSIONS","COG_MEASURED","SUPPORT_POINTS","CONTACT_AREA","POINT_LOAD","LASHING_POINTS","LASHING_MATERIAL_AND_ANGLES","CARRIER_APPROVAL");
    public record Review(Map<String,String> observations,String reason){}
    private final JdbcTemplate jdbc;private final ObjectMapper json;
    public EngineeringReviewController(JdbcTemplate jdbc,ObjectMapper json){this.jdbc=jdbc;this.json=json;}
    private Map<String,Object> saved(UUID project,UUID plan)throws Exception {
        var rows=jdbc.queryForList("select input_snapshot::text,result::text from oog_clp_scenario s join oog_project p on p.id=s.project_id where p.tenant_id=? and s.project_id=? and s.id=?",VerifiedActor.tenantId(),project,plan);
        if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"계획을 찾을 수 없습니다");return rows.getFirst();
    }
    @GetMapping public Object get(@PathVariable UUID id,@PathVariable UUID planId)throws Exception {
        var row=saved(id,planId);var result=json.readTree((String)row.get("result"));var input=json.readTree((String)row.get("input_snapshot"));
        var notes=jdbc.queryForList("select id,status,detail::text,created_at from oog_engineering_review where tenant_id=? and project_id=? and plan_id=? order by created_at desc limit 20",VerifiedActor.tenantId(),id,planId);
        List<Map<String,Object>> history=new ArrayList<>();for(var note:notes){note.put("detail",json.readTree((String)note.get("detail")));history.add(note);}
        return Map.of("automatic",screen(input,result),"history",history);
    }
    static Map<String,Object> screen(JsonNode input,JsonNode result){
        List<String> warnings=new ArrayList<>();boolean estimated=false;for(var cargo:input.path("cargos"))if(cargo.path("estimated").asBoolean())estimated=true;
        if(estimated)warnings.add("포장 추정값이 포함되어 실제 치수·중량 확인이 필요합니다");
        for(var scenario:result.path("scenarios"))if(!scenario.path("unassigned").isEmpty())warnings.add(scenario.path("objective").asText()+": 미배정 화물 "+scenario.path("unassigned").size()+"개");
        return Map.of("status","PRE_PLAN","approved",false,"engineeringRequired",true,"requiredChecks",REQUIRED,"warnings",warnings,"physicalCalculation","SEPARATE_CALCULATION_WORKFLOW","cargoCount",input.path("cargos").size());
    }
    static void validate(Review review){
        if(review==null||review.reason()==null||review.reason().isBlank()||review.reason().length()>2000||review.observations()==null||review.observations().size()>REQUIRED.size())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"검토 근거를 입력하세요");
        for(var entry:review.observations().entrySet())if(!REQUIRED.contains(entry.getKey())||entry.getValue()==null||entry.getValue().isBlank()||entry.getValue().length()>2000)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"검토 항목과 확인 근거를 확인하세요");
    }
    @PostMapping @Transactional(rollbackFor=Exception.class) public Object record(@PathVariable UUID id,@PathVariable UUID planId,@RequestBody Review review)throws Exception {
        var actor=VerifiedActor.current();
        if(!Set.of("ENGINEER","ADMIN","SUPER_ADMIN").contains(actor.getRoleCode()))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"공학 검토 기록은 엔지니어 또는 관리자 역할이 필요합니다");
        saved(id,planId);validate(review);
        String status=review.observations().keySet().containsAll(REQUIRED)?"REVIEW_RECORDED_NOT_APPROVED":"NEEDS_REVIEW";UUID note=UUID.randomUUID();
        var detail=Map.of("observations",review.observations(),"reason",review.reason(),"approved",false,"planStatus","PRE_PLAN");
        jdbc.update("insert into oog_engineering_review(id,tenant_id,project_id,plan_id,author_id,status,detail) values(?,?,?,?,?,?,cast(? as jsonb))",note,actor.getTenantId(),id,planId,actor.getUserId(),status,json.writeValueAsString(detail));
        jdbc.update("insert into core_audit_history(project_id,action,actor,tenant_id,actor_user_id,detail) values(?,'ENGINEERING_REVIEW_RECORDED',?,?,?,cast(? as jsonb))",id,actor.getName(),actor.getTenantId(),actor.getUserId(),json.writeValueAsString(Map.of("reviewId",note,"planId",planId,"status",status,"approved",false)));
        return Map.of("id",note,"status",status,"approved",false);
    }
}
