import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {EquipmentRegistration} from '../src/EquipmentRegistration';
import {EquipmentClearancePanel} from '../src/EquipmentClearancePanel';
it('submits declared opening measurements and clears obsolete results after input changes',async()=>{
 const calculate=vi.fn(async()=>({status:'RECTANGULAR_OPENING_FITS',axes:'A=폭, B=높이',orientations:[],notes:[]}));
 render(<EquipmentClearancePanel code="40OT" calculate={calculate}/>);
 fireEvent.click(screen.getByRole('button',{name:'개구부 검토'}));
 for(const label of ['화물 길이 mm','화물 폭 mm','화물 높이 mm','개구부 A mm','개구부 B mm'])fireEvent.change(screen.getByRole('spinbutton',{name:label}),{target:{value:'1000'}});
 fireEvent.change(screen.getByRole('spinbutton',{name:'면당 작업 여유 mm'}),{target:{value:'0'}});
 fireEvent.change(screen.getByLabelText('개구부 확인 근거'),{target:{value:'measured drawing'}});
 fireEvent.click(screen.getByRole('button',{name:'OK'}));
 await screen.findByText('직사각형 개구부 통과 후보');
 expect(calculate).toHaveBeenCalledWith(expect.objectContaining({openingAmm:1000,clearancePerSideMm:0,evidence:'measured drawing'}));
 fireEvent.change(screen.getByRole('spinbutton',{name:'개구부 A mm'}),{target:{value:'900'}});
 await waitFor(()=>expect(screen.queryByText('직사각형 개구부 통과 후보')).toBeNull());
},20000);
it('prevents equipment registration when create permission is absent',()=>{
 render(<EquipmentRegistration disabled save={vi.fn()}/>);
 expect((screen.getByRole('button',{name:'장비 타입 등록'}) as HTMLButtonElement).disabled).toBe(true);
});
it('requires real specification and evidence instead of creating defaults',async()=>{
 const save=vi.fn();render(<EquipmentRegistration disabled={false} save={save}/>);
 fireEvent.click(screen.getByRole('button',{name:'장비 타입 등록'}));
 fireEvent.click(screen.getByRole('button',{name:'OK'}));
 await waitFor(()=>expect(screen.getByText('제원·규칙 확인 근거 (출처/명판/모델/상태)')).toBeTruthy());
 expect(save).not.toHaveBeenCalled();
 expect((screen.getByRole('spinbutton',{name:'Payload kg'}) as HTMLInputElement).value).toBe('');
});
