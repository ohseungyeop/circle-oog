package com.circle.oog;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.*;

/** Auditable rigid-body/contact and elastic beam models, not a transport certificate. */
public final class ExpandedEngineeringService {
    public static final String MODEL="OOG-ROUTE-RIGIDPAD-BEAM-2.0";
    private static final double G=9.81, EPS=1e-8;
    public record Point(Double xMm,Double yMm,Double zMm) {}
    public record Footprint(Double minXmm,Double maxXmm,Double minYmm,Double maxYmm,Double planeZmm,String evidence) {}
    public record Pad(String id,Double xMm,Double yMm,Double stiffnessKnPerMm,Double areaMm2,Double allowablePressureMpa,Double capacityKn) {}
    public record Coefficients(Double forward,Double backward,Double left,Double right,Double verticalLongitudinal,Double verticalTransverse) {}
    public record Leg(String id,String profile,String evidence,Boolean conditionsConfirmed,Double supportVerticalCoefficient,String supportEvidence,Coefficients custom) {}
    public record Lashing(String id,String legId,String direction,Integer count,Double capacityKn,Double tensionKn,Point attachment,Point anchor,String evidence) {}
    public record Beam(String id,List<String> padIds,String axis,Double startMm,Double endMm,Double elasticModulusMpa,Double inertiaMm4,Double sectionModulusMm3,Double shearAreaMm2,Double allowableBendingMpa,Double allowableShearMpa,Double allowableDeflectionMm,Double endReactionCapacityKn,Boolean theoryApplicable,String evidence) {}
    public record Input(UUID cargoId,String sourceMode,String inputEvidence,String reason,Double weightKg,Double cogXmm,Double cogYmm,Double cogZmm,Double frictionCoefficient,Boolean routeCompleteConfirmed,Boolean externalLoadsReviewed,String externalLoadsEvidence,Footprint footprint,List<Pad> pads,List<Leg> legs,List<Lashing> lashings,List<Beam> beams) {}
    private ExpandedEngineeringService() {}

