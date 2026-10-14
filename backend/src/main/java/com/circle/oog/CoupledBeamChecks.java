package com.circle.oog;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Constant EI Euler-Bernoulli line beam on compression-only point springs. N, mm. */
public final class CoupledBeamChecks {
 public record Support(String id,Double xMm,Double stiffnessKnPerMm,Double capacityKn,Double areaMm2,Double allowablePressureMpa){}
 public record Load(String id,Double xMm,Double forceKn){}
 public record Input(Double lengthMm,Double elasticModulusMpa,Double inertiaMm4,Double sectionModulusMm3,Double shearAreaMm2,Double allowableBendingMpa,Double allowableShearMpa,Double allowableDeflectionMm,Boolean theoryApplicable,String evidence,List<Support> supports,List<Load> loads){}
 private static void require(boolean b,String message){if(!b)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,message);}
 private static boolean positive(Double v){return v!=null&&Double.isFinite(v)&&v>0&&v<=1e18;}
 private static boolean position(Double v,double l){return v!=null&&Double.isFinite(v)&&v>=0&&v<=l;}
 public static Map<String,Object> calculate(Input in){
  require(in!=null,"연성 보 입력이 필요합니다");require(positive(in.lengthMm())&&in.lengthMm()<=100000&&positive(in.elasticModulusMpa())&&positive(in.inertiaMm4())&&positive(in.sectionModulusMm3())&&positive(in.shearAreaMm2())&&positive(in.allowableBendingMpa())&&positive(in.allowableShearMpa())&&positive(in.allowableDeflectionMm()),"실제 보의 mm/N/MPa 제원과 허용값을 입력하세요");
  require(in.theoryApplicable()!=null&&in.evidence()!=null&&!in.evidence().isBlank()&&in.evidence().length()<=2000,"보 이론 적용 여부와 도면·강성·단면·하중 확인 근거가 필요합니다");
  require(in.supports()!=null&&in.supports().size()>=2&&in.supports().size()<=8&&in.loads()!=null&&!in.loads().isEmpty()&&in.loads().size()<=16,"압축 지지 2~8개와 하향 점하중 1~16개를 입력하세요");
  var xs=new TreeSet<Double>();xs.add(0d);xs.add(in.lengthMm());var ids=new HashSet<String>();var supportXs=new HashSet<Double>();
  for(var s:in.supports()){require(s!=null&&s.id()!=null&&!s.id().isBlank()&&s.id().length()<=100&&ids.add(s.id())&&position(s.xMm(),in.lengthMm())&&supportXs.add(s.xMm())&&positive(s.stiffnessKnPerMm())&&positive(s.capacityKn())&&positive(s.areaMm2())&&positive(s.allowablePressureMpa()),"중복/누락 지지점 또는 강성/용량/면적 입력 오류");xs.add(s.xMm());}
  ids.clear();for(var p:in.loads()){require(p!=null&&p.id()!=null&&!p.id().isBlank()&&p.id().length()<=100&&ids.add(p.id())&&position(p.xMm(),in.lengthMm())&&positive(p.forceKn()),"하향 점하중과 위치를 확인하세요");xs.add(p.xMm());}
  double[] x=xs.stream().mapToDouble(v->v).toArray();for(int i=1;i<x.length;i++)require(x[i]-x[i-1]>=.001,"구분되는 절점 간격은 0.001mm 이상이어야 합니다");
  int size=x.length*2;double ei=in.elasticModulusMpa()*in.inertiaMm4();require(Double.isFinite(ei),"EI 범위를 확인하세요");double[][] base=new double[size][size];double[] f=new double[size];
  for(int i=0;i<x.length-1;i++){double l=x[i+1]-x[i],a=ei/(l*l*l);double[][] k={{12,6*l,-12,6*l},{6*l,4*l*l,-6*l,2*l*l},{-12,-6*l,12,-6*l},{6*l,2*l*l,-6*l,4*l*l}};for(int r=0;r<4;r++)for(int c=0;c<4;c++)base[2*i+r][2*i+c]+=a*k[r][c];}
  double total=0,moment=0;for(var p:in.loads()){f[2*Arrays.binarySearch(x,p.xMm())]+=p.forceKn()*1000;total+=p.forceKn()*1000;moment+=p.forceKn()*1000*p.xMm();}
  double[] u=null;double forceResidual=0,momentResidual=0;int chosen=0;double tolerance=Math.max(1e-7,total*1e-8);
  // Enumerate contact sets, preferring all contacts. This is bounded at 2^8 sets.
  for(int mask=(1<<in.supports().size())-1;mask>0;mask--){if(Integer.bitCount(mask)<2)continue;double[][] k=new double[size][size];for(int i=0;i<size;i++)k[i]=base[i].clone();for(int j=0;j<in.supports().size();j++)if((mask&(1<<j))!=0){var s=in.supports().get(j);int dof=2*Arrays.binarySearch(x,s.xMm());k[dof][dof]+=s.stiffnessKnPerMm()*1000;}
   double[] candidate=solve(k,f);if(candidate==null)continue;boolean valid=true;double reactions=0,reactionMoment=0;
   for(int j=0;j<in.supports().size();j++){var s=in.supports().get(j);double w=candidate[2*Arrays.binarySearch(x,s.xMm())],reaction=s.stiffnessKnPerMm()*1000*w;boolean active=(mask&(1<<j))!=0;if(active&&reaction< -tolerance||!active&&reaction>tolerance)valid=false;if(active){reactions+=reaction;reactionMoment+=reaction*s.xMm();}}
   double residual=0;for(int i=0;i<size;i++){double value=-f[i];for(int j=0;j<size;j++)value+=k[i][j]*candidate[j];residual=Math.max(residual,Math.abs(value)/(i%2==0?1:Math.max(1,in.lengthMm())));}
   if(!valid||residual>tolerance||Math.abs(reactions-total)>tolerance||Math.abs(reactionMoment-moment)>tolerance*Math.max(1,in.lengthMm()))continue;
   u=candidate;chosen=mask;forceResidual=reactions-total;momentResidual=reactionMoment-moment;break;
  }
  var out=new LinkedHashMap<String,Object>();out.put("model","OOG-COUPLED-LINE-BEAM-1.0");out.put("planStatus","PRE_PLAN");out.put("carrierApproved",false);out.put("eligibleForTransportApproval",false);out.put("notes",List.of("일정 EI Euler-Bernoulli 1차원 보와 공면·초기 간극 0인 독립 압축 스프링의 연성 모델입니다. 하향 하중/변위 양수, 회전은 dw/dx입니다.","절점은 지지/점하중 위치에 배치하고 각 구간의 Hermite 3차식 극값까지 검사합니다. 평형/접촉 증거를 만족한 해만 반환하며 수치 실패를 물리적 불가능으로 단정하지 않습니다.","장비의 실제 전체 구조·횡방향 분담·비틀림·좌굴·피로·인양·동적/파랑 응답·국부 접합부는 계산하지 않습니다. 입력 하중은 해당 검토 하중 조합으로 별도 확인해야 합니다."));
  if(u==null){out.put("status","CONTACT_EQUILIBRIUM_NOT_PROVEN");return out;}
  var failures=new ArrayList<String>();var supports=new ArrayList<Map<String,Object>>();
  for(int j=0;j<in.supports().size();j++){var s=in.supports().get(j);double w=u[2*Arrays.binarySearch(x,s.xMm())],r=(chosen&(1<<j))!=0?Math.max(0,w*s.stiffnessKnPerMm()):0,pressure=r*1000/s.areaMm2();supports.add(Map.of("id",s.id(),"reactionKn",r,"displacementMm",w,"pressureMpa",pressure,"active",(chosen&(1<<j))!=0));if(r>s.capacityKn()*(1+1e-8)||pressure>s.allowablePressureMpa()*(1+1e-8))failures.add(s.id()+" 지지 용량/평균 면압 초과");}
  double maxMoment=0,maxShear=0,maxDeflection=0,maxRotation=0;var nodes=new ArrayList<Map<String,Object>>();
  for(int i=0;i<x.length;i++){nodes.add(Map.of("xMm",x[i],"displacementMm",u[2*i],"rotationRad",u[2*i+1]));maxRotation=Math.max(maxRotation,Math.abs(u[2*i+1]));}
  for(int i=0;i<x.length-1;i++){double l=x[i+1]-x[i],w1=u[2*i],t1=u[2*i+1],w2=u[2*i+2],t2=u[2*i+3];double a=w1,b=l*t1,c=-3*w1-2*l*t1+3*w2-l*t2,d=2*w1+l*t1-2*w2+l*t2;
   maxMoment=Math.max(maxMoment,Math.max(Math.abs(2*c/l/l*ei),Math.abs((2*c+6*d)/l/l*ei)));maxShear=Math.max(maxShear,Math.abs(6*d/l/l/l*ei));var points=new ArrayList<Double>(List.of(0d,1d));
   if(Math.abs(d)>1e-20){double disc=4*c*c-12*d*b;if(disc>=0){double z=Math.sqrt(disc);points.add((-2*c+z)/(6*d));points.add((-2*c-z)/(6*d));}double critical=-c/(3*d);if(critical>0&&critical<1)maxRotation=Math.max(maxRotation,Math.abs((b+2*c*critical+3*d*critical*critical)/l));}else if(Math.abs(c)>1e-20)points.add(-b/(2*c));
   for(double p:points)if(p>=0&&p<=1)maxDeflection=Math.max(maxDeflection,Math.abs(a+b*p+c*p*p+d*p*p*p));
  }
  double stress=maxMoment/in.sectionModulusMm3(),shear=maxShear/in.shearAreaMm2();if(stress>in.allowableBendingMpa()*(1+1e-8))failures.add("굽힘 응력 초과");if(shear>in.allowableShearMpa()*(1+1e-8))failures.add("평균 전단 응력 초과");if(maxDeflection>in.allowableDeflectionMm()*(1+1e-8))failures.add("처짐 초과");if(!in.theoryApplicable()||maxDeflection/in.lengthMm()>.01||maxRotation>.01)failures.add("작은 변위/회전 및 보 이론 적용 조건 확인 필요");
  out.put("status",failures.isEmpty()?"DECLARED_MODEL_LIMITS_PASSED":"DECLARED_MODEL_LIMITS_FAILED");out.put("failedChecks",failures);out.put("supports",supports);out.put("nodes",nodes);out.put("maximumMomentKnMm",maxMoment/1000);out.put("maximumShearKn",maxShear/1000);out.put("maximumDeflectionMm",maxDeflection);out.put("maximumRotationRad",maxRotation);out.put("bendingStressMpa",stress);out.put("averageShearStressMpa",shear);out.put("forceResidualKn",forceResidual/1000);out.put("momentResidualKnMm",momentResidual/1000);return out;
 }
 private static double[] solve(double[][] a,double[] f){
  int n=f.length;double[][] b=new double[n][n];double[] scale=new double[n],rhs=new double[n];for(int i=0;i<n;i++){if(!(a[i][i]>0)||!Double.isFinite(a[i][i]))return null;scale[i]=Math.sqrt(a[i][i]);rhs[i]=f[i]/scale[i];}for(int i=0;i<n;i++)for(int j=0;j<n;j++)b[i][j]=a[i][j]/scale[i]/scale[j];
  for(int i=0;i<n;i++){int pivot=i;for(int j=i+1;j<n;j++)if(Math.abs(b[j][i])>Math.abs(b[pivot][i]))pivot=j;if(Math.abs(b[pivot][i])<1e-12)return null;double[] row=b[i];b[i]=b[pivot];b[pivot]=row;double r=rhs[i];rhs[i]=rhs[pivot];rhs[pivot]=r;for(int j=i+1;j<n;j++){double ratio=b[j][i]/b[i][i];for(int k=i;k<n;k++)b[j][k]-=ratio*b[i][k];rhs[j]-=ratio*rhs[i];}}
  double[] v=new double[n];for(int i=n-1;i>=0;i--){double sum=rhs[i];for(int j=i+1;j<n;j++)sum-=b[i][j]*v[j];v[i]=sum/b[i][i];if(!Double.isFinite(v[i]))return null;}for(int i=0;i<n;i++)v[i]/=scale[i];return v;
 }
}
