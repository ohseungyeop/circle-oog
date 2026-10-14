import unittest
from unittest.mock import patch
from main import Request,optimize
class CpOptimizerTest(unittest.TestCase):
 def request(self,lengths=(6,5,3,2,2,2),**extra):
  return Request.model_validate({'cargos':[{'id':str(i),'itemNo':str(i),'quantity':1,'length':length,'width':1,'height':1,'grossWeight':1} for i,length in enumerate(lengths)],'equipment':[{'code':'40HC','length':10,'width':2,'height':2,'payload':100,'openWidth':False,'openHeight':False}],'rules':[{'equipmentCode':'40HC','usableLengthRatio':1,'planningWeightRatio':1,'maxOverWidth':0,'maxOverHeight':0}],**extra})
 def test_known_binpacking_improves_heuristic(self):
  heuristic=optimize(self.request(planningMode='HEURISTIC'))['scenarios'][0];result=optimize(self.request())['scenarios'][0]
  self.assertEqual(heuristic['equipmentCount'],3);self.assertEqual(result['equipmentCount'],2);self.assertTrue(result['optimization']['optimal']);self.assertEqual(result['optimization']['bestBound'],2)
  self.assertEqual(sorted(a['cargoId'] for b in result['containers'] for a in b['assignments']),[str(i) for i in range(6)])
  for box in result['containers']:
   self.assertLessEqual(box['weight'],box['payloadLimit']);self.assertLessEqual(box['usedLength'],box['usableLength'])
   for a,b in zip(box['assignments'],box['assignments'][1:]):self.assertLessEqual(a['x']+a['length'],b['x'])
 def test_large_case_explicit_fallback(self):
  result=optimize(self.request([1]*129))['scenarios'][0];self.assertEqual(result['optimization']['fallbackReason'],'PIECE_LIMIT_128');self.assertFalse(result['optimization']['optimal'])
 def test_package_unavailable_fallback(self):
  with patch('cp_optimizer.cp_model',None):result=optimize(self.request())['scenarios'][0]
  self.assertEqual(result['optimization']['fallbackReason'],'ORTOOLS_NOT_INSTALLED')
 def test_unassigned_and_payload_not_hidden(self):
  request=self.request([11,5,5]);request.cargos[1].grossWeight=101
  result=optimize(request)['scenarios'][0];self.assertEqual(len(result['unassigned']),2);self.assertEqual(sum(len(b['assignments']) for b in result['containers']),1)
 def test_rotation_and_decimal_rounding_boundaries(self):
  request=self.request([3]);request.cargos[0].width=1;request.cargos[0].length=1;request.cargos[0].width=3;request.cargos[0].rotationAllowed=True
  result=optimize(request)['scenarios'][0];self.assertTrue(result['containers'][0]['assignments'][0]['rotated'])
  request=self.request([9.5]);request.equipment[0].length=9.5
  result=optimize(request)['scenarios'][0];self.assertEqual(result['optimization']['fallbackReason'],'ROUNDING_BOUNDARY_USE_EXACT_FLOAT_HEURISTIC');self.assertEqual(result['equipmentCount'],1)
 def test_timeout_unknown_explicit_fallback(self):
  from cp_optimizer import cp_model
  with patch.object(cp_model.CpSolver,'solve',return_value=cp_model.UNKNOWN):result=optimize(self.request())['scenarios'][0]
  self.assertEqual(result['optimization']['fallbackReason'],'SOLVER_UNKNOWN');self.assertFalse(result['optimization']['optimal'])
 def test_additional_registered_types(self):
  for mode in ('AUTO','HEURISTIC'):
   for code in ('20OT','40PLATFORM'):
    data=self.request([3,3],planningMode=mode).model_dump()
    data['equipment'][0]['code']=code;data['rules'][0]['equipmentCode']=code
    result=optimize(Request.model_validate(data))['scenarios'][0]
    self.assertEqual(len(result['unassigned']),0)
    self.assertEqual(sum(len(b['assignments']) for b in result['containers']),2)
 def test_additional_type_respects_open_height(self):
  data=self.request([3]).model_dump();data['cargos'][0]['height']=3
  data['equipment'][0].update(code='20OT',openHeight=True)
  data['rules'][0].update(equipmentCode='20OT',maxOverHeight=1)
  self.assertEqual(len(optimize(Request.model_validate(data))['scenarios'][0]['unassigned']),0)
  data['equipment'][0]['openHeight']=False
  self.assertEqual(len(optimize(Request.model_validate(data))['scenarios'][0]['unassigned']),1)
if __name__=='__main__':unittest.main()