    public static List<Map<String,Object>> profiles() {
        var result=new ArrayList<Map<String,Object>>();
        for(String key:List.of("ROAD","RAIL_COMBINED","SEA_A","SEA_B","SEA_C"))result.add(Map.of("profile",key,"coefficients",coefficients(key,null),"source","CTU Code 2014 Chapter 5 §5.3","requiresConfirmation",true));
        return result;
    }
    static Coefficients coefficients(String key,Coefficients custom) {
        return switch(Objects.toString(key,"")) {
            case "ROAD" -> new Coefficients(.8,.5,.5,.5,1d,1d);
            case "RAIL_COMBINED" -> new Coefficients(.5,.5,.5,.5,1d,1d);
            case "SEA_A" -> new Coefficients(.3,.3,.5,.5,.5,1d);
            case "SEA_B" -> new Coefficients(.3,.3,.7,.7,.3,1d);
            case "SEA_C" -> new Coefficients(.4,.4,.8,.8,.2,1d);
            case "CUSTOM" -> custom;
            default -> throw bad("운송 구간의 기준을 선택하세요");
        };
    }
    private static final List<String> DIRECTIONS=List.of("FORWARD","BACKWARD","LEFT","RIGHT");
    public static Map<String,Object> calculate(Input v,JsonNode cargo) {
        if(v==null||v.cargoId()==null)throw bad("저장 계획 화물을 선택하세요");
        if(!Set.of("CONFIRMED","ESTIMATED").contains(Objects.toString(v.sourceMode(),"")))throw bad("입력 확인/추정 구분이 필요합니다");
        text(v.reason(),"계산 목적");
        var missing=new LinkedHashSet<String>();
        evidence(v.inputEvidence(),"INPUT_EVIDENCE",missing);
        if(!Boolean.TRUE.equals(v.routeCompleteConfirmed()))missing.add("FULL_ROUTE_CONFIRMATION");
        if(!Boolean.TRUE.equals(v.externalLoadsReviewed()))missing.add("EXTERNAL_LOADS_REVIEW");
        evidence(v.externalLoadsEvidence(),"EXTERNAL_LOADS_EVIDENCE",missing);
        number(v.weightKg(),.000001,1000000,"weightKg");number(v.cogXmm(),0,100000,"cogXmm");number(v.cogYmm(),0,30000,"cogYmm");number(v.cogZmm(),0,30000,"cogZmm");number(v.frictionCoefficient(),0,1,"frictionCoefficient");
        if(v.weightKg()==null||v.cogXmm()==null||v.cogYmm()==null||v.cogZmm()==null||v.frictionCoefficient()==null)missing.add("MASS_COG_FRICTION");
        if(v.cogXmm()!=null&&v.cogXmm()>cargo.path("length").asDouble()||v.cogYmm()!=null&&v.cogYmm()>cargo.path("width").asDouble()||v.cogZmm()!=null&&v.cogZmm()>cargo.path("height").asDouble())throw bad("CoG가 저장된 화물 외형을 벗어납니다");
        Footprint f=v.footprint();
        if(f==null)missing.add("SUPPORT_FOOTPRINT");
        else {
            number(f.minXmm(),0,cargo.path("length").asDouble(),"footprint.minXmm");number(f.maxXmm(),0,cargo.path("length").asDouble(),"footprint.maxXmm");number(f.minYmm(),0,cargo.path("width").asDouble(),"footprint.minYmm");number(f.maxYmm(),0,cargo.path("width").asDouble(),"footprint.maxYmm");number(f.planeZmm(),0,cargo.path("height").asDouble(),"footprint.planeZmm");
            if(f.minXmm()==null||f.maxXmm()==null||f.minYmm()==null||f.maxYmm()==null||f.planeZmm()==null)missing.add("SUPPORT_FOOTPRINT_GEOMETRY");
            else if(f.maxXmm()-f.minXmm()<1||f.maxYmm()-f.minYmm()<1||v.cogZmm()!=null&&v.cogZmm()<f.planeZmm())throw bad("지지 사각형과 지지면 높이를 확인하세요");
            evidence(f.evidence(),"FOOTPRINT_EVIDENCE",missing);
        }
        List<Pad> pads=v.pads()==null?List.of():v.pads();List<Leg> legs=v.legs()==null?List.of():v.legs();List<Lashing> lashings=v.lashings()==null?List.of():v.lashings();List<Beam> beams=v.beams()==null?List.of():v.beams();
        if(pads.stream().anyMatch(Objects::isNull)||legs.stream().anyMatch(Objects::isNull)||lashings.stream().anyMatch(Objects::isNull)||beams.stream().anyMatch(Objects::isNull))throw bad("빈 목록 항목을 제거하세요");
        if(pads.size()<3)missing.add("AT_LEAST_THREE_NONCOLLINEAR_PADS");if(pads.size()>12||legs.size()>8||lashings.size()>64||beams.size()>12)throw bad("패드12·구간8·라싱64·보12개 한도를 확인하세요");if(legs.isEmpty())missing.add("ROUTE_LEGS");if(beams.isEmpty())missing.add("STRUCTURAL_BEAMS");
        var padIds=new HashSet<String>();var coordinates=new HashSet<String>();
        for(Pad p:pads){identifier(p.id(),padIds,"패드");if(p.xMm()!=null&&p.yMm()!=null&&!coordinates.add(p.xMm()+":"+p.yMm()))throw bad("동일 좌표 패드를 중복 등록할 수 없습니다");number(p.xMm(),0,100000,"pad.x");number(p.yMm(),0,30000,"pad.y");number(p.stiffnessKnPerMm(),.000001,1000000000,"pad.stiffness");number(p.areaMm2(),.000001,1000000000,"pad.area");number(p.allowablePressureMpa(),.000001,100000,"pad.pressure");number(p.capacityKn(),.000001,1000000,"pad.capacity");if(p.xMm()==null||p.yMm()==null||p.stiffnessKnPerMm()==null||p.areaMm2()==null||p.allowablePressureMpa()==null||p.capacityKn()==null)missing.add("PAD_INPUT:"+p.id());else if(f!=null&&f.minXmm()!=null&&f.maxXmm()!=null&&f.minYmm()!=null&&f.maxYmm()!=null&&(p.xMm()<f.minXmm()||p.xMm()>f.maxXmm()||p.yMm()<f.minYmm()||p.yMm()>f.maxYmm()))throw bad("패드는 선언한 지지 사각형 안에 있어야 합니다");}
        var legIds=new HashSet<String>();
        for(Leg l:legs){identifier(l.id(),legIds,"구간");var c=coefficients(l.profile(),l.custom());if(c==null)missing.add("CUSTOM_COEFFICIENTS:"+l.id());else{for(Double n:Arrays.asList(c.forward(),c.backward(),c.left(),c.right()))number(n,0,5,"horizontalCoefficient");number(c.verticalLongitudinal(),.000001,5,"verticalLongitudinal");number(c.verticalTransverse(),.000001,5,"verticalTransverse");if(Arrays.asList(c.forward(),c.backward(),c.left(),c.right(),c.verticalLongitudinal(),c.verticalTransverse()).contains(null))missing.add("COEFFICIENTS:"+l.id());}
            number(l.supportVerticalCoefficient(),.000001,5,"supportVerticalCoefficient");if(l.supportVerticalCoefficient()==null)missing.add("MAXIMUM_COMPRESSION_COEFFICIENT:"+l.id());else if(c!=null&&c.verticalLongitudinal()!=null&&c.verticalTransverse()!=null&&l.supportVerticalCoefficient()<Math.max(c.verticalLongitudinal(),c.verticalTransverse()))throw bad("지지 압축 검토 계수는 해당 구간의 최소 법선력 계수보다 작을 수 없습니다");
            if(!Boolean.TRUE.equals(l.conditionsConfirmed()))missing.add("PROFILE_CONDITIONS:"+l.id());evidence(l.evidence(),"ROUTE_EVIDENCE:"+l.id(),missing);evidence(l.supportEvidence(),"MAXIMUM_COMPRESSION_EVIDENCE:"+l.id(),missing);
        }
        var lashIds=new HashSet<String>();
        for(Lashing l:lashings){identifier(l.id(),lashIds,"라싱");if(!legIds.contains(l.legId())||!DIRECTIONS.contains(l.direction()))throw bad("라싱 구간과 방향을 확인하세요");if(l.count()==null||l.count()<1||l.count()>1000)throw bad("라싱 수량은 1~1000입니다");number(l.capacityKn(),.000001,1000000,"lashing.capacity");number(l.tensionKn(),0,1000000,"lashing.tension");if(l.capacityKn()==null||l.tensionKn()==null||l.attachment()==null||l.anchor()==null)missing.add("LASHING_INPUT:"+l.id());else{point(l.attachment());point(l.anchor());if(l.attachment().xMm()<0||l.attachment().xMm()>cargo.path("length").asDouble()||l.attachment().yMm()<0||l.attachment().yMm()>cargo.path("width").asDouble()||l.attachment().zMm()<0||l.attachment().zMm()>cargo.path("height").asDouble())throw bad("라싱 화물 부착점이 저장 외형을 벗어납니다");if(l.tensionKn()>l.capacityKn())throw bad("지지 반력에 사용할 실제 설계 장력은 유효 용량 이하여야 합니다");}evidence(l.evidence(),"LASHING_EVIDENCE:"+l.id(),missing);}
        var beamIds=new HashSet<String>();var covered=new HashSet<String>();
        for(Beam b:beams){identifier(b.id(),beamIds,"보");if(!Set.of("X","Y").contains(Objects.toString(b.axis(),"")))throw bad("보 축은 X 또는 Y입니다");if(b.padIds()==null||b.padIds().isEmpty())missing.add("BEAM_PADS:"+b.id());else for(String id:b.padIds())if(!padIds.contains(id)||!covered.add(id))throw bad("모든 패드는 정확히 하나의 보 하중 경로에 연결되어야 합니다");
            number(b.startMm(),-100000,100000,"beam.start");number(b.endMm(),-100000,100000,"beam.end");number(b.elasticModulusMpa(),.000001,10000000,"beam.E");number(b.inertiaMm4(),.000001,1e18,"beam.I");number(b.sectionModulusMm3(),.000001,1e15,"beam.Z");number(b.shearAreaMm2(),.000001,1e12,"beam.shearArea");number(b.allowableBendingMpa(),.000001,1000000,"beam.bendingLimit");number(b.allowableShearMpa(),.000001,1000000,"beam.shearLimit");number(b.allowableDeflectionMm(),.000001,10000,"beam.deflectionLimit");number(b.endReactionCapacityKn(),.000001,1000000,"beam.endCapacity");
            if(Arrays.asList(b.startMm(),b.endMm(),b.elasticModulusMpa(),b.inertiaMm4(),b.sectionModulusMm3(),b.shearAreaMm2(),b.allowableBendingMpa(),b.allowableShearMpa(),b.allowableDeflectionMm(),b.endReactionCapacityKn()).contains(null))missing.add("BEAM_INPUT:"+b.id());else if(b.endMm()-b.startMm()<1)throw bad("보 경간은 1mm 이상이어야 합니다");if(!Boolean.TRUE.equals(b.theoryApplicable()))missing.add("BEAM_THEORY_CONFIRMATION:"+b.id());evidence(b.evidence(),"BEAM_EVIDENCE:"+b.id(),missing);
        }
        if(!covered.equals(padIds))missing.add("ALL_PADS_STRUCTURAL_LOAD_PATH");
        var cases=new ArrayList<Map<String,Object>>();boolean allPass=false;
        // Evidence-only omissions block approval but allow complete numeric models to run.
        boolean geometryReady=v.weightKg()!=null&&v.cogXmm()!=null&&v.cogYmm()!=null&&v.cogZmm()!=null&&v.frictionCoefficient()!=null&&f!=null&&f.minXmm()!=null&&f.maxXmm()!=null&&f.minYmm()!=null&&f.maxYmm()!=null&&f.planeZmm()!=null&&pads.size()>=3;
        boolean numbersReady=missing.stream().noneMatch(k->k.startsWith("PAD_INPUT")||k.startsWith("BEAM_INPUT")||k.startsWith("BEAM_PADS")||k.startsWith("LASHING_INPUT")||k.startsWith("COEFFICIENTS")||k.startsWith("CUSTOM_COEFFICIENTS")||k.startsWith("MAXIMUM_COMPRESSION_COEFFICIENT"));
        if(geometryReady&&numbersReady&&!legs.isEmpty()&&!beams.isEmpty()&&covered.equals(padIds)){
            allPass=true;
            for(Leg l:legs)for(String direction:DIRECTIONS){var c=coefficients(l.profile(),l.custom());double ch=switch(direction){case "FORWARD"->c.forward();case "BACKWARD"->c.backward();case "LEFT"->c.left();default->c.right();};boolean x=direction.equals("FORWARD")||direction.equals("BACKWARD");double cz=x?c.verticalLongitudinal():c.verticalTransverse();
                var selected=lashings.stream().filter(a->a.legId().equals(l.id())&&a.direction().equals(direction)).toList();
                var item=loadCase(v,l,direction,ch,cz,selected,pads,beams);cases.add(item);allPass&=Boolean.TRUE.equals(item.get("withinDeclaredLimits"));
            }
        }
        boolean massMatches=v.weightKg()!=null&&cargo.path("grossWeight").asDouble()>0&&Math.abs(v.weightKg()-cargo.path("grossWeight").asDouble())<=1e-6;
        boolean eligible=missing.isEmpty()&&allPass&&massMatches&&"CONFIRMED".equals(v.sourceMode());
        var out=new LinkedHashMap<String,Object>();out.put("modelVersion",MODEL);out.put("sourceMode",v.sourceMode());out.put("status",!missing.isEmpty()?"INCOMPLETE":!allPass?"FAILED_DECLARED_LIMITS":!massMatches?"MASS_MISMATCH_REQUIRES_NEW_PLAN":"CONFIRMED".equals(v.sourceMode())?"CALCULATED_REQUIRES_REVIEW":"ESTIMATED_REQUIRES_CONFIRMATION");out.put("missingInputs",missing);out.put("loadCases",cases);out.put("eligibleForInternalApproval",eligible);out.put("massMatchesSavedCargo",massMatches);out.put("savedGrossWeightKg",cargo.path("grossWeight").asDouble());out.put("approved",false);out.put("carrierApproved",false);out.put("planStatus","PRE_PLAN");
        out.put("scope",List.of("Every declared route leg, four horizontal directions separately","Minimum normal-load and declared maximum compression envelopes","Rigid coplanar body on compression-only linear elastic pads","Direct homogeneous lashing groups with declared effective weakest-link capacity and concurrent tension","Simply supported constant EI beams under pad point loads"));
        out.put("excludedChecks",List.of("TIME_HISTORY_OR_MODAL_DYNAMIC_RESPONSE","FLEXIBLE_CARGO_OR_CTU_CONTACT","LASHING_ELASTIC_LOAD_SHARING_OR_PRETENSION_SOLVER","BEAM_BUCKLING_TORSION_CONNECTION_LOCAL_BEARING_FATIGUE","WIND_SEA_IMPACT_UPLIFT_OTHER_EXTERNAL_LOADS","CARRIER_APPROVAL_OR_ENTIRE_CTU_CSS_CERTIFICATION","VIBRATION_MIGRATION_RESTRAINT_DESIGN","BEAM_PAD_CROSS_COUPLING_OR_GRILLAGE"));
        out.put("warnings",List.of("PROFILE_IS_CTU_2014_NOT_SHIP_SPECIFIC_CSS_ANNEX13","MIN_NORMAL_FORCE_COEFFICIENT_IS_NOT_MAX_COMPRESSION","ACTUAL_TENSION_AND_STIFFNESS_REQUIRE_EVIDENCE","OTHER_EXTERNAL_LOADS_AND_STRUCTURAL_MODES_REQUIRE_DOCUMENTED_EXTERNAL_REVIEW","PRE_PLAN_REMAINS_WITH_INTERNAL_APPROVAL","FRICTION_SUFFICIENCY_DOES_NOT_REPLACE_VIBRATION_MIGRATION_RESTRAINT","PAD_SPRINGS_ARE_DECLARED_DIAGONAL_COMPLIANCE_NOT_COUPLED_BEAM_FEM"));
        out.put("sources",List.of("https://wiki.unece.org/spaces/TransportSustainableCTUCode/pages/23101848/Chapter+5.+General+transport+conditions","https://www.ilo.org/sites/default/files/wcmsp5/groups/public/@ed_dialogue/@sector/documents/publication/wcms_492710.pdf","https://ocw.mit.edu/courses/16-01-unified-engineering-i-ii-iii-iv-fall-2005-spring-2006/"));
        out.put("publicGuidanceSources",PublishedCarrierGuidance.sources());
        return out;
    }

