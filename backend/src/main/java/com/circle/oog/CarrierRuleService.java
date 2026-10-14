package com.circle.oog;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.util.*;

@Service
public class CarrierRuleService {
    private final JdbcTemplate jdbc;
    public CarrierRuleService(JdbcTemplate jdbc){this.jdbc=jdbc;}
    public record Input(String carrier,String equipmentCode,LocalDate validFrom,LocalDate validUntil,double usableLengthRatio,double planningWeightRatio,double maxOverWidth,double maxOverHeight,String reason){}
    public record Selection(List<PlanningRule> rules,Map<String,Object> ruleSelection){}
    public static void validate(Input v) {
        if(v==null||v.carrier()==null||v.carrier().isBlank()||v.carrier().length()>60||!v.carrier().equals(v.carrier().trim())||v.equipmentCode()==null||!v.equipmentCode().matches("[A-Z0-9_-]{1,30}")||v.validFrom()==null||v.validUntil()!=null&&v.validUntil().isBefore(v.validFrom())||v.reason()==null||v.reason().isBlank()||v.reason().length()>1000)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"선사/장비/유효기간/변경사유를 확인하세요");
        if(!Double.isFinite(v.usableLengthRatio())||!Double.isFinite(v.planningWeightRatio())||!Double.isFinite(v.maxOverWidth())||!Double.isFinite(v.maxOverHeight())||v.usableLengthRatio()<0.1||v.usableLengthRatio()>1||v.planningWeightRatio()<0.1||v.planningWeightRatio()>1||v.maxOverWidth()<0||v.maxOverWidth()>30000||v.maxOverHeight()<0||v.maxOverHeight()>30000)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"선사 규칙 수치 범위 오류");
    }
    public Object list(long tenant){return jdbc.queryForList("SELECT id,carrier,equipment_code,version,valid_from,valid_until,usable_length_ratio,planning_weight_ratio,max_over_width,max_over_height,reason,created_at FROM oog_carrier_rule_version WHERE tenant_id=? ORDER BY carrier,equipment_code,version DESC",tenant);}
    @Transactional public Map<String,Object> create(long tenant,long actor,Input v) {
        validate(v);
        if(jdbc.queryForObject("SELECT count(*) FROM oog_equipment WHERE code=?",Long.class,v.equipmentCode())!=1)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"존재하지 않는 장비입니다");
        jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(?,0))",Object.class,tenant+"|"+v.carrier()+"|"+v.equipmentCode());
        long overlaps=jdbc.queryForObject("""
            SELECT count(*) FROM oog_carrier_rule_version WHERE tenant_id=? AND carrier=? AND equipment_code=?
            AND valid_from<=COALESCE(CAST(? AS date),'infinity'::date) AND COALESCE(valid_until,'infinity'::date)>=CAST(? AS date)
            """,Long.class,tenant,v.carrier(),v.equipmentCode(),v.validUntil(),v.validFrom());
        if(overlaps>0)throw new ResponseStatusException(HttpStatus.CONFLICT,"동일 선사·장비의 유효기간이 겹칩니다. 기존 버전은 변경할 수 없습니다");
        long version=jdbc.queryForObject("SELECT COALESCE(max(version),0)+1 FROM oog_carrier_rule_version WHERE tenant_id=? AND carrier=? AND equipment_code=?",Long.class,tenant,v.carrier(),v.equipmentCode());
        UUID id=UUID.randomUUID();jdbc.update("""
            INSERT INTO oog_carrier_rule_version(id,tenant_id,carrier,equipment_code,version,valid_from,valid_until,usable_length_ratio,planning_weight_ratio,max_over_width,max_over_height,reason,created_by)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,id,tenant,v.carrier(),v.equipmentCode(),version,v.validFrom(),v.validUntil(),v.usableLengthRatio(),v.planningWeightRatio(),v.maxOverWidth(),v.maxOverHeight(),v.reason().trim(),actor);
        jdbc.update("INSERT INTO core_audit_history(tenant_id,actor_user_id,actor,action,detail) SELECT ?,?,username,'CARRIER_RULE_CREATED',jsonb_build_object('ruleId',CAST(? AS text),'version',CAST(? AS bigint)) FROM core_user_account WHERE tenant_id=? AND user_id=?",tenant,actor,id.toString(),version,tenant,actor);
        return Map.of("id",id,"version",version);
    }
    public Selection resolve(long tenant,String carrier,LocalDate date,boolean allowFallback,List<Equipment> equipment,List<PlanningRule> defaults) {
        if(carrier==null||carrier.isBlank()||carrier.length()>60||date==null)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"선사 및 적용일 오류");
        var matches=jdbc.query("""
            SELECT id,equipment_code,version,valid_from,valid_until,usable_length_ratio,planning_weight_ratio,max_over_width,max_over_height
            FROM oog_carrier_rule_version WHERE tenant_id=? AND carrier=? AND valid_from<=? AND (valid_until IS NULL OR valid_until>=?)
            """,(rs,row)->{
                var rule=new PlanningRule();rule.equipmentCode=rs.getString("equipment_code");rule.carrier=carrier;rule.version=rs.getLong("version");rule.usableLengthRatio=rs.getDouble("usable_length_ratio");rule.planningWeightRatio=rs.getDouble("planning_weight_ratio");rule.maxOverWidth=rs.getDouble("max_over_width");rule.maxOverHeight=rs.getDouble("max_over_height");
                var meta=new LinkedHashMap<String,Object>();meta.put("id",rs.getObject("id").toString());meta.put("validFrom",rs.getDate("valid_from").toLocalDate().toString());var until=rs.getDate("valid_until");meta.put("validUntil",until==null?null:until.toLocalDate().toString());return new Matched(rule,meta);
            },tenant,carrier,date,date);
        return assemble(carrier,date,allowFallback,equipment,defaults,matches);
    }
    record Matched(PlanningRule rule,Map<String,Object> meta){}
    static Selection assemble(String carrier,LocalDate date,boolean allowFallback,List<Equipment> equipment,List<PlanningRule> defaults,List<Matched> matches) {
        var selected=new ArrayList<PlanningRule>();var metadata=new ArrayList<Map<String,Object>>();
        for(var e:equipment){var found=matches.stream().filter(v->v.rule().equipmentCode.equals(e.code)).toList();if(found.size()>1)throw new ResponseStatusException(HttpStatus.CONFLICT,"선사 규칙 기간 중복: "+e.code);
            PlanningRule r;var m=new LinkedHashMap<String,Object>();
            if(found.isEmpty()) {if(!carrier.equals("DEFAULT")&&!allowFallback)throw new ResponseStatusException(HttpStatus.CONFLICT,"적용 가능한 선사 규칙 없음: "+e.code);
                r=defaults.stream().filter(v->v.equipmentCode.equals(e.code)).findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.CONFLICT,"DEFAULT 규칙 없음: "+e.code));m.put("source","DEFAULT");m.put("usedFallback",!carrier.equals("DEFAULT"));
            }else {r=found.getFirst().rule();m.putAll(found.getFirst().meta());m.put("source","TENANT_CARRIER_VERSION");m.put("usedFallback",false);}
            m.put("equipmentCode",e.code);m.put("carrier",r.carrier);m.put("version",r.version);selected.add(r);metadata.add(m);
        }
        return new Selection(selected,Map.of("carrier",carrier,"effectiveDate",date.toString(),"fallbackPolicy",allowFallback?"DEFAULT_FALLBACK":"REQUIRE_MATCH","versions",metadata));
    }
}
