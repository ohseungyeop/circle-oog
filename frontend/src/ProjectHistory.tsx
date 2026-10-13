import {Alert, Button, Card, Empty, Space, Table, Tabs, Tag} from 'antd';
import {useEffect, useState} from 'react';
import type {Plan} from './planTypes';
import './history.css';

export type HistoryPlan=Plan&{createdAt:string};
type History={audits:{id:number;action:string;actor:string;detail:unknown;createdAt:string}[];uploads:{id:string;originalName:string;mapping:unknown;createdAt:string}[];plans:HistoryPlan[];page:number;size:number};
export type Api=<T>(path:string,options?:RequestInit)=>Promise<T>;

export function ProjectHistory({projectId,api,download,openPlan}:{projectId:string;api:Api;download:(path:string,name:string)=>Promise<void>;openPlan:(plan:HistoryPlan)=>void}) {
    const [history,setHistory]=useState<History>();const [page,setPage]=useState(0);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
    const [refresh,setRefresh]=useState(0);
    useEffect(()=>{const abort=new AbortController();setBusy(true);setError('');
        api<History>(`/projects/${projectId}/history?page=${page}&size=20`,{signal:abort.signal})
            .then(value=>{if(!abort.signal.aborted)setHistory(value);}).catch(e=>{if(!abort.signal.aborted)setError(e instanceof Error?e.message:'조회 실패');}).finally(()=>{if(!abort.signal.aborted)setBusy(false);});
        return ()=>abort.abort();
    },[projectId,page,refresh]);
    async function file(path:string,name:string){setError('');try{await download(path,name);}catch(e){setError(e instanceof Error?e.message:'다운로드 실패');}}
    const stamp=(value:string)=>new Date(value).toLocaleString('ko-KR');
    return <Card title="프로젝트 원본 · 계획 · 감사 이력" loading={busy} extra={<Button onClick={()=>setRefresh(v=>v+1)}>새로고침</Button>}>
        <p>저장한 당시의 입력과 계획을 조회합니다. 현재 화물·규칙이 바뀌었다면 새 계획을 생성해 비교하세요.</p>
        {error&&<Alert type="error" showIcon message={error}/>}
        {!history?<Empty description="이력을 불러오는 중입니다"/>:<><Tabs items={[
            {key:'plans',label:'계획 사본',children:<Table rowKey="id" pagination={false} dataSource={history.plans} columns={[
                {title:'생성 시각',dataIndex:'createdAt',render:stamp},{title:'계획 ID',dataIndex:'id',ellipsis:true},
                {title:'시나리오',render:(_:unknown,p:HistoryPlan)=><Space wrap>{p.result.scenarios.map((s,i)=><Tag key={i}>{s.objective} · {s.equipmentCount}대</Tag>)}</Space>},
                {title:'조회 · 출력',render:(_:unknown,p:HistoryPlan)=><Space><Button onClick={()=>openPlan(p)}>계획 열기</Button><Button onClick={()=>file(`/projects/${projectId}/plans/${p.id}/export`,'oog-clp.xlsx')}>CLP Excel</Button></Space>}
            ]}/>},
            {key:'uploads',label:'Packing List 원본',children:<Table rowKey="id" pagination={false} dataSource={history.uploads} columns={[
                {title:'생성 시각',dataIndex:'createdAt',render:stamp},{title:'원본 파일명',dataIndex:'originalName'},
                {title:'매핑 근거',render:(_:unknown,u:History['uploads'][number])=><details><summary>단위 · 컬럼 확인</summary><pre className="history-json">{JSON.stringify(u.mapping,null,2)}</pre></details>},
                {title:'다운로드',render:(_:unknown,u:History['uploads'][number])=><Button onClick={()=>file(`/projects/${projectId}/imports/${u.id}/file`,u.originalName)}>원본 Excel</Button>}
            ]}/>},
            {key:'audits',label:'감사 기록',children:<Table rowKey="id" pagination={false} dataSource={history.audits} columns={[
                {title:'시각',dataIndex:'createdAt',render:stamp},{title:'처리',dataIndex:'action'},{title:'작성자',dataIndex:'actor'},
                {title:'상세',render:(_:unknown,a:History['audits'][number])=><details><summary>기록 확인</summary><pre className="history-json">{JSON.stringify(a.detail,null,2)}</pre></details>}
            ]}/>}
        ]}/><Space style={{marginTop:16}}><Button disabled={page===0} onClick={()=>setPage(v=>v-1)}>이전</Button><span>{page+1}페이지 · 목록별 최대 20건</span><Button disabled={history.plans.length<20&&history.uploads.length<20&&history.audits.length<20} onClick={()=>setPage(v=>v+1)}>다음</Button></Space></>}
    </Card>;
}
