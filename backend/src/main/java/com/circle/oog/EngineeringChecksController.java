package com.circle.oog;
import com.fasterxml.jackson.databind.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController @RequestMapping("/api/projects/{id}/plans/{planId}/engineering/checks")
public class EngineeringChecksController {
 public record Request(JsonNode input,String reason){}
 private final JdbcTemplate jdbc;private final ObjectMapper json;
 public EngineeringChecksController(JdbcTemplate jdbc,ObjectMapper json){this.jdbc=jdbc;this.json=json;}
 private String plan(UUID id,UUID plan){var rows=jdbc.queryForList("select input_snapshot::text from oog_clp_scenario s join oog_project p on p.id=s.project_id where p.tenant_id=? and s.project_id=? and s.id=?",VerifiedActor.tenantId(),id,plan);if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"계획을 찾을 수 없습니다");return (String)rows.getFirst().get("input_snapshot");}
 @GetMapping public Object list(@PathVariable UUID id,@PathVariable UUID planId)throws Exception{plan(id,planId);var rows=jdbc.queryForList("select id,author_id,created_at,detail::text from oog_engineering_review where tenant_id=? and project_id=? and plan_id=? and detail->>'kind'='MODEL_CHECK' order by created_at desc,id desc",VerifiedActor.tenantId(),id,planId);for(var row:rows)row.put("detail",json.readTree((String)row.get("detail")));return rows;}
 @PostMapping("/{kind}") @Transactional(rollbackFor=Exception.class)
 public Object create(@PathVariable UUID id,@PathVariable UUID planId,@PathVariable String kind,@RequestBody Request request)throws Exception{
  var actor=VerifiedActor.current();if(!Set.of("ENGINEER","ADMIN","SUPER_ADMIN").contains(actor.getRoleCode()))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"전용/구조 계산 기록은 엔지니어 또는 관리자 역할이 필요합니다");
  String saved=plan(id,planId);if(request==null||request.input()==null||!request.input().isObject()||request.reason()==null||request.reason().isBlank()||request.reason().length()>2000||request.input().toString().length()>100000)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"계산 입력과 목적/하중 조합 근거를 확인하세요");
  Object result;
  if(!kind.equals("COUPLED_BEAM"))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"OOG 구조 계산 종류를 확인하세요");
  if(kind.equals("COUPLED_BEAM")){CoupledBeamChecks.Input input;try{input=json.treeToValue(request.input(),CoupledBeamChecks.Input.class);}catch(Exception ex){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"연성 보 수치와 입력 형식을 확인하세요");}result=CoupledBeamChecks.calculate(input);}else throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"지원하지 않는 구조 계산입니다");
  var detail=new LinkedHashMap<String,Object>();detail.put("kind","MODEL_CHECK");detail.put("checkKind",kind);detail.put("input",request.input());detail.put("result",result);detail.put("savedPlanInput",json.readTree(saved));detail.put("reason",request.reason());detail.put("observations",Map.of());detail.put("approved",false);detail.put("planStatus","PRE_PLAN");UUID key=UUID.randomUUID();
  jdbc.update("insert into oog_engineering_review(id,tenant_id,project_id,plan_id,author_id,status,detail) values(?,?,?,?,?,'REVIEW_RECORDED_NOT_APPROVED',cast(? as jsonb))",key,actor.getTenantId(),id,planId,actor.getUserId(),json.writeValueAsString(detail));
  jdbc.update("insert into core_audit_history(project_id,action,actor,tenant_id,actor_user_id,detail) values(?,'ENGINEERING_MODEL_CHECK',?,?,?,cast(? as jsonb))",id,actor.getName(),actor.getTenantId(),actor.getUserId(),json.writeValueAsString(Map.of("id",key,"planId",planId,"kind",kind)));
  return Map.of("id",key,"result",result,"planStatus","PRE_PLAN","carrierApproved",false);
 }
}
