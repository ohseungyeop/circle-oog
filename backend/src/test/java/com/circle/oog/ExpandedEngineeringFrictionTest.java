package com.circle.oog;

import org.junit.jupiter.api.Test;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

/** Independent primal checks: do not trust solver-reported residuals or disk magnitudes. */
class ExpandedEngineeringFrictionTest {
 final List<ExpandedEngineeringService.Pad> pads=List.of(pad("A",0,0),pad("B",1000,0),pad("C",0,1000),pad("D",1000,1000));
 static ExpandedEngineeringService.Pad pad(String id,double x,double y){return new ExpandedEngineeringService.Pad(id,x,y,100d,10000d,10d,1000d);}
 List<Map<String,Object>> reactions(double...normal){var out=new ArrayList<Map<String,Object>>();for(int i=0;i<normal.length;i++)out.add(Map.of("id",pads.get(i).id(),"reactionKn",normal[i]));return out;}
 Map<String,Object> solve(double fx,double fy,double yaw,double...normal){return ExpandedEngineeringService.solveFriction(pads,reactions(normal),.5,fx,fy,yaw,500,500);}
 @SuppressWarnings("unchecked") void witness(Map<String,Object> r,double fx,double fy,double yaw,double...normal){
  assertThat(r).containsEntry("feasible",true).containsEntry("optimalityCertified",false).containsEntry("status","VERIFIED_PRIMAL_ALLOCATION");
  var rows=(List<Map<String,Object>>)r.get("pads");assertThat(rows).hasSize(pads.size());double rx=fx,ry=fy,rz=yaw;
  for(int i=0;i<pads.size();i++){var p=pads.get(i);var row=rows.stream().filter(v->v.get("padId").equals(p.id())).findFirst().orElseThrow();double tx=((Number)row.get("forceXkn")).doubleValue(),ty=((Number)row.get("forceYkn")).doubleValue();assertThat(Double.isFinite(tx)&&Double.isFinite(ty)).isTrue();assertThat(Math.hypot(tx,ty)).isLessThanOrEqualTo(.5*normal[i]+1e-9);rx+=tx;ry+=ty;rz+=(p.xMm()-500)*ty-(p.yMm()-500)*tx;}
  double forceTolerance=((Number)r.get("forceToleranceKn")).doubleValue(),yawTolerance=((Number)r.get("yawToleranceKnM")).doubleValue()*1000;
  assertThat(Math.abs(rx)).isLessThanOrEqualTo(forceTolerance+1e-12);assertThat(Math.abs(ry)).isLessThanOrEqualTo(forceTolerance+1e-12);assertThat(Math.abs(rz)).isLessThanOrEqualTo(yawTolerance+1e-9);
 }
 @Test void centeredPureForceHasVerifiedAllocation(){var r=solve(2,0,0,2,2,2,2);witness(r,2,0,0,2,2,2,2);}
 @Test void zeroLoadsAndZeroNormalContactNeedNoFriction(){var r=solve(0,0,0,0,0,0,0);witness(r,0,0,0,0,0,0,0);}
 @Test void feasiblePureYawUsesOppositeTangentialForces(){var r=solve(0,0,1000,2,2,2,2);witness(r,0,0,1000,2,2,2,2);}
 @Test void yawAboveIndependentNecessaryBoundCannotPass(){var r=solve(0,0,3000,2,2,2,2);assertThat(r).containsEntry("feasible",false).containsEntry("status","NECESSARY_FRICTION_BOUND_EXCEEDED").containsEntry("optimalityCertified",false);}
 @Test void simultaneousForceAndYawWithKnownDiskBoundaryWitness(){
  // tx=-0.6 at every pad; ty=+0.8 on x=0 and -0.8 on x=1000 is an exact feasible witness.
  var r=solve(2.4,0,1600,2,2,2,2);witness(r,2.4,0,1600,2,2,2,2);
 }
 @Test void aggregateForceAndYawBoundsAloneAreNotSufficient(){
  // |Fx|=sum(mu*N) forces all four tx=-1 and every ty=0; their net yaw is necessarily zero.
  var r=solve(4,0,500,2,2,2,2);assertThat(r).containsEntry("feasible",false).containsEntry("optimalityCertified",false);assertThat(r.get("status")).isEqualTo("NOT_PROVEN_WITHIN_ITERATION_LIMIT");
 }
 @Test void exactPureForceCapacityBoundaryAndSignReversal(){witness(solve(4,0,0,2,2,2,2),4,0,0,2,2,2,2);witness(solve(-4,0,0,2,2,2,2),-4,0,0,2,2,2,2);}
 @Test void unloadedPadCannotProvideTangentialResistance(){
  var r=solve(.3,.2,50,0,2,2,2);witness(r,.3,.2,50,0,2,2,2);
 }
 @Test void noNormalLoadCannotProvideForceOrYaw(){assertThat(solve(.01,0,0,0,0,0,0)).containsEntry("feasible",false);assertThat(solve(0,0,1,0,0,0,0)).containsEntry("feasible",false);}
 @Test void translationOfWorldOriginPreservesFrictionFeasibility(){
  var shifted=pads.stream().map(p->pad(p.id(),p.xMm()+12000,p.yMm()+7000)).toList();var result=ExpandedEngineeringService.solveFriction(shifted,reactions(2,2,2,2),.5,2,1,300,12500,7500);witness(result,2,1,300,2,2,2,2);
 }
}
