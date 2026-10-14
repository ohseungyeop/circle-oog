package com.circle.oog;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Compare independently transcribed measurements, without certifying the document or its issuer. */
public final class MeasurementReconciliation {
 public static List<String> fields(String target){return switch(target){case "CARGO"->List.of("length","width","height","grossWeight");case "CALCULATION"->List.of("weightKg","cogXmm","cogYmm","cogZmm");default->throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"화물 또는 수치 계산 대상을 선택하세요");};}
 public static Map<String,Object> compare(String target,JsonNode measured,JsonNode expected,boolean estimated,Boolean subjectConfirmed){
  var fields=fields(target);if(measured==null||!measured.isObject()||subjectConfirmed==null)throw bad();var names=new HashSet<String>();measured.fieldNames().forEachRemaining(names::add);if(!names.equals(new HashSet<>(fields)))throw bad();
  boolean match=true,incomplete=false;var differences=new ArrayList<Map<String,Object>>();
  for(String field:fields){var actual=measured.path(field);if(!actual.isNumber()||!Double.isFinite(actual.asDouble())||actual.asDouble()<0||actual.asDouble()>1000000||!field.startsWith("cog")&&actual.asDouble()==0)throw bad();var planned=expected.path(field);var row=new LinkedHashMap<String,Object>();row.put("field",field);row.put("measured",actual);if(!planned.isNumber()||!Double.isFinite(planned.asDouble())){incomplete=true;row.put("saved",null);row.put("matches",false);}else{boolean same=actual.decimalValue().compareTo(planned.decimalValue())==0;match&=same;row.put("saved",planned);row.put("delta",actual.decimalValue().subtract(planned.decimalValue()));row.put("matches",same);}differences.add(row);}
  String status=!subjectConfirmed?"DOCUMENT_SUBJECT_REVIEW_REQUIRED":incomplete?"SAVED_INPUT_INCOMPLETE":estimated?"ESTIMATED_SOURCE_REQUIRES_NEW_RECORD":!match?"MISMATCH_REQUIRES_NEW_RECORD":"MATCHES_DECLARED_MEASUREMENTS";
  return Map.of("status",status,"targetType",target,"differences",differences,"planStatus","PRE_PLAN","carrierApproved",false,"documentAuthenticityVerified",false,"autoApplied",false,"notes",List.of("측정값은 사용자가 실제 증빙을 읽어 독립 입력한 값입니다. 이 기능은 PDF/사진 내용이나 발행자 진위를 자동 판독·인증하지 않습니다.","저장 계획/계산과 mm/kg 수치를 정확히 비교하며 허용 오차를 임의로 적용하지 않습니다. 추정값이거나 값이 다르면 기존 사본을 고치지 말고 확인한 값으로 새 계획/계산을 만드세요."));
 }
 private static ResponseStatusException bad(){return new ResponseStatusException(HttpStatus.BAD_REQUEST,"대상별 측정값 전체를 mm/kg 유한 수치로 입력하고 증빙 대상 확인 여부를 선택하세요");}
}
