DROP TABLE IF EXISTS vos_oog_usr;

CREATE TABLE vos_oog_usr (
    USR_SEQ INT AUTO_INCREMENT NOT NULL COMMENT '(PK) User Sequence',
-- ----------------S: user-defined
    USR_EML VARCHAR(255) NOT NULL COMMENT 'User Email',
    USR_STS VARCHAR(1) DEFAULT 'I' COMMENT 'User Status A(ctive), I(nactive), S(uspended)',
    EML_VRF_YN VARCHAR(1) DEFAULT 'N' COMMENT 'Email Verified',
-- ----------------E: user-defined
    CRE_DT DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Created Time',
    UPD_DT DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Updated Time',
    PRIMARY KEY (USR_SEQ),
    CONSTRAINT UNIQUE_USR_EML UNIQUE (USR_EML)
) COMMENT = 'OOG User Information';
