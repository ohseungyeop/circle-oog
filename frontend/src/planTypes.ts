export type Assignment={cargoId:string;itemNo:string;piece:number;x:number;y:number;z:number;length:number;width:number;height:number;locked:boolean;rotated?:boolean};
export type Box={number:number;equipment:string;length:number;width:number;height:number;weight:number;utilization:number;assignments:Assignment[]};
export type Scenario={objective:string;equipmentCount:number;containers:Box[];unassigned:{itemNo:string;piece:number;reason:string}[];warnings:string[];optimization?:{method:string;status:string;optimal:boolean;fallbackReason?:string;bestBound?:number}};
export type RuleSelection={carrier:string;effectiveDate:string;fallbackPolicy:string;versions:{equipmentCode:string;carrier:string;version:number;source:string;usedFallback:boolean}[]};
export type Plan={id:string;sourcePlanId?:string;result:{scenarios:Scenario[];ruleSelection?:RuleSelection}};