    private static Map<String,Object> loadCase(Input v,Leg leg,String direction,double ch,double cz,List<Lashing> lashings,List<Pad> pads,List<Beam> beams) {
        boolean x=direction.equals("FORWARD")||direction.equals("BACKWARD");double sign=direction.equals("FORWARD")||direction.equals("RIGHT")?1:-1;
        Footprint f=v.footprint();double edge=x?(sign>0?f.maxXmm():f.minXmm()):(sign>0?f.maxYmm():f.minYmm());double cg=x?v.cogXmm():v.cogYmm(),height=v.cogZmm()-f.planeZmm(),b=sign*(edge-cg),weight=v.weightKg()*G/1000;
        double capacity=0,resistingMoment=0;var forces=new ArrayList<double[]>();
        for(Lashing l:lashings){Point a=l.attachment(),t=l.anchor();double[] u=unit(t.xMm()-a.xMm(),t.yMm()-a.yMm(),t.zMm()-a.zMm());if(a.xMm()<0||a.yMm()<0||a.zMm()<f.planeZmm()||a.xMm()>100000||a.yMm()>30000||a.zMm()>30000||t.zMm()>f.planeZmm())throw bad("라싱 부착점과 아래쪽 CTU 고정점 좌표를 확인하세요");double projection=-sign*(x?u[0]:u[1]);if(projection<=0)throw bad("직접 라싱은 지정한 이동 방향에 반대 저항해야 합니다");double cap=l.count()*l.capacityKn();capacity+=cap*projection;double r=sign*((x?a.xMm():a.yMm())-edge);resistingMoment+=cap*(-(a.zMm()-f.planeZmm())*sign*(x?u[0]:u[1])+r*u[2])/1000;
            double tension=l.count()*l.tensionKn();forces.add(new double[]{a.xMm(),a.yMm(),a.zMm()-f.planeZmm(),tension*u[0],tension*u[1],tension*u[2]});
        }
        double external=weight*ch,normal=weight*cz,slidingDemand=Math.max(0,external-v.frictionCoefficient()*normal);double overturn=external*height/1000,restoring=normal*b/1000,tippingMargin=restoring+resistingMoment-overturn;
        boolean sliding=capacity+EPS>=slidingDemand,tipping=tippingMargin>EPS; // equality requires additional securing per Annex7 §4.3.1
        var supportCases=new ArrayList<Map<String,Object>>();boolean supportPass=true;
        for(double cv:cz==leg.supportVerticalCoefficient()?new double[]{cz}:new double[]{cz,leg.supportVerticalCoefficient()}){
            double n=weight*cv,mx=n*v.cogXmm()+(x?sign*external*height:0),my=n*v.cogYmm()+(!x?sign*external*height:0),netFx=x?sign*external:0,netFy=x?0:sign*external,netYaw=0;
            for(double[] q:forces){n-=q[5];mx+=q[2]*q[3]-q[0]*q[5];my+=q[2]*q[4]-q[1]*q[5];netFx+=q[3];netFy+=q[4];netYaw+=(q[0]-v.cogXmm())*q[4]-(q[1]-v.cogYmm())*q[3];}
            boolean tensionEquilibrium=Math.hypot(netFx,netFy)<=v.frictionCoefficient()*n+EPS;
            var padResult=solvePads(pads,n,mx,my);boolean okay=Boolean.TRUE.equals(padResult.get("withinDeclaredLimits"))&&tensionEquilibrium;var beamResults=new ArrayList<Map<String,Object>>();
            Map<String,Object> friction=Map.of("feasible",false,"status","NORMAL_CONTACT_NOT_SOLVED");
            if(Boolean.TRUE.equals(padResult.get("equilibriumFound"))){@SuppressWarnings("unchecked")var rows=(List<Map<String,Object>>)padResult.get("pads");friction=solveFriction(pads,rows,v.frictionCoefficient(),netFx,netFy,netYaw,v.cogXmm(),v.cogYmm());okay&=Boolean.TRUE.equals(friction.get("feasible"));for(Beam beam:beams){var result=beam(beam,pads,rows);beamResults.add(result);okay&=Boolean.TRUE.equals(result.get("withinDeclaredLimits"));}}
            else okay=false;
            var r=new LinkedHashMap<String,Object>();r.put("verticalCoefficient",cv);r.put("forceKn",n);r.put("momentXCoordinateKnMm",mx);r.put("momentYCoordinateKnMm",my);r.put("declaredTensionsInEquilibrium",tensionEquilibrium);r.put("frictionAllocation",friction);r.put("pads",padResult);r.put("beams",beamResults);r.put("withinDeclaredLimits",okay);supportCases.add(r);supportPass&=okay;
        }
        var result=new LinkedHashMap<String,Object>();result.put("legId",leg.id());result.put("profile",leg.profile());result.put("direction",direction);result.put("horizontalCoefficient",ch);result.put("minimumVerticalCoefficient",cz);result.put("externalForceKn",external);result.put("slidingDemandKn",slidingDemand);result.put("slidingCapacityKn",capacity);result.put("slidingMarginKn",capacity-slidingDemand);result.put("tippingAxisMm",edge);result.put("cogToTippingAxisMm",b);result.put("overturningMomentKnM",overturn);result.put("gravityRestoringMomentKnM",restoring);result.put("lashingRestoringMomentKnM",resistingMoment);result.put("tippingMarginKnM",tippingMargin);result.put("unlashedTippingSecuringRequired",ch*height>=cz*b);result.put("slidingWithinLimits",sliding);result.put("tippingWithinLimits",tipping);result.put("supportCases",supportCases);result.put("withinDeclaredLimits",sliding&&tipping&&supportPass);
        return result;
    }

