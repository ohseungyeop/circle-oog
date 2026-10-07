DROP TABLE IF EXISTS vos_oog_lgn_lnk;

-- 이미 사용한 이메일 로그인 링크 (재사용 방지). 만료된 행은 로그인 시 자동 삭제됩니다.
CREATE TABLE vos_oog_lgn_lnk (
    LNK_JTI VARCHAR(64) NOT NULL COMMENT '(PK) Login Link ID',
    USR_EML VARCHAR(255) NOT NULL COMMENT 'User Email',
    EXP_DT DATETIME NOT NULL COMMENT 'Link Expire Time',
    CRE_DT DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Used Time',
    PRIMARY KEY (LNK_JTI)
) COMMENT = 'OOG Used Login Links';
