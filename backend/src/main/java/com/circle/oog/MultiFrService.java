package com.circle.oog;

import java.time.LocalDate;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MultiFrService {
    public record Manual(String equipmentCode,int rows,int columns){}
    public record Request(UUID cargoId,String carrier,LocalDate effectiveDate,Boolean allowDefaultFallback,Double gapMm,Manual manual,String reason){}
    public record Candidate(String equipmentCode,int rows,int columns,int equipmentCount,double usableDeckLength,double deckWidth,double combinedPayloadScreen,double arrayLength,double arrayWidth,long ruleVersion,boolean dimensionalScreen,boolean aggregateWeightScreen,String status,List<Map<String,Object>> equipmentArray){}
    private final JdbcTemplate jdbc;private final Cargos cargos;private final Equipments equipment;private final Rules rules;private final CarrierRuleService carriers;private final ObjectMapper json;
    public MultiFrService(JdbcTemplate jdbc,Cargos cargos,Equipments equipment,Rules rules,CarrierRuleService carriers,ObjectMapper json){this.jdbc=jdbc;this.cargos=cargos;this.equipment=equipment;this.rules=rules;this.carriers=carriers;this.json=json;}
    public Map<String,Object> preview(UUID project,Request request){return calculate(project,request);}
    private Map<String,Object> calculate(UUID project,Request request){
        long tenant=VerifiedActor.tenantId();if(jdbc.queryForObject("select count(*) from oog_project where id=? and tenant_id=?",Long.class,project,tenant)==0)throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        if(request==null||request.cargoId()==null||request.gapMm()!=null&&(!Double.isFinite(request.gapMm())||request.gapMm()<0||request.gapMm()>5000))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"화물 및 간격(0~5000mm)을 확인하세요");
        Cargo cargo=cargos.findById(request.cargoId()).filter(c->c.projectId.equals(project)).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
        var eq=equipment.findAll().stream().filter(e->Set.of("20FR","40FR").contains(e.code)).toList();
        var selection=carriers.resolve(tenant,request.carrier()==null?"DEFAULT":request.carrier(),request.effectiveDate()==null?LocalDate.now():request.effectiveDate(),!Boolean.FALSE.equals(request.allowDefaultFallback()),eq,rules.findAll());
        double gap=request.gapMm()==null?0:request.gapMm();var auto=new ArrayList<Candidate>();boolean single=false;
        for(var e:eq){var r=selection.rules().stream().filter(v->v.equipmentCode.equals(e.code)).findFirst().orElseThrow();
            boolean orientation=cargo.length<=e.length*r.usableLengthRatio&&cargo.width<=e.width+r.maxOverWidth||cargo.rotationAllowed&&cargo.width<=e.length*r.usableLengthRatio&&cargo.length<=e.width+r.maxOverWidth;
            single|=orientation&&cargo.height<=e.height+r.maxOverHeight&&cargo.grossWeight<=e.payload*r.planningWeightRatio;
            int rows=(int)Math.ceil(cargo.length/(e.length*r.usableLengthRatio)),cols=(int)Math.ceil(cargo.width/e.width);while((long)rows*cols<=32&&cargo.grossWeight>(long)rows*cols*e.payload*r.planningWeightRatio)rows++;
            if((long)rows*cols>=2&&(long)rows*cols<=32)auto.add(candidate(cargo,e,r,rows,cols,gap));
        }
        auto.sort(Comparator.comparingInt(Candidate::equipmentCount));Candidate manual=null;
        // Screening lower bounds do not establish support reactions or a viable bridge across gaps.
        if(request.manual()!=null){var m=request.manual();var e=eq.stream().filter(v->v.code.equals(m.equipmentCode())).findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.BAD_REQUEST,"20FR/40FR만 선택할 수 있습니다"));var r=selection.rules().stream().filter(v->v.equipmentCode.equals(e.code)).findFirst().orElseThrow();manual=candidate(cargo,e,r,m.rows(),m.columns(),gap);}
        var result=new LinkedHashMap<String,Object>();result.put("status","PRE_PLAN");result.put("engineeringRequired",true);result.put("singleFrAvailable",single);result.put("scope","PER_PIECE_PRELIMINARY_ARRAY_SCREEN");result.put("cargo",cargo);result.put("ruleSelection",selection.ruleSelection());result.put("rules",selection.rules());result.put("equipment",eq);result.put("automaticCandidates",single?List.of():auto);result.put("manualSelection",manual);result.put("gapMm",gap);result.put("gapConfirmed",request.gapMm()!=null);result.put("supportPoints","NOT_PROVIDED");result.put("centerOfGravity","NOT_PROVIDED");result.put("supportReaction","NOT_CALCULABLE");result.put("candidateLimit",32);result.put("calculationBasis","Rows=ceil(cargoLength/usableDeckLength), columns=ceil(cargoWidth/deckWidth); increase rows for aggregate payload necessary condition, cap 32. Gap is excluded from usable deck coverage. No reaction or support feasibility calculation.");result.put("warnings",List.of("배열 치수 및 합산 payload는 필요조건 사전검토이며 적재 가능 또는 공학 승인을 뜻하지 않습니다.","간격은 지지 없는 구간입니다. 연속 deck 면적이나 균등 하중 분담을 가정할 수 없습니다.","지지점, CoG, Contact Area, Point Load, 하중분포, 라싱, 선사 승인 미검증. 치수 방향은 원입력 기준이며 횡배열은 제안입니다.","개당 검토이며 동일 화물 수량 전체 선적 장비 대수를 뜻하지 않습니다."));return result;
    }
    static Candidate candidate(Cargo c,Equipment e,PlanningRule r,int rows,int cols,double gap){
        if(rows<1||cols<1||(long)rows*cols<2||(long)rows*cols>32)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"장비 배열은 총 2~32대입니다");
        double length=e.length*r.usableLengthRatio;boolean dimension=c.length<=rows*length&&c.width<=cols*e.width&&c.height<=e.height+r.maxOverHeight;boolean weight=c.grossWeight<=rows*cols*e.payload*r.planningWeightRatio;
        var array=new ArrayList<Map<String,Object>>();for(int row=0;row<rows;row++)for(int col=0;col<cols;col++)array.add(Map.of("number",array.size()+1,"equipmentCode",e.code,"x",row*(e.length+gap),"y",col*(e.width+gap),"length",e.length,"width",e.width));
        return new Candidate(e.code,rows,cols,rows*cols,length,e.width,rows*cols*e.payload*r.planningWeightRatio,rows*e.length+(rows-1)*gap,cols*e.width+(cols-1)*gap,r.version,dimension,weight,dimension&&weight?"NECESSARY_SCREEN_ONLY":"SCREEN_INSUFFICIENT",array);
    }
    @Transactional(rollbackFor=Exception.class) public Map<String,Object> save(UUID project,Request request)throws Exception {
        if(request==null||request.reason()==null||request.reason().isBlank()||request.reason().length()>1000)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"검토 저장 사유가 필요합니다");
        var result=calculate(project,request);UUID id=UUID.randomUUID();var actor=VerifiedActor.current();jdbc.update("insert into oog_multi_fr_review(id,project_id,tenant_id,cargo_id,input_snapshot,result,reason,created_by) values(?,?,?,?,cast(? as jsonb),cast(? as jsonb),?,?)",id,project,actor.getTenantId(),request.cargoId(),json.writeValueAsString(request),json.writeValueAsString(result),request.reason(),actor.getUserId());jdbc.update("insert into core_audit_history(project_id,tenant_id,actor_user_id,action,actor,detail) values(?,?,?,'MULTIFR_REVIEW_SAVED',?,cast(? as jsonb))",project,actor.getTenantId(),actor.getUserId(),actor.getName(),json.writeValueAsString(Map.of("reviewId",id)));return Map.of("id",id,"result",result);
    }
    public Object history(UUID project,int page){if(page<0||page>1000000)throw new ResponseStatusException(HttpStatus.BAD_REQUEST);return jdbc.query("select id,result::text,reason,created_at from oog_multi_fr_review where project_id=? and tenant_id=? order by created_at desc limit 20 offset ?",(rs,n)->{try{return Map.of("id",rs.getObject("id"),"result",json.readTree(rs.getString("result")),"reason",rs.getString("reason"),"createdAt",rs.getTimestamp("created_at").toInstant());}catch(Exception ex){throw new IllegalStateException(ex);}},project,VerifiedActor.tenantId(),(long)page*20);}
}
