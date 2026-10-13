from typing import Literal
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="Circle OOG Optimizer", version="0.1.0")


class Cargo(BaseModel):
    id: str
    itemNo: str
    quantity: int = Field(ge=1, le=10000)
    length: float = Field(gt=0)
    width: float = Field(gt=0)
    height: float = Field(gt=0)
    grossWeight: float = Field(gt=0)
    rotationAllowed: bool = False


class Equipment(BaseModel):
    code: str
    length: float = Field(gt=0)
    width: float = Field(gt=0)
    height: float = Field(gt=0)
    payload: float = Field(gt=0)
    openWidth: bool
    openHeight: bool


class Rule(BaseModel):
    equipmentCode: str
    usableLengthRatio: float = Field(gt=0, le=1)
    planningWeightRatio: float = Field(gt=0, le=1)
    maxOverWidth: float = Field(ge=0)
    maxOverHeight: float = Field(ge=0)
    version: int = 0


class Request(BaseModel):
    cargos: list[Cargo] = Field(max_length=10000)
    equipment: list[Equipment]
    rules: list[Rule]


def orientation(c, e, r):
    for length, width, rotated in [(c.length, c.width, False)] + ([(c.width, c.length, True)] if c.rotationAllowed else []):
        if (length <= e.length * r.usableLengthRatio and
            c.grossWeight <= e.payload * r.planningWeightRatio and
            width <= e.width + (r.maxOverWidth if e.openWidth else 0) and
            c.height <= e.height + (r.maxOverHeight if e.openHeight else 0)):
            yield length, width, rotated


def pack(request, objective):
    equipment = {e.code: e for e in request.equipment}
    rules = {r.equipmentCode: r for r in request.rules}
    containers, unassigned = [], []
    expanded = [(c, piece + 1) for c in request.cargos for piece in range(c.quantity)]
    expanded.sort(key=lambda p: (p[0].width > 2400, p[0].length * p[0].width, p[0].grossWeight), reverse=True)
    for c, piece in expanded:
        choices = [code for code in ["40HC", "40OT", "40FR", "20FR", "20GP"]
                   if code in equipment and code in rules and list(orientation(c, equipment[code], rules[code]))]
        if not choices:
            unassigned.append({"cargoId": c.id, "itemNo": c.itemNo, "piece": piece, "reason": "장비 계획 범위 초과. Multi-FR / Platform 공학 검토 필요"})
            continue
        placed = False
        if objective == "MIN_EQUIPMENT":
            for box in containers:
                e, r = equipment[box["equipment"]], rules[box["equipment"]]
                if box["equipment"] not in choices:
                    continue
                for length, width, rotated in orientation(c, e, r):
                    # 보수적 1열 배치: 폭 초과 화물도 길이 방향으로 분리하며 적층하지 않는다.
                    if box["usedLength"] + length <= e.length * r.usableLengthRatio and box["weight"] + c.grossWeight <= e.payload * r.planningWeightRatio:
                        box["assignments"].append(assignment(c, piece, box["usedLength"], (e.width - width) / 2, length, width, rotated))
                        box["usedLength"] += length
                        box["weight"] += c.grossWeight
                        placed = True
                        break
                if placed:
                    break
        if not placed:
            code = choices[0]
            e, r = equipment[code], rules[code]
            length, width, rotated = next(orientation(c, e, r))
            containers.append({"number": len(containers) + 1, "equipment": code, "length": e.length,
                "width": e.width, "height": e.height, "usableLength": e.length*r.usableLengthRatio,
                "payloadLimit": e.payload*r.planningWeightRatio, "ruleVersion": r.version,
                "usedLength": length, "weight": c.grossWeight,
                "assignments": [assignment(c, piece, 0, (e.width-width)/2, length, width, rotated)]})
    for box in containers:
        box["utilization"] = round(box["usedLength"] / box["usableLength"] * 100, 1)
    return {"objective": objective, "equipmentCount": len(containers), "containers": containers,
            "unassigned": unassigned, "status": "PRE_PLAN",
            "warnings": ["휴리스틱 1열 배치. 최적해 보장 없음. 적층 미지원.",
                         "지지점, 하중 분포, CoG, 라싱 및 선사 승인은 별도 검토해야 합니다."]}


def assignment(c, piece, x, y, length, width, rotated):
    return {"cargoId": c.id, "itemNo": c.itemNo, "piece": piece, "x": x, "y": y, "z": 0,
            "length": length, "width": width, "height": c.height, "weight": c.grossWeight,
            "rotated": rotated, "locked": False}


@app.post("/optimize")
def optimize(request: Request):
    if sum(c.quantity for c in request.cargos) > 20000:
        from fastapi import HTTPException
        raise HTTPException(422, "최대 20,000개 포장까지 지원합니다")
    missing = set(e.code for e in request.equipment) - set(r.equipmentCode for r in request.rules)
    if missing:
        from fastapi import HTTPException
        raise HTTPException(422, "장비 규칙 누락")
    return {"algorithm": "conservative-first-fit-decreasing-v1", "scenarios":
            [pack(request, "MIN_EQUIPMENT"), pack(request, "EASY_HANDLING")]}


@app.get("/health")
def health():
    return {"status": "UP"}
