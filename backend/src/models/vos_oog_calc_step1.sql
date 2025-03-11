DROP TABLE IF EXISTS vos_oog_calc_step1;

CREATE TABLE vos_oog_calc_step1 (
    PCK_CALC_SEQ INT NOT NULL AUTO_INCREMENT COMMENT '(PK) Item Sequence',
    PCK_ORD_SEQ INT(11) NOT NULL COMMENT 'Upload Sequence(Upload 차수)',
    PCK_ITM_SEQ INT(11) NOT NULL COMMENT 'Upload Item Sequence',
    PCK_NO INT(10) NOT NULL COMMENT 'Packing Order No(display)',
    ITM_NM VARCHAR(255) DEFAULT NULL COMMENT 'Item Name',
    PCK_LEN DECIMAL(10,2) DEFAULT NULL COMMENT 'Box Length',
    PCK_WDT DECIMAL(10,2) DEFAULT NULL COMMENT 'Box Width',
    PCK_HGT DECIMAL(10,2) DEFAULT NULL COMMENT 'Box Height',
    PCK_QTY INT(10) DEFAULT NULL COMMENT 'Box Quantity',
    PCK_WGT DECIMAL(12,2) DEFAULT NULL COMMENT 'Box Weight',
    PCK_CBM DECIMAL(12,4) DEFAULT NULL COMMENT 'Box Volume (CBM)',
    PCK_RMK VARCHAR(255) DEFAULT NULL COMMENT 'Packing Remarks',
    -- -------------------------------------------------------------
    OVER_40T_YN ENUM('Y', 'N') DEFAULT 'N' COMMENT 'Weight 40t 초과 여부',
    OVER_60T_YN ENUM('Y', 'N') DEFAULT 'N' COMMENT 'Weight 60t 초과 여부',
    OVER_25T_YN ENUM('Y', 'N') DEFAULT 'N' COMMENT 'Weight 25t 초과 여부',
    OVER_WDT_YN ENUM('Y', 'N') DEFAULT 'N' COMMENT 'Width 2.438m 초과 여부',
    OVER_LEN_YN ENUM('Y', 'N') DEFAULT 'N' COMMENT 'Length 11.3m 초과 여부',
    OVER_HGT4_YN ENUM('Y', 'N') DEFAULT 'N' COMMENT '40fr Height 2.233m 초과 여부',
    OVER_HGT2_YN ENUM('Y', 'N') DEFAULT 'N' COMMENT '20fr Height 1.955m 초과 여부',
    -- -------------------------------------------------------------
    ESTM_BOX_LEN DECIMAL(10,2) DEFAULT NULL COMMENT '(CALC)Estimate Box Length',
    ESTM_BOX_WDT DECIMAL(10,2) DEFAULT NULL COMMENT '(CALC)Estimate Box Width',
    ESTM_BOX_HGT DECIMAL(10,2) DEFAULT NULL COMMENT '(CALC)Estimate Box Height',
    CALC_CBM DECIMAL(12,4) DEFAULT NULL COMMENT '(CALC)Box Volume (CBM)',
    -- -------------------------------------------------------------
    CRE_DT DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT 'Created Time',
    UPD_DT DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT 'Updated Time',
    -- -------------------------------------------------------------
    PRIMARY KEY (PCK_CALC_SEQ),
    KEY FK_PCK_ORD_SEQ2 (PCK_ORD_SEQ),
    CONSTRAINT FK_PCK_ORD_SEQ2 FOREIGN KEY (PCK_ORD_SEQ) REFERENCES vos_oog_upld_mst (PCK_ORD_SEQ) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='OOG Calculation Step1';
