import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {EngineeringChecksPanel} from '../src/EngineeringChecksPanel';
it('requires edit permission to record special or structural checks',async()=>{
 const api=vi.fn(async()=>[]);render(<EngineeringChecksPanel api={api as any} projectId="p1" planId="plan1" canRecord={false}/>);await waitFor(()=>expect(api).toHaveBeenCalled());expect(screen.queryByRole('button',{name:'전용 검토 계산·기록'})).toBeNull();expect(api.mock.calls[0][0]).toBe('/projects/p1/plans/plan1/engineering/checks');
});
it('does not fabricate stiffness and preserves inputs when the server rejects missing geometry',async()=>{
 const api=vi.fn(async(_path:string,options?:RequestInit)=>{if(options?.method==='POST')throw new Error('필수 보 제원 누락');return [];});
 render(<EngineeringChecksPanel api={api as any} projectId="p1" planId="plan1" canRecord/>);
 await waitFor(()=>expect(api).toHaveBeenCalled());expect((screen.getByRole('spinbutton',{name:'탄성계수 E MPa'}) as HTMLInputElement).value).toBe('');
 fireEvent.change(screen.getByLabelText('계산 목적·하중 조합·적용 범위'),{target:{value:'Declared load case'}});fireEvent.click(screen.getByRole('button',{name:'전용 검토 계산·기록'}));
 await screen.findByText('Error: 필수 보 제원 누락');const call=api.mock.calls.find(c=>c[1]?.method==='POST')!;
 expect(call[0]).toBe('/projects/p1/plans/plan1/engineering/checks/COUPLED_BEAM');expect(JSON.parse(call[1]?.body as string)).toMatchObject({input:{},reason:'Declared load case'});
},20000);
it('shows model exclusions and actual saved reaction results',async()=>{
 const api=vi.fn(async()=>[{id:'c1',created_at:'2026-10-14',detail:{checkKind:'COUPLED_BEAM',reason:'known case',input:{lengthMm:1000},result:{status:'DECLARED_MODEL_LIMITS_PASSED',maximumDeflectionMm:.06,supports:[{id:'S1',reactionKn:5,displacementMm:.05,pressureMpa:5,active:true}],notes:['No 3D certificate']}}}]);
 render(<EngineeringChecksPanel api={api as any} projectId="p1" planId="plan1" canRecord={false}/>);fireEvent.click(await screen.findByRole('button',{name:'계산 결과'}));await screen.findByText('No 3D certificate');expect(screen.getByText('최대 절대 처짐 mm')).toBeTruthy();expect(screen.getByText('S1')).toBeTruthy();
});
