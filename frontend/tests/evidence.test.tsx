import {it,expect,vi} from 'vitest';
import {render,screen,waitFor,fireEvent} from '@testing-library/react';
import {EngineeringEvidencePanel} from '../src/EngineeringEvidencePanel';
it('keeps document recording unavailable without engineering edit permission',async()=>{
 const api=vi.fn(async()=>({items:[],missingCategories:['COG_MEASURED'],notes:[]}));
 render(<EngineeringEvidencePanel api={api as any} projectId="p1" planId="plan1" canRecord={false}/>);
 await screen.findByText(/현재 유효 문서가 없는 범주/);expect(api.mock.calls[0][0]).toBe('/projects/p1/plans/plan1/engineering/evidence');expect(screen.queryByRole('button',{name:'증빙 사본 등록'})).toBeNull();
});
it('downloads the scoped saved document and labels expiry without granting approval',async()=>{
 const download=vi.fn(async()=>{});const api=vi.fn(async()=>({items:[{id:'e1',fileName:'plate.pdf',sha256:'abc',expired:true,recordedDecision:'ACCEPTED',metadata:{category:'CARRIER_APPROVAL',subject:'FR-123',issuer:'issuer',reference:'ref',issuedOn:'2020-01-01',validUntil:'2020-12-31'}}],missingCategories:[],notes:[]}));
 render(<EngineeringEvidencePanel api={api as any} projectId="p1" planId="plan1" canRecord={false} download={download}/>);
 await screen.findByText('기간 경과');fireEvent.click(screen.getByRole('button',{name:'plate.pdf'}));await waitFor(()=>expect(download).toHaveBeenCalledWith('/projects/p1/plans/plan1/engineering/evidence/e1/file','plate.pdf'));expect(screen.getByText(/발행자 진위를 인증하지/)).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'검토 자료 묶음 ZIP'}));await waitFor(()=>expect(download).toHaveBeenCalledWith('/projects/p1/plans/plan1/engineering/evidence/package','oog-review-plan1.zip'));
});
