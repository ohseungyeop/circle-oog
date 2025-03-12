-- 연관 테이블들
DROP TABLE IF EXISTS vos_oog_calc_step1;
DROP TABLE IF EXISTS vos_oog_upld_dtl;
DROP TABLE IF EXISTS vos_oog_upld_mst;

CREATE TABLE vos_oog_upld_mst (
    PCK_ORD_SEQ INT AUTO_INCREMENT COMMENT '(PK) Upload Sequence(Upload 차수)',
    UPLD_DT DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT 'Upload Time',
    FILE_PATH VARCHAR(255) COMMENT 'Upload File Path',
    ORGN_FILE_NM VARCHAR(255) COMMENT 'Original File Name',
    EMAIL VARCHAR(255) NOT NULL COMMENT 'Upload User Email',
    ACCESS_TOKEN VARCHAR(255) NOT NULL COMMENT 'Upload User Token',
    CRE_DT DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT 'Created Time',
    PRIMARY KEY (PCK_ORD_SEQ)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT 'OOG Upload Master';

CREATE TABLE vos_oog_upld_dtl (
    PCK_ITM_SEQ INT(11) NOT NULL AUTO_INCREMENT COMMENT '(PK) Upload Item Sequence',
    -- -------------------------------------------------------------
    PCK_ORD_SEQ INT(11) NOT NULL COMMENT 'Upload Sequence(Upload 차수)',
    -- -------------------------------------------------------------
    PCK_NO INT(10) DEFAULT NULL COMMENT 'Packing Order No(display)',
    ITM_NM VARCHAR(255) DEFAULT NULL COMMENT 'Item Name',
    ITM_LEN DECIMAL(10,2) DEFAULT NULL COMMENT 'Item Length',
    ITM_WDT DECIMAL(10,2) DEFAULT NULL COMMENT 'Item Width',
    ITM_HGT DECIMAL(10,2) DEFAULT NULL COMMENT 'Item Height',
    BOX_LEN DECIMAL(10,2) DEFAULT NULL COMMENT 'Estimate Box Length',
    BOX_WDT DECIMAL(10,2) DEFAULT NULL COMMENT 'Estimate Box Width',
    BOX_HGT DECIMAL(10,2) DEFAULT NULL COMMENT 'Estimate Box Height',
    ITM_QTY INT(10) DEFAULT NULL COMMENT 'Item Quantity',
    ITM_CBM DECIMAL(12,4) DEFAULT NULL COMMENT 'Item Volume (CBM)',
    ITM_TP_NM VARCHAR(10) DEFAULT NULL COMMENT 'Item Type(일반/진공)',
    NET_WGT DECIMAL(12,2) DEFAULT NULL COMMENT 'Package Net Weight',
    GRS_WGT DECIMAL(12,2) DEFAULT NULL COMMENT 'Package Gross Weight',
    RMKS VARCHAR(255) DEFAULT NULL COMMENT 'Packing Remarks',
    -- -------------------------------------------------------------
    CRE_DT DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT 'Created Time',
    PRIMARY KEY (PCK_ITM_SEQ),
    KEY FK_PCK_ORD_SEQ (PCK_ORD_SEQ),
    CONSTRAINT FK_PCK_ORD_SEQ FOREIGN KEY (PCK_ORD_SEQ) REFERENCES vos_oog_upld_mst (PCK_ORD_SEQ) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='OOG Upload Details';

CREATE TABLE vos_oog_calc_step1 (
    PCK_CALC_SEQ INT NOT NULL AUTO_INCREMENT COMMENT '(PK) Item Sequence',
    -- -------------------------------------------------------------
    PCK_ORD_SEQ INT(11) NOT NULL COMMENT 'Upload Sequence(Upload 차수)',
    PCK_ITM_SEQ INT(11) NOT NULL COMMENT 'Upload Item Sequence',
    -- -------------------------------------------------------------
    PCK_NO INT(10) DEFAULT NULL COMMENT 'Packing Order No(display)',
    ITM_NM VARCHAR(255) DEFAULT NULL COMMENT 'Item Name',
    ITM_LEN DECIMAL(10,2) DEFAULT NULL COMMENT 'Item Length',
    ITM_WDT DECIMAL(10,2) DEFAULT NULL COMMENT 'Item Width',
    ITM_HGT DECIMAL(10,2) DEFAULT NULL COMMENT 'Item Height',
    BOX_LEN DECIMAL(10,2) DEFAULT NULL COMMENT 'Estimate Box Length',
    BOX_WDT DECIMAL(10,2) DEFAULT NULL COMMENT 'Estimate Box Width',
    BOX_HGT DECIMAL(10,2) DEFAULT NULL COMMENT 'Estimate Box Height',
    ITM_QTY INT(10) DEFAULT NULL COMMENT 'Item Quantity',
    ITM_CBM DECIMAL(12,4) DEFAULT NULL COMMENT 'Item Volume (CBM)',
    ITM_TP_NM VARCHAR(10) DEFAULT NULL COMMENT 'Item Type(일반/진공)',
    NET_WGT DECIMAL(12,2) DEFAULT NULL COMMENT 'Package Net Weight',
    GRS_WGT DECIMAL(12,2) DEFAULT NULL COMMENT 'Package Gross Weight',
    RMKS VARCHAR(255) DEFAULT NULL COMMENT 'Packing Remarks',
    -- -------------------------------------------------------------
    OVER_40T_YN ENUM('Y', 'N') DEFAULT 'N' COMMENT 'Weight 40t 초과 여부',
    OVER_60T_YN ENUM('Y', 'N') DEFAULT 'N' COMMENT 'Weight 60t 초과 여부',
    OVER_25T_YN ENUM('Y', 'N') DEFAULT 'N' COMMENT 'Weight 25t 초과 여부',
    OVER_WDT_YN ENUM('Y', 'N') DEFAULT 'N' COMMENT 'Width 2.438m 초과 여부',
    OVER_LEN_YN ENUM('Y', 'N') DEFAULT 'N' COMMENT 'Length 11.3m 초과 여부',
    OVER_HGT4_YN ENUM('Y', 'N') DEFAULT 'N' COMMENT '40fr Height 2.233m 초과 여부',
    OVER_HGT2_YN ENUM('Y', 'N') DEFAULT 'N' COMMENT '20fr Height 1.955m 초과 여부',
    FR4_YN ENUM('Y', 'N') DEFAULT 'N' COMMENT '40fr 여부',
    FR4_CNT INT(10) DEFAULT 0 COMMENT '40fr Count',
    -- -------------------------------------------------------------
    CALC_CBM DECIMAL(12,4) DEFAULT NULL COMMENT '(CALC)Box Volume (CBM)',
    -- -------------------------------------------------------------
    CRE_DT DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT 'Created Time',
    UPD_DT DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT 'Updated Time',
    -- -------------------------------------------------------------
    PRIMARY KEY (PCK_CALC_SEQ),
    KEY FK_PCK_ORD_SEQ2 (PCK_ORD_SEQ),
    CONSTRAINT FK_PCK_ORD_SEQ2 FOREIGN KEY (PCK_ORD_SEQ) REFERENCES vos_oog_upld_mst (PCK_ORD_SEQ) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='OOG Calculation Step1';
