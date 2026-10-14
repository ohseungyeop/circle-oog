package com.circle.oog;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

@Service
public class QuotationService {
    private final JdbcTemplate jdbc;private final ObjectMapper json;
    public QuotationService(JdbcTemplate jdbc,ObjectMapper json){this.jdbc=jdbc;this.json=json;}
    public record PackingRuleInput(String packingType,BigDecimal allowanceLengthMm,BigDecimal allowanceWidthMm,BigDecimal allowanceHeightMm,BigDecimal tareWeightKg,String weightBasis,String reason){}
    public record RateInput(String equipmentCode,String currency,BigDecimal unitRate,LocalDate validFrom,LocalDate validUntil,String reason){}
    public record ManualPacking(BigDecimal length,BigDecimal width,BigDecimal height,BigDecimal grossWeight){}
    public record EstimateInput(UUID cargoId,String packingType,String mode,ManualPacking manual,String reason){}
    public record QuoteInput(UUID planId,String currency,LocalDate rateDate,String mode,Map<String,BigDecimal> equipmentOverrides,BigDecimal packingFee,BigDecimal lashingFee,String reason){}
    public Object rules(long tenant){return jdbc.queryForList("SELECT id,packing_type,version,allowance_length_mm,allowance_width_mm,allowance_height_mm,tare_weight_kg,weight_basis,reason FROM oog_packing_rule WHERE tenant_id=? ORDER BY packing_type,version DESC",tenant);}
    public Object rates(long tenant){return jdbc.queryForList("SELECT id,equipment_code,currency,unit_rate,version,valid_from,valid_until,reason FROM oog_equipment_rate WHERE tenant_id=? ORDER BY equipment_code,currency,version DESC",tenant);}
    private void lock(String key){jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(?,0))",Object.class,key);}
    @Transactional public Object createRule(long tenant,long actor,PackingRuleInput v){
        if(v==null||v.packingType()==null||v.packingType().isBlank()||v.packingType().length()>60||!Set.of("NET_WEIGHT","GROSS_WEIGHT").contains(Objects.toString(v.weightBasis(),"")))throw bad("포장 유형과 중량 기준을 선택하세요");reason(v.reason());
        amount(v.allowanceLengthMm(),true,100000);amount(v.allowanceWidthMm(),true,30000);amount(v.allowanceHeightMm(),true,30000);amount(v.tareWeightKg(),true,1000000);
        lock("packing|"+tenant+"|"+v.packingType());long version=jdbc.queryForObject("SELECT COALESCE(max(version),0)+1 FROM oog_packing_rule WHERE tenant_id=? AND packing_type=?",Long.class,tenant,v.packingType());UUID id=UUID.randomUUID();
        jdbc.update("INSERT INTO oog_packing_rule(id,tenant_id,packing_type,version,allowance_length_mm,allowance_width_mm,allowance_height_mm,tare_weight_kg,weight_basis,reason,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)",id,tenant,v.packingType(),version,v.allowanceLengthMm(),v.allowanceWidthMm(),v.allowanceHeightMm(),v.tareWeightKg(),v.weightBasis(),v.reason(),actor);audit(tenant,actor,"PACKING_RULE_CREATED",id);return Map.of("id",id,"version",version);
    }
    @Transactional public Object createRate(long tenant,long actor,RateInput v){
        if(v==null||v.equipmentCode()==null||!v.equipmentCode().matches("[A-Z0-9_-]{1,30}")||v.validFrom()==null||v.validUntil()!=null&&v.validUntil().isBefore(v.validFrom()))throw bad("장비와 단가 유효기간을 확인하세요");currency(v.currency());reason(v.reason());amount(v.unitRate(),true,1000000000000L);
        if(jdbc.queryForObject("SELECT count(*) FROM oog_equipment WHERE code=?",Long.class,v.equipmentCode())!=1)throw bad("등록된 장비를 선택하세요");
        lock(tenant+"|"+v.equipmentCode()+"|"+v.currency());
        if(jdbc.queryForObject("SELECT count(*) FROM oog_equipment_rate WHERE tenant_id=? AND equipment_code=? AND currency=? AND valid_from<=COALESCE(CAST(? AS date),'infinity'::date) AND COALESCE(valid_until,'infinity'::date)>=CAST(? AS date)",Long.class,tenant,v.equipmentCode(),v.currency(),v.validUntil(),v.validFrom())>0)throw new ResponseStatusException(HttpStatus.CONFLICT,"장비·통화 단가 기간이 겹칩니다");
        long version=jdbc.queryForObject("SELECT COALESCE(max(version),0)+1 FROM oog_equipment_rate WHERE tenant_id=? AND equipment_code=? AND currency=?",Long.class,tenant,v.equipmentCode(),v.currency());UUID id=UUID.randomUUID();
        jdbc.update("INSERT INTO oog_equipment_rate(id,tenant_id,equipment_code,currency,unit_rate,version,valid_from,valid_until,reason,created_by) VALUES(?,?,?,?,?,?,?,?,?,?)",id,tenant,v.equipmentCode(),v.currency(),v.unitRate(),version,v.validFrom(),v.validUntil(),v.reason(),actor);audit(tenant,actor,"EQUIPMENT_RATE_CREATED",id);return Map.of("id",id,"version",version);
    }
    private void project(long tenant,UUID project){if(jdbc.queryForObject("SELECT count(*) FROM oog_project WHERE tenant_id=? AND id=?",Long.class,tenant,project)!=1)throw new ResponseStatusException(HttpStatus.NOT_FOUND);}
    @Transactional public Object estimate(long tenant,long actor,UUID project,EstimateInput input)throws Exception{
        project(tenant,project);if(input==null||input.cargoId()==null||input.packingType()==null||input.packingType().isBlank()||input.packingType().length()>60)throw bad("화물과 포장 유형을 선택하세요");
        var rows=jdbc.queryForList("SELECT row_to_json(c)::text AS cargo FROM oog_cargo c WHERE project_id=? AND id=?",project,input.cargoId());if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"프로젝트 화물이 없습니다");var cargo=json.readTree(rows.getFirst().get("cargo").toString());
        var found=jdbc.queryForList("SELECT row_to_json(r)::text AS rule FROM oog_packing_rule r WHERE tenant_id=? AND packing_type=? ORDER BY version DESC LIMIT 1",tenant,input.packingType());JsonNode rule=found.isEmpty()?json.nullNode():json.readTree(found.getFirst().get("rule").toString());
        var result=packing(cargo,rule,input);var snapshot=new LinkedHashMap<String,Object>();snapshot.put("cargo",cargo);snapshot.put("packingRule",rule);snapshot.put("request",input);return save("oog_packing_estimate",tenant,actor,project,input.cargoId(),snapshot,result);
    }
    @Transactional public Object quote(long tenant,long actor,UUID project,QuoteInput request)throws Exception{
        project(tenant,project);if(request==null||request.planId()==null)throw bad("저장된 계획을 선택하세요");currency(request.currency());String mode=mode(request.mode());
        if(request.equipmentOverrides()!=null&&!request.equipmentOverrides().isEmpty()){if(!mode.equals("MANUAL"))throw bad("단가 직접 입력은 수동 모드에서 선택하세요");reason(request.reason());}
        if(request.packingFee()!=null||request.lashingFee()!=null)reason(request.reason());
        var rows=jdbc.queryForList("SELECT result::text,input_snapshot::text FROM oog_clp_scenario WHERE project_id=? AND id=?",project,request.planId());if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"프로젝트 계획이 없습니다");
        var plan=json.readTree(rows.getFirst().get("result").toString());var planInput=json.readTree(rows.getFirst().get("input_snapshot").toString());LocalDate date=request.rateDate()==null?LocalDate.now(java.time.ZoneId.of("Asia/Seoul")):request.rateDate();
        var rates=jdbc.queryForList("SELECT row_to_json(r)::text AS rate FROM oog_equipment_rate r WHERE tenant_id=? AND valid_from<=? AND (valid_until IS NULL OR valid_until>=?)",tenant,date,date);
        var rateNodes=new ArrayList<JsonNode>();for(var r:rates)rateNodes.add(json.readTree(r.get("rate").toString()));
        var result=quotation(plan,rateNodes,request);var snapshot=new LinkedHashMap<String,Object>();snapshot.put("plan",plan);snapshot.put("planInput",planInput);snapshot.put("request",request);snapshot.put("rateDate",date.toString());snapshot.put("rates",rateNodes);
        return save("oog_quotation",tenant,actor,project,request.planId(),snapshot,result);
    }
    public Object list(long tenant,UUID project,boolean quote)throws Exception{project(tenant,project);String table=quote?"oog_quotation":"oog_packing_estimate";var rows=jdbc.queryForList("SELECT id,"+(quote?"plan_id":"cargo_id")+",input_snapshot::text,result::text,created_at FROM "+table+" WHERE tenant_id=? AND project_id=? ORDER BY created_at DESC LIMIT 100",tenant,project);for(var r:rows){r.put("input_snapshot",json.readTree(r.get("input_snapshot").toString()));r.put("result",json.readTree(r.get("result").toString()));}return rows;}
    private Object save(String table,long tenant,long actor,UUID project,UUID source,Object input,Object result)throws Exception{
        UUID id=UUID.randomUUID();jdbc.update("INSERT INTO "+table+"(id,tenant_id,project_id,"+(table.equals("oog_quotation")?"plan_id":"cargo_id")+",input_snapshot,result,created_by) VALUES(?,?,?,?,cast(? as jsonb),cast(? as jsonb),?)",id,tenant,project,source,json.writeValueAsString(input),json.writeValueAsString(result),actor);audit(tenant,actor,table.equals("oog_quotation")?"PRE_QUOTE_CREATED":"PACKING_ESTIMATE_CREATED",id,project);return Map.of("id",id,"result",result);
    }
    private void audit(long tenant,long actor,String action,UUID id){audit(tenant,actor,action,id,null);}
    private void audit(long tenant,long actor,String action,UUID id,UUID project){jdbc.update("INSERT INTO core_audit_history(tenant_id,actor_user_id,actor,action,detail,project_id) SELECT ?,?,username,?,jsonb_build_object('snapshotId',CAST(? AS text)),? FROM core_user_account WHERE tenant_id=? AND user_id=?",tenant,actor,action,id.toString(),project,tenant,actor);}
    static Map<String,Object> packing(JsonNode cargo,JsonNode rule,EstimateInput request){
        String mode=mode(request.mode());var r=new LinkedHashMap<String,Object>();r.put("status","PRE_PACK");r.put("mode",mode);r.put("estimated",true);r.put("engineeringApproved",false);r.put("packingType",request.packingType());r.put("quantity",cargo.path("quantity").asInt());
        BigDecimal l,w,h,gw;
        if(mode.equals("MANUAL")){reason(request.reason());if(request.manual()==null)throw bad("수동 포장 치수와 중량을 입력하세요");l=request.manual().length();w=request.manual().width();h=request.manual().height();gw=request.manual().grossWeight();r.put("reason",request.reason());r.put("source","MANUAL_OVERRIDE");}
        else {
            if(!rule.isObject()){r.put("status","MISSING_PACKING_RULE");return r;}
            l=cargo.path("original_length").decimalValue();w=cargo.path("original_width").decimalValue();h=cargo.path("original_height").decimalValue();
            if(l.signum()<=0||w.signum()<=0||h.signum()<=0){r.put("status","MISSING_ORIGINAL_DIMENSIONS");return r;}
            String basis=rule.path("weight_basis").asText();gw=cargo.path(basis.equals("NET_WEIGHT")?"net_weight":"gross_weight").decimalValue();if(gw.signum()<=0){r.put("status","MISSING_WEIGHT");return r;}
            l=l.add(rule.path("allowance_length_mm").decimalValue());w=w.add(rule.path("allowance_width_mm").decimalValue());h=h.add(rule.path("allowance_height_mm").decimalValue());gw=gw.add(rule.path("tare_weight_kg").decimalValue());r.put("source","COMPANY_PACKING_RULE");r.put("ruleId",rule.path("id").asText());r.put("ruleVersion",rule.path("version").asLong());r.put("weightBasis",basis);r.put("formula","original mm + total allowance mm; per-piece base kg + tare kg");
        }
        amount(l,false,100000);amount(w,false,30000);amount(h,false,30000);amount(gw,false,1000000);if(gw.compareTo(cargo.path("net_weight").decimalValue())<0)throw bad("예상 총중량은 순중량보다 작을 수 없습니다");
        r.put("length",l);r.put("width",w);r.put("height",h);r.put("grossWeight",gw);r.put("cbmPerPiece",l.multiply(w).multiply(h).divide(BigDecimal.valueOf(1000000000),4,RoundingMode.HALF_UP));r.put("totalGrossWeight",gw.multiply(BigDecimal.valueOf(cargo.path("quantity").asInt())));return r;
    }
    static Map<String,Object> quotation(JsonNode plan,List<JsonNode> rates,QuoteInput request){
        currency(request.currency());String mode=mode(request.mode());var overrides=request.equipmentOverrides()==null?Map.<String,BigDecimal>of():request.equipmentOverrides();
        if(!overrides.isEmpty()){if(!mode.equals("MANUAL"))throw bad("수동 단가는 수동 모드에서 선택하세요");reason(request.reason());}overrides.forEach((k,v)->{if(k==null||!k.matches("[A-Z0-9_-]{1,30}"))throw bad("수동 장비 코드 오류");amount(v,true,1000000000000L);});
        BigDecimal packing=request.packingFee()==null?BigDecimal.ZERO:request.packingFee(),lashing=request.lashingFee()==null?BigDecimal.ZERO:request.lashingFee();amount(packing,true,1000000000000L);amount(lashing,true,1000000000000L);if(request.packingFee()!=null||request.lashingFee()!=null)reason(request.reason());
        var scenarios=new ArrayList<JsonNode>();if(plan.path("scenarios").isArray())plan.path("scenarios").forEach(scenarios::add);else scenarios.add(plan);var alternatives=new ArrayList<Map<String,Object>>();var usedCodes=new HashSet<String>();int index=0;
        for(var scenario:scenarios){if(!scenario.path("containers").isArray())throw bad("저장된 계획 장비 목록이 없습니다");var counts=new TreeMap<String,Integer>();for(var container:scenario.path("containers")){String code=container.path("equipment").asText();if(code.isBlank())throw bad("저장 장비 코드 오류");counts.merge(code,1,Integer::sum);usedCodes.add(code);}
            var lines=new ArrayList<Map<String,Object>>();var warnings=new ArrayList<String>();BigDecimal subtotal=BigDecimal.ZERO;boolean missing=false;
            for(var entry:counts.entrySet()){String code=entry.getKey();var line=new LinkedHashMap<String,Object>();line.put("equipmentCode",code);line.put("quantity",entry.getValue());line.put("currency",request.currency());BigDecimal unit;
                if(overrides.containsKey(code)){unit=overrides.get(code);line.put("source","MANUAL_OVERRIDE");line.put("reason",request.reason());}
                else {var sameCode=rates.stream().filter(v->v.path("equipment_code").asText().equals(code)).toList();var matching=sameCode.stream().filter(v->v.path("currency").asText().equals(request.currency())).toList();if(matching.isEmpty()){if(!sameCode.isEmpty())throw bad("통화가 다른 단가는 합산할 수 없습니다: "+code);line.put("status","MISSING_RATE");line.put("unitRate",null);line.put("amount",null);warnings.add("MISSING_RATE: "+code);missing=true;lines.add(line);continue;}if(matching.size()!=1)throw bad("단가 유효기간 중복: "+code);var rate=matching.getFirst();unit=rate.path("unit_rate").decimalValue();line.put("source","COMPANY_RATE");line.put("rateId",rate.path("id").asText());line.put("rateVersion",rate.path("version").asLong());}
                amount(unit,true,1000000000000L);BigDecimal total=unit.multiply(BigDecimal.valueOf(entry.getValue()));subtotal=subtotal.add(total);line.put("unitRate",unit);line.put("amount",total);line.put("status","PRICED");lines.add(line);
            }
            if(request.packingFee()==null)warnings.add("PACKING_FEE_NOT_PROVIDED");if(request.lashingFee()==null)warnings.add("LASHING_FEE_NOT_PROVIDED");if(scenario.path("unassigned").size()>0)warnings.add("UNASSIGNED_CARGO_EXCLUDED_FROM_EQUIPMENT_COST");
            var alt=new LinkedHashMap<String,Object>();alt.put("scenarioIndex",index++);alt.put("objective",scenario.path("objective").asText());alt.put("lines",lines);alt.put("equipmentQuantity",counts.values().stream().mapToInt(Integer::intValue).sum());alt.put("status",missing?"MISSING_RATE":"PRICED");alt.put("knownSubtotal",subtotal);alt.put("packingFee",packing);alt.put("lashingFee",lashing);alt.put("total",missing?null:subtotal.add(packing).add(lashing));alt.put("unassignedPieces",scenario.path("unassigned").size());alt.put("warnings",warnings);alternatives.add(alt);
        }
        if(!usedCodes.containsAll(overrides.keySet()))throw bad("저장 계획에 없는 장비 단가를 재정의할 수 없습니다");
        return Map.of("status","PRE_QUOTE","mode",mode,"currency",request.currency(),"alternatives",alternatives,"engineeringApproved",false,"notes",List.of("Alternatives are separate; never add scenario totals","Fees are per alternative; no exchange conversion; taxes and freight not included","Saved packing estimates do not overwrite cargo automatically"));
    }
    static String mode(String value){String result=value==null?"AUTO":value;if(!Set.of("AUTO","MANUAL").contains(result))throw bad("AUTO 또는 MANUAL 모드를 선택하세요");return result;}
    static void currency(String value){if(value==null||!value.matches("[A-Z]{3}"))throw bad("3자리 대문자 통화 코드를 입력하세요");}
    static void reason(String value){if(value==null||value.isBlank()||value.length()>1000)throw bad("수동 변경 또는 등록 근거가 필요합니다");}
    static void amount(BigDecimal value,boolean zero,long max){if(value==null||value.signum()<0||!zero&&value.signum()==0||value.compareTo(BigDecimal.valueOf(max))>0||value.scale()>4)throw bad("금액·치수·중량의 범위와 소수 자릿수를 확인하세요");}
    static ResponseStatusException bad(String value){return new ResponseStatusException(HttpStatus.BAD_REQUEST,value);}
}
