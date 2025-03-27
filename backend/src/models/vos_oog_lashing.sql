DROP TABLE IF EXISTS vos_oog_lashing;

CREATE TABLE vos_oog_lashing (
    PCK_LASH_SEQ INT NOT NULL AUTO_INCREMENT COMMENT '(PK) Lashing Item Sequence',
-- ----------------S: user-defined
    PCK_ORD_SEQ INT(10) NOT NULL COMMENT 'Upload Sequence(Upload 차수)',
    CLP_NO INT(10) NOT NULL COMMENT 'Container Loading Plan No',
    TPSZ VARCHAR(10) DEFAULT '40FR' COMMENT 'Dry40(40HQ), Flatrack(40FR), Dry20(20DR)',
    X_COUNT INT(2) DEFAULT NULL COMMENT 'X Count',
    Y_COUNT INT(2) DEFAULT NULL COMMENT 'Y Count',
    LASH_DATA JSON DEFAULT NULL COMMENT 'Lashing Json Data',
-- ----------------E: user-defined
    CRE_DT DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT 'Created Time',
    UPD_DT DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT 'Updated Time',
    PRIMARY KEY (PCK_LASH_SEQ)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='OOG Container Lashing Result';
