package com.circle.oog;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.*;
@RestController @RequestMapping("/api/projects/{id}/plans")
public class PlanComparisonController {
 private final JdbcTemplate jdbc;private final ObjectMapper json;
 public PlanComparisonController(JdbcTemplate jdbc,ObjectMapper json){this.jdbc=jdbc;this.json=json;}
 private JsonNode load(UUID project,UUID plan)throws Exception{var rows=jdbc.queryForList("select s.result::text,s.input_snapshot::text from oog_clp_scenario s join oog_project p on p.id=s.project_id where s.project_id=? and s.id=? and p.tenant_id=?",project,plan,VerifiedActor.tenantId());if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND);var row=rows.getFirst();var node=json.createObjectNode();node.set("result",json.readTree(row.get("result").toString()));node.set("input",json.readTree(row.get("input_snapshot").toString()));return node;}
 @GetMapping("/compare")public Object compare(@PathVariable UUID id,@RequestParam UUID left,@RequestParam UUID right)throws Exception{var l=load(id,left);var r=load(id,right);var result=new LinkedHashMap<>(difference(l,r));result.put("leftId",left);result.put("rightId",right);return result;}
 static Map<String,Object> difference(JsonNode left,JsonNode right){
  List<JsonNode> ls=scenarios(left.path("result")),rs=scenarios(right.path("result"));var alternatives=new ArrayList<Object>();
  for(int i=0;i<Math.max(ls.size(),rs.size());i++){JsonNode l=i<ls.size()?ls.get(i):MissingNode.getInstance(),r=i<rs.size()?rs.get(i):MissingNode.getInstance();var lm=pieces(l);var rm=pieces(r);var keys=new TreeSet<>(lm.keySet());keys.addAll(rm.keySet());var changes=new ArrayList<Object>();for(String key:keys){JsonNode a=lm.get(key),b=rm.get(key);if(Objects.equals(a,b))continue;var fields=new ArrayList<String>();if(a!=null&&b!=null){var names=new TreeSet<String>();a.fieldNames().forEachRemaining(names::add);b.fieldNames().forEachRemaining(names::add);for(String field:names)if(!a.path(field).equals(b.path(field)))fields.add(field);}var change=new LinkedHashMap<String,Object>();change.put("pieceKey",key);change.put("type",a==null?"ADDED":b==null?"REMOVED":"CHANGED");change.put("left",a);change.put("right",b);change.put("fields",fields);changes.add(change);}alternatives.add(Map.of("scenarioIndex",i,"leftObjective",l.path("objective").asText(),"rightObjective",r.path("objective").asText(),"changes",changes,"leftSummary",summary(l),"rightSummary",summary(r)));}
  return Map.of("status","SNAPSHOT_COMPARISON","inputChanged",!left.path("input").equals(right.path("input")),"ruleSelectionChanged",!left.path("input").path("ruleSelection").equals(right.path("input").path("ruleSelection")),"leftInput",left.path("input"),"rightInput",right.path("input"),"scenarios",alternatives);
 }
 private static List<JsonNode> scenarios(JsonNode result){var list=new ArrayList<JsonNode>();if(result.path("scenarios").isArray())result.path("scenarios").forEach(list::add);else if(!result.isMissingNode())list.add(result);return list;}
 private static Map<String,JsonNode> pieces(JsonNode scenario){var rows=new TreeMap<String,JsonNode>();for(var box:scenario.path("containers"))for(var piece:box.path("assignments")){var copy=(ObjectNode)piece.deepCopy();copy.put("state","ASSIGNED");copy.set("container",box.path("number"));copy.set("equipment",box.path("equipment"));copy.set("ruleVersion",box.path("ruleVersion"));rows.put(key(piece),copy);}for(var piece:scenario.path("unassigned")){var copy=(ObjectNode)piece.deepCopy();copy.put("state","UNASSIGNED");rows.put(key(piece),copy);}return rows;}
 private static String key(JsonNode piece){return piece.path("cargoId").asText(piece.path("itemNo").asText())+"#"+piece.path("piece").asInt();}
 private static Map<String,Object> summary(JsonNode s){int assigned=0;for(var b:s.path("containers"))assigned+=b.path("assignments").size();return Map.of("equipment",s.path("containers").size(),"assigned",assigned,"unassigned",s.path("unassigned").size());}
}