    /** Enumerates all <=4096 contact sets and checks both active and inactive complementarity. */
    static Map<String,Object> solvePads(List<Pad> pads,double n,double mx,double my) {
        double refX=pads.stream().mapToDouble(Pad::xMm).average().orElse(0),refY=pads.stream().mapToDouble(Pad::yMm).average().orElse(0),scale=1;
        for(Pad p:pads)scale=Math.max(scale,Math.max(Math.abs(p.xMm()-refX),Math.abs(p.yMm()-refY)));
        double[] rhs={n,(mx-refX*n)/scale,(my-refY*n)/scale};double tolerance=1e-7*Math.max(1,Math.abs(n));double[] solution=null;int chosen=0;
        for(int trial=0;trial<(1<<pads.size())-1;trial++){int mask=trial==0?(1<<pads.size())-1:trial;if(Integer.bitCount(mask)<3)continue;double[][] a=new double[3][3];for(int i=0;i<pads.size();i++)if((mask&(1<<i))!=0){Pad p=pads.get(i);double[] q={1,(p.xMm()-refX)/scale,(p.yMm()-refY)/scale};for(int j=0;j<3;j++)for(int k=0;k<3;k++)a[j][k]+=p.stiffnessKnPerMm()*q[j]*q[k];}double[] d=solve3(a,rhs);if(d==null)continue;boolean valid=true;for(int i=0;i<pads.size();i++){Pad p=pads.get(i);double reaction=p.stiffnessKnPerMm()*(d[0]+d[1]*(p.xMm()-refX)/scale+d[2]*(p.yMm()-refY)/scale);if((mask&(1<<i))!=0?reaction<-tolerance:reaction>tolerance){valid=false;break;}}if(valid){solution=d;chosen=mask;break;}}
        if(solution==null)return Map.of("equilibriumFound",false,"withinDeclaredLimits",false,"status","NO_STABLE_COMPRESSION_ONLY_EQUILIBRIUM","pads",List.of());
        var rows=new ArrayList<Map<String,Object>>();double sum=0,sumX=0,sumY=0;boolean pass=true;
        double slope=Math.hypot(solution[1]/scale,solution[2]/scale);if(slope>.01)pass=false;
        for(int i=0;i<pads.size();i++){Pad p=pads.get(i);double delta=solution[0]+solution[1]*(p.xMm()-refX)/scale+solution[2]*(p.yMm()-refY)/scale,r=(chosen&(1<<i))==0?0:Math.max(0,p.stiffnessKnPerMm()*delta),pressure=r*1000/p.areaMm2();boolean okay=r<=p.capacityKn()+EPS&&pressure<=p.allowablePressureMpa()+EPS;pass&=okay;sum+=r;sumX+=r*p.xMm();sumY+=r*p.yMm();var row=new LinkedHashMap<String,Object>();row.put("id",p.id());row.put("reactionKn",r);row.put("pressureMpa",pressure);row.put("compressionMm",delta);row.put("inContact",(chosen&(1<<i))!=0);row.put("withinDeclaredLimits",okay);row.put("reactionUtilization",r/p.capacityKn());row.put("pressureUtilization",pressure/p.allowablePressureMpa());row.put("capacityKn",p.capacityKn());row.put("allowablePressureMpa",p.allowablePressureMpa());rows.add(row);}
        double forceResidual=sum-n,mxResidual=sumX-mx,myResidual=sumY-my;pass&=Math.abs(forceResidual)<=tolerance&&Math.abs(mxResidual)<=tolerance*scale&&Math.abs(myResidual)<=tolerance*scale;
        return Map.of("equilibriumFound",true,"withinDeclaredLimits",pass,"status",pass?"WITHIN_DECLARED_LIMITS":"FAILED_DECLARED_LIMITS","pads",rows,"forceResidualKn",forceResidual,"momentXResidualKnMm",mxResidual,"momentYResidualKnMm",myResidual,"rigidBodySlope",slope,"smallRotationLimit",.01);
    }
    static double[] solve3(double[][] matrix,double[] rhs){double[][] a=new double[3][4];double max=0;for(int i=0;i<3;i++){for(int j=0;j<3;j++){a[i][j]=matrix[i][j];max=Math.max(max,Math.abs(a[i][j]));}a[i][3]=rhs[i];}if(max==0)return null;for(int k=0;k<3;k++){int pivot=k;for(int i=k+1;i<3;i++)if(Math.abs(a[i][k])>Math.abs(a[pivot][k]))pivot=i;if(Math.abs(a[pivot][k])<max*1e-12)return null;double[] swap=a[k];a[k]=a[pivot];a[pivot]=swap;double div=a[k][k];for(int j=k;j<4;j++)a[k][j]/=div;for(int i=0;i<3;i++)if(i!=k){double mult=a[i][k];for(int j=k;j<4;j++)a[i][j]-=mult*a[k][j];}}return new double[]{a[0][3],a[1][3],a[2][3]};}

