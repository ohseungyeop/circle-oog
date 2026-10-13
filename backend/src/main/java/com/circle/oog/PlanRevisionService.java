package com.circle.oog;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PlanRevisionService {
    public record Change(String cargoId,Integer piece,Integer targetContainerNumber,Double x,Double y,Boolean locked,Boolean rotated) {}
    public record Revision(Integer scenarioIndex,List<Change> changes) {}
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    public PlanRevisionService(JdbcTemplate jdbc,ObjectMapper json) {this.jdbc=jdbc;this.json=json;}

    @Transactional(rollbackFor=Exception.class) public Object revise(UUID projectId,UUID planId,Revision request,String actor) throws Exception {
        var verified=VerifiedActor.current();
        var rows=jdbc.queryForList("select s.result::text as result,s.input_snapshot::text as snapshot from oog_clp_scenario s join oog_project p on p.id=s.project_id where s.project_id=? and s.id=? and p.tenant_id=?",projectId,planId,verified.getTenantId());
        if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"CLP를 찾을 수 없습니다");
        JsonNode snapshot=json.readTree((String)rows.getFirst().get("snapshot"));
        ObjectNode result=apply(snapshot,json.readTree((String)rows.getFirst().get("result")),request);
        UUID id=UUID.randomUUID();
        result.set("revision",json.valueToTree(Map.of("sourcePlanId",planId,"scenarioIndex",request.scenarioIndex(),"coordinateUnit","mm","stackingSupported",false)));
        jdbc.update("insert into oog_clp_scenario(id,project_id,result,input_snapshot) values(?,?,cast(? as jsonb),cast(? as jsonb))",id,projectId,json.writeValueAsString(result),json.writeValueAsString(snapshot));
        jdbc.update("insert into core_audit_history(project_id,action,actor,detail,tenant_id,actor_user_id) values(?,?,?,cast(? as jsonb),?,?)",projectId,"CLP_REVISED",verified.getName(),json.writeValueAsString(Map.of("sourcePlanId",planId,"scenarioId",id,"request",request)),verified.getTenantId(),verified.getUserId());
        return Map.of("id",id,"sourcePlanId",planId,"result",result);
    }

    ObjectNode apply(JsonNode snapshot,JsonNode source,Revision request) {
        if(request==null||request.scenarioIndex()==null||request.scenarioIndex()<0||!source.path("scenarios").isArray()||request.scenarioIndex()>=source.path("scenarios").size()
            ||request.changes()==null||request.changes().isEmpty()||request.changes().size()>20000) fail("시나리오와 변경 항목을 확인하세요");
        ObjectNode result=source.deepCopy();
        JsonNode scenario=result.path("scenarios").get(request.scenarioIndex());
        var boxes=new HashMap<Integer,JsonNode>();
        for(JsonNode box:scenario.path("containers")) if(boxes.put(box.path("number").asInt(),box)!=null) fail("중복 컨테이너 번호");
        Set<String> changed=new HashSet<>();
        for(Change change:request.changes()) {
            if(change==null||change.cargoId()==null||change.piece()==null||change.piece()<1||change.targetContainerNumber()==null||change.x()==null||change.y()==null
                ||!Double.isFinite(change.x())||!Double.isFinite(change.y())) fail("화물 번호와 유한한 mm 좌표가 필요합니다");
            String key=change.cargoId()+":"+change.piece();if(!changed.add(key)) fail("동일 화물 중복 변경");
            JsonNode target=boxes.get(change.targetContainerNumber());if(target==null) fail("대상 컨테이너 없음");
            ObjectNode found=null;ArrayNode oldAssignments=null;
            for(JsonNode box:boxes.values()) for(JsonNode a:box.path("assignments")) if(key(a).equals(key)) {found=(ObjectNode)a;oldAssignments=(ArrayNode)box.path("assignments");}
            if(found==null) fail("배정된 화물만 이동할 수 있습니다");
            boolean move=found.path("x").asDouble()!=change.x()||found.path("y").asDouble()!=change.y()||oldAssignments!=target.path("assignments")||change.rotated()!=null&&change.rotated()!=found.path("rotated").asBoolean();
            if(found.path("locked").asBoolean()&&move&&!Boolean.FALSE.equals(change.locked())) fail("잠긴 화물은 locked:false로 잠금을 해제해야 이동할 수 있습니다");
            ObjectNode moved=found.deepCopy();moved.put("x",change.x());moved.put("y",change.y());moved.put("z",0);
            if(change.locked()!=null)moved.put("locked",change.locked());if(change.rotated()!=null)moved.put("rotated",change.rotated());
            for(int i=0;i<oldAssignments.size();i++) if(oldAssignments.get(i)==found){oldAssignments.remove(i);break;}
            ((ArrayNode)target.path("assignments")).add(moved);
        }
        validate(snapshot,scenario);
        return result;
    }
    private String key(JsonNode a) {return a.path("cargoId").asText()+":"+a.path("piece").asInt();}
    private Map<String,JsonNode> index(JsonNode nodes,String key) {var map=new HashMap<String,JsonNode>();for(JsonNode n:nodes)map.put(n.path(key).asText(),n);return map;}
    private void validate(JsonNode snapshot,JsonNode scenario) {
        var cargos=index(snapshot.path("cargos"),"id");var equipment=index(snapshot.path("equipment"),"code");var rules=index(snapshot.path("rules"),"equipmentCode");
        Set<String> expected=new HashSet<>();for(JsonNode c:cargos.values())for(int p=1;p<=c.path("quantity").asInt();p++)expected.add(c.path("id").asText()+":"+p);
        Set<String> seen=new HashSet<>();
        for(JsonNode box:scenario.path("containers")) {
            JsonNode e=equipment.get(box.path("equipment").asText()),r=rules.get(box.path("equipment").asText());if(e==null||r==null)fail("원본 장비/규칙 누락");
            double limitL=e.path("length").asDouble()*r.path("usableLengthRatio").asDouble(),limitW=e.path("width").asDouble()+(e.path("openWidth").asBoolean()?r.path("maxOverWidth").asDouble():0),limitH=e.path("height").asDouble()+(e.path("openHeight").asBoolean()?r.path("maxOverHeight").asDouble():0);
            double weight=0,used=0;List<JsonNode> prior=new ArrayList<>();
            for(JsonNode a:box.path("assignments")) {
                if(!expected.contains(key(a))||!seen.add(key(a)))fail("화물 수량 보존 오류");JsonNode c=cargos.get(a.path("cargoId").asText());
                boolean rotated=a.path("rotated").asBoolean();if(rotated&&!c.path("rotationAllowed").asBoolean())fail("회전 금지 화물");
                double l=c.path(rotated?"width":"length").asDouble(),w=c.path(rotated?"length":"width").asDouble(),h=c.path("height").asDouble(),x=a.path("x").asDouble(),y=a.path("y").asDouble();
                double margin=(limitW-e.path("width").asDouble())/2;
                if(!Double.isFinite(x)||!Double.isFinite(y)||x<0||x+l>limitL+1e-7||y< -margin-1e-7||y+w>e.path("width").asDouble()+margin+1e-7||w>limitW||h>limitH||a.path("z").asDouble()!=0)fail("길이/폭/높이 계획 범위 초과 또는 적층 미지원");
                ObjectNode assignment=(ObjectNode)a;assignment.put("length",l);assignment.put("width",w);assignment.put("height",h);assignment.put("weight",c.path("grossWeight").asDouble());
                for(JsonNode b:prior)if(x<b.path("x").asDouble()+b.path("length").asDouble()-1e-7&&x+l>b.path("x").asDouble()+1e-7&&y<b.path("y").asDouble()+b.path("width").asDouble()-1e-7&&y+w>b.path("y").asDouble()+1e-7)fail("화물이 겹칩니다");
                prior.add(a);weight+=c.path("grossWeight").asDouble();used=Math.max(used,x+l);
            }
            double payload=e.path("payload").asDouble()*r.path("planningWeightRatio").asDouble();if(weight>payload+1e-7)fail("계획 중량 초과");
            ObjectNode b=(ObjectNode)box;b.put("weight",weight);b.put("usedLength",used);b.put("usableLength",limitL);b.put("payloadLimit",payload);b.put("utilization",Math.round(used/limitL*1000)/10.0);
        }
        for(JsonNode a:scenario.path("unassigned"))if(!expected.contains(key(a))||!seen.add(key(a)))fail("미배정 수량 보존 오류");
        if(!seen.equals(expected))fail("화물 수량 보존 오류");((ObjectNode)scenario).put("status","PRE_PLAN");
    }
    private void fail(String message) {throw new ResponseStatusException(HttpStatus.BAD_REQUEST,message);}
}
