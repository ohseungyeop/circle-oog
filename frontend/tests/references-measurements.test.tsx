import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {EquipmentRegistration} from '../src/EquipmentRegistration';
import {EquipmentReferencesPanel} from '../src/EquipmentReferencesPanel';
import {MeasurementReconciliationPanel} from '../src/MeasurementReconciliationPanel';
it('copies reference dimensions while leaving actual evidence and planning ratios blank',async()=>{
 const save=vi.fn();render(<EquipmentRegistration disabled={false} save={save} loadReferences={async()=>({catalog:{candidates:[{code:'40GP',name:'source reference',length:12032,width:2352,height:2390,payload:26740,openWidth:false,openHeight:false}]}})}/>);
 fireEvent.click(screen.getByRole('button',{name:'장비 타입 등록'}));fireEvent.click(screen.getByRole('button',{name:'원본 참고 제원 불러오기'}));await screen.findByText('선사·모델·실제 명판이 확인되지 않은 일반 참고 표입니다');fireEvent.mouseDown(screen.getByRole('combobox',{name:'원본 참고 장비'}));fireEvent.click(await screen.findByText('40GP · source reference'));
 expect(Number((screen.getByRole('spinbutton',{name:'유효 적재 길이 mm'}) as HTMLInputElement).value.replace(/,/g,''))).toBe(12032);expect((screen.getByRole('spinbutton',{name:'계획 길이 비율'}) as HTMLInputElement).value).toBe('');expect((screen.getByLabelText('제원·규칙 확인 근거 (출처/명판/모델/상태)') as HTMLTextAreaElement).value).toBe('');expect(save).not.toHaveBeenCalled();
},20000);
it('shows database differences without writing equipment',async()=>{
 const api=vi.fn(async()=>({catalog:{sourceFile:'lashing.xlsx',sourceImageSha256:'hash',notes:[]},comparison:[{reference:{code:'40HC',length:12032,width:2352,height:2695,payload:26540},registered:true,differentFields:['height','payload']}]}));render(<EquipmentReferencesPanel api={api as any} version="1"/>);await screen.findByText('차이: 높이, Payload');expect(api.mock.calls.every(c=>!(c[1] as RequestInit)?.method)).toBe(true);
});
function measurementApi(){return vi.fn(async(path:string)=>path.endsWith('/context')?{cargos:[{id:'c1',itemNo:'C1',estimated:false}]}:path.endsWith('/calculations')?[]:path.endsWith('/evidence')?{items:[{id:'d1',fileName:'packed.pdf',expired:false,metadata:{category:'PACKED_DIMENSIONS',subject:'C1',reference:'D1'}}]}:[]);}
it('auto-selects a single target and document but never copies measured numbers or confirms identity',async()=>{
 render(<MeasurementReconciliationPanel api={measurementApi() as any} projectId="p1" planId="plan1" canRecord/>);await screen.findByText('C1 · D1 · packed.pdf');expect((screen.getByRole('spinbutton',{name:'실측 포장 길이 mm'}) as HTMLInputElement).value).toBe('');expect(screen.queryByText('직접 확인함')).toBeNull();
});
it('does not expose measurement recording without edit permission',async()=>{
 const api=measurementApi();render(<MeasurementReconciliationPanel api={api as any} projectId="p1" planId="plan1" canRecord={false}/>);await waitFor(()=>expect(api).toHaveBeenCalledTimes(4));expect(screen.queryByRole('button',{name:'실측 대조 기록'})).toBeNull();
});