    /** Dykstra projections: affine Fx/Fy/Mz equilibrium intersected with per-pad Coulomb disks.
     * A positive result includes a checked primal witness. Exhaustion is NOT an infeasibility proof. */
    static Map<String,Object> solveFriction(List<Pad> pads,List<Map<String,Object>> reactions,double mu,double fx,double fy,double yaw,double cogX,double cogY){
        int count=pads.size(),size=count*2;double scale=1,totalCapacity=0,yawCapacity=0;double[] caps=new double[count];
        for(int i=0;i<count;i++){Pad p=pads.get(i);scale=Math.max(scale,Math.hypot(p.xMm()-cogX,p.yMm()-cogY));caps[i]=mu*((Number)reactions.get(i).get("reactionKn")).doubleValue();totalCapacity+=caps[i];yawCapacity+=caps[i]*Math.hypot(p.xMm()-cogX,p.yMm()-cogY);}
        if(Math.hypot(fx,fy)>totalCapacity+1e-8||Math.abs(yaw)>yawCapacity+1e-5)return Map.of("feasible",false,"status","NECESSARY_FRICTION_BOUND_EXCEEDED","optimalityCertified",false);
        double[][] a=new double[3][size],gram=new double[3][3];double[] target={-fx,-fy,-yaw/scale};
        for(int i=0;i<count;i++){Pad p=pads.get(i);a[0][2*i]=1;a[1][2*i+1]=1;a[2][2*i]=-(p.yMm()-cogY)/scale;a[2][2*i+1]=(p.xMm()-cogX)/scale;}
        for(int j=0;j<3;j++)for(int k=0;k<3;k++)for(int i=0;i<size;i++)gram[j][k]+=a[j][i]*a[k][i];
        double[] values=new double[size],correctionA=new double[size],correctionB=new double[size],residual=new double[3];double tolerance=1e-8*Math.max(1,Math.max(totalCapacity,Math.max(Math.abs(fx),Math.abs(fy))));boolean feasible=false;int iterations=0;
        for(;iterations<4000;iterations++){
            double[] work=new double[size];for(int i=0;i<size;i++)work[i]=values[i]+correctionA[i];double[] rhs=target.clone();for(int j=0;j<3;j++)for(int i=0;i<size;i++)rhs[j]-=a[j][i]*work[i];double[] multiplier=solve3(gram,rhs);if(multiplier==null)break;
            for(int i=0;i<size;i++){double projected=work[i];for(int j=0;j<3;j++)projected+=a[j][i]*multiplier[j];correctionA[i]=work[i]-projected;work[i]=projected+correctionB[i];}
            for(int i=0;i<count;i++){double magnitude=Math.hypot(work[2*i],work[2*i+1]),factor=magnitude>caps[i]?caps[i]/magnitude:1;values[2*i]=work[2*i]*factor;values[2*i+1]=work[2*i+1]*factor;correctionB[2*i]=work[2*i]-values[2*i];correctionB[2*i+1]=work[2*i+1]-values[2*i+1];}
            for(int j=0;j<3;j++){residual[j]=-target[j];for(int i=0;i<size;i++)residual[j]+=a[j][i]*values[i];}
            feasible=Arrays.stream(residual).allMatch(r->Double.isFinite(r)&&Math.abs(r)<=tolerance);
            if(feasible)break;
        }
        var rows=new ArrayList<Map<String,Object>>();double objective=0;
        for(int i=0;i<count;i++){double norm=Math.hypot(values[2*i],values[2*i+1]);feasible&=Double.isFinite(norm)&&norm<=caps[i]+1e-10;objective+=norm*norm;rows.add(Map.of("padId",pads.get(i).id(),"forceXkn",values[2*i],"forceYkn",values[2*i+1],"capacityKn",caps[i],"magnitudeKn",norm));}
        var result=new LinkedHashMap<String,Object>();result.put("feasible",feasible);result.put("status",feasible?"VERIFIED_PRIMAL_ALLOCATION":"NOT_PROVEN_WITHIN_ITERATION_LIMIT");result.put("method","DYKSTRA_AFFINE_COULOMB_DISKS");result.put("iterations",iterations+1);result.put("forceXResidualKn",residual[0]);result.put("forceYResidualKn",residual[1]);result.put("yawResidualKnM",residual[2]*scale/1000);result.put("forceToleranceKn",tolerance);result.put("yawToleranceKnM",tolerance*scale/1000);result.put("sumSquaredTangentialForcesKn2",objective);result.put("optimalityCertified",false);result.put("pads",rows);return result;
    }

