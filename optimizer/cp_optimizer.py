"""Conservative integer one-row bin packing. Costs and engineering approvals are outside this model."""
import math
try:
    from ortools.sat.python import cp_model
except ImportError:
    cp_model=None

def optimize_one_row(request,pack,orientation,assignment):
    baseline=pack(request,'MIN_EQUIPMENT')
    meta={'requestedMode':request.planningMode,'method':'FIRST_FIT_DECREASING','status':'HEURISTIC',
          'optimal':False,'bestBound':None,'equipmentObjective':baseline['equipmentCount'],
          'timeLimitSeconds':request.timeLimitSeconds,'fallbackReason':None,'model':'ONE_ROW_NO_STACKING',
          'conservativeRounding':'ceil cargo length mm / weight gram; floor capacities'}
    def fallback(reason,status='FALLBACK'):
        meta.update(fallbackReason=reason,status=status);baseline['optimization']=meta
        if reason:baseline['warnings'].insert(0,'CP-SAT 대신 휴리스틱 사용: '+reason)
        return baseline
    if request.planningMode=='HEURISTIC':return fallback('USER_SELECTED_HEURISTIC','HEURISTIC')
    if cp_model is None:return fallback('ORTOOLS_NOT_INSTALLED')
    pieces=[(c,p+1) for c in request.cargos for p in range(c.quantity)]
    if len(pieces)>128:return fallback('PIECE_LIMIT_128')
    equipment={e.code:e for e in request.equipment};rules={r.equipmentCode:r for r in request.rules}
    from main import ordered_equipment_codes
    codes=ordered_equipment_codes(equipment,rules)
    if any(max(c.length,c.width,c.height,c.grossWeight)>10000000 for c,_ in pieces) or any(max(e.length,e.width,e.height,e.payload)>10000000 for e in request.equipment):return fallback('INTEGER_MODEL_RANGE_LIMIT')
    caps={code:(math.floor(equipment[code].length*rules[code].usableLengthRatio),math.floor(equipment[code].payload*rules[code].planningWeightRatio*1000)) for code in codes}
    eligible=[];unassigned=[]
    for c,piece in pieces:
        choices=[];float_fit=False
        for code in codes:
            for length,width,rotated in orientation(c,equipment[code],rules[code]):
                float_fit=True
                if math.ceil(length)<=caps[code][0] and math.ceil(c.grossWeight*1000)<=caps[code][1]:choices.append((code,length,width,rotated,math.ceil(length),math.ceil(c.grossWeight*1000)))
        if float_fit and not choices:return fallback('ROUNDING_BOUNDARY_USE_EXACT_FLOAT_HEURISTIC')
        if choices:eligible.append((c,piece,choices))
        else:unassigned.append({'cargoId':c.id,'itemNo':c.itemNo,'piece':piece,'reason':'장비 계획 범위 초과. Multi-FR / Platform 공학 검토 필요'})
    n=len(eligible)
    if not n:
        baseline['optimization']={**meta,'method':'CP_SAT','status':'OPTIMAL','optimal':True,'bestBound':0,'equipmentObjective':0,'wallTimeSeconds':0};return baseline
    if n*sum(len(p[2]) for p in eligible)>18000:return fallback('MODEL_VARIABLE_LIMIT_18000')
    model=cp_model.CpModel();used=[];types={};options={}
    for box in range(n):
        used.append(model.new_bool_var(f'used_{box}'))
        for code in codes:types[box,code]=model.new_bool_var(f'type_{box}_{code}')
        model.add(sum(types[box,code] for code in codes)==used[box])
        if box:model.add(used[box-1]>=used[box])
    for i,(_,_,choices) in enumerate(eligible):
        for box in range(n):
            for oi,choice in enumerate(choices):
                var=model.new_bool_var(f'piece_{i}_{box}_{oi}');options[i,box,oi]=var;model.add(var<=types[box,choice[0]])
        model.add(sum(options[i,box,oi] for box in range(n) for oi in range(len(choices)))==1)
    for box in range(n):
        model.add(sum(options[i,box,oi] for i,(_,_,choices) in enumerate(eligible) for oi in range(len(choices)))>=used[box])
        model.add(sum(options[i,box,oi]*choice[4] for i,(_,_,choices) in enumerate(eligible) for oi,choice in enumerate(choices))<=sum(types[box,code]*caps[code][0] for code in codes))
        model.add(sum(options[i,box,oi]*choice[5] for i,(_,_,choices) in enumerate(eligible) for oi,choice in enumerate(choices))<=sum(types[box,code]*caps[code][1] for code in codes))
    model.minimize(sum(used));solver=cp_model.CpSolver();solver.parameters.max_time_in_seconds=request.timeLimitSeconds
    solver.parameters.num_search_workers=2;solver.parameters.random_seed=47
    status=solver.solve(model)
    if status not in (cp_model.OPTIMAL,cp_model.FEASIBLE):return fallback('SOLVER_'+solver.status_name(status))
    boxes=[]
    for box in range(n):
        if not solver.value(used[box]):continue
        code=next(code for code in codes if solver.value(types[box,code]));e,r=equipment[code],rules[code]
        item={'number':len(boxes)+1,'equipment':code,'length':e.length,'width':e.width,'height':e.height,'usableLength':e.length*r.usableLengthRatio,'payloadLimit':e.payload*r.planningWeightRatio,'ruleVersion':r.version,'usedLength':0,'weight':0,'assignments':[]}
        for i,(c,piece,choices) in enumerate(eligible):
            for oi,choice in enumerate(choices):
                if solver.value(options[i,box,oi]):
                    _,length,width,rotated,_,_=choice
                    item['assignments'].append(assignment(c,piece,item['usedLength'],(e.width-width)/2,length,width,rotated));item['usedLength']+=length;item['weight']+=c.grossWeight
        item['utilization']=round(item['usedLength']/item['usableLength']*100,1);boxes.append(item)
    if len(boxes)>baseline['equipmentCount']:return fallback('FEASIBLE_SOLUTION_WORSE_THAN_HEURISTIC')
    return {'objective':'MIN_EQUIPMENT','equipmentCount':len(boxes),'containers':boxes,'unassigned':unassigned,'status':'PRE_PLAN',
            'warnings':['CP-SAT 1열 장비 대수 최소화. 적층·2D 배치·비용 최적화 미지원.','최적 여부는 정수 반올림 1열 모델에만 적용됩니다. 지지점, 하중 분포, CoG, 라싱 및 선사 승인 별도 검토 필요.'],
            'optimization':{**meta,'method':'CP_SAT','status':solver.status_name(status),'optimal':status==cp_model.OPTIMAL,'bestBound':solver.best_objective_bound,'equipmentObjective':len(boxes),'wallTimeSeconds':round(solver.wall_time,4)}}