    static Map<String,Object> beam(Beam b,List<Pad> pads,List<Map<String,Object>> reactions) {
        double length=b.endMm()-b.startMm(),ra=0,rb=0;var loads=new ArrayList<double[]>();Double transverse=null;
        for(String id:b.padIds()){Pad p=pads.stream().filter(a->a.id().equals(id)).findFirst().orElseThrow();double lateral=b.axis().equals("X")?p.yMm():p.xMm();if(transverse!=null&&Math.abs(lateral-transverse)>.001)throw bad("한 보 그룹의 패드는 검토 축과 평행한 같은 직선 위에 있어야 합니다. 비틀림·격자 보는 별도 모델이 필요합니다");transverse=lateral;double pos=(b.axis().equals("X")?p.xMm():p.yMm())-b.startMm();if(pos<0||pos>length)throw bad("보의 모든 연결 패드는 단순 지지 경간 안에 있어야 합니다");double force=((Number)reactions.stream().filter(r->r.get("id").equals(id)).findFirst().orElseThrow().get("reactionKn")).doubleValue()*1000;loads.add(new double[]{pos,force});ra+=force*(length-pos)/length;rb+=force*pos/length;}
        loads.sort(Comparator.comparingDouble(q->q[0]));double moment=0;for(double[] p:loads){double value=ra*p[0];for(double[] q:loads)if(q[0]<p[0])value-=q[1]*(p[0]-q[0]);moment=Math.max(moment,Math.abs(value));}
        double ei=b.elasticModulusMpa()*b.inertiaMm4(),lo=0,hi=length;for(int i=0;i<80;i++){double mid=(lo+hi)/2;if(beamSlope(mid,length,ei,loads)>0)lo=mid;else hi=mid;}double at=(lo+hi)/2,deflection=beamDeflection(at,length,ei,loads),stress=moment/b.sectionModulusMm3(),shear=Math.max(ra,rb)/b.shearAreaMm2();
        boolean pass=stress<=b.allowableBendingMpa()&&shear<=b.allowableShearMpa()&&deflection<=b.allowableDeflectionMm()&&Math.max(ra,rb)/1000<=b.endReactionCapacityKn()&&Double.isFinite(deflection)&&deflection/length<=.01;
        var out=new LinkedHashMap<String,Object>();out.put("id",b.id());out.put("spanMm",length);out.put("leftReactionKn",ra/1000);out.put("rightReactionKn",rb/1000);out.put("maxMomentKnM",moment/1e6);out.put("bendingStressMpa",stress);out.put("averageShearStressMpa",shear);out.put("maxDeflectionMm",deflection);out.put("maxDeflectionAtMm",at+b.startMm());out.put("smallDeflectionRatio",deflection/length);out.put("withinDeclaredLimits",pass);out.put("allowableBendingMpa",b.allowableBendingMpa());out.put("allowableShearMpa",b.allowableShearMpa());out.put("allowableDeflectionMm",b.allowableDeflectionMm());out.put("endReactionCapacityKn",b.endReactionCapacityKn());out.put("bendingUtilization",stress/b.allowableBendingMpa());out.put("shearUtilization",shear/b.allowableShearMpa());out.put("deflectionUtilization",deflection/b.allowableDeflectionMm());out.put("endReactionUtilization",Math.max(ra,rb)/1000/b.endReactionCapacityKn());out.put("pointLoads",loads.stream().map(q->Map.of("xMm",q[0]+b.startMm(),"forceKn",q[1]/1000)).toList());return out;
    }
    private static double beamDeflection(double x,double length,double ei,List<double[]> loads){double out=0;for(double[] p:loads){double a=p[0],b=length-a;if(x<=a)out+=p[1]*b*x*(length*length-b*b-x*x)/(6*length*ei);else{double y=length-x;out+=p[1]*a*y*(length*length-a*a-y*y)/(6*length*ei);}}return out;}
    private static double beamSlope(double x,double length,double ei,List<double[]> loads){double out=0;for(double[] p:loads){double a=p[0],b=length-a;if(x<=a)out+=p[1]*b*(length*length-b*b-3*x*x)/(6*length*ei);else{double y=length-x;out-=p[1]*a*(length*length-a*a-3*y*y)/(6*length*ei);}}return out;}
    private static double[] unit(double x,double y,double z){double norm=Math.sqrt(x*x+y*y+z*z);if(norm<.001)throw bad("라싱 두 점 사이 거리는 0.001mm 이상이어야 합니다");return new double[]{x/norm,y/norm,z/norm};}
    private static void point(Point p){number(p.xMm(),-100000,100000,"point.x");number(p.yMm(),-100000,100000,"point.y");number(p.zMm(),-30000,30000,"point.z");if(p.xMm()==null||p.yMm()==null||p.zMm()==null)throw bad("라싱 3차원 좌표가 필요합니다");}
    private static void identifier(String id,Set<String> seen,String label){if(id==null||!id.matches("[A-Za-z0-9_-]{1,40}")||!seen.add(id))throw bad(label+" 식별자는 중복 없는 영문/숫자/_/- 1~40자입니다");}
    private static void number(Double n,double min,double max,String label){if(n!=null&&(!Double.isFinite(n)||n<min||n>max))throw bad("수치 범위 오류: "+label);}
    private static void text(String s,String label){EngineeringCalculationService.text(s,label);}
    private static void evidence(String s,String key,Set<String> missing){if(s==null||s.isBlank())missing.add(key);else text(s,key);}
    private static org.springframework.web.server.ResponseStatusException bad(String message){return EngineeringCalculationService.bad(message);}
}
