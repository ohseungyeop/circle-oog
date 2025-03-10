DROP TABLE IF EXISTS vos_oog_estm_bx_sz;

CREATE TABLE vos_oog_estm_bx_sz (
  ESTM_BX_SZ_NO varchar(10) NOT NULL COMMENT '(PK) ESTM_BX_SZ_NO',
  LEN_WDT_TY_CD varchar(1) DEFAULT NULL COMMENT 'Type Code L(Length), H(Height), W(Width)',
  PCK_FM_NUM int(11) DEFAULT NULL COMMENT 'Starting package',
  PCK_TO_NUM int(11) DEFAULT NULL COMMENT 'Ending package number',
  PCK_BX_NUM int(11) DEFAULT NULL COMMENT 'Package box number',
  PCK_CNTR_PICT varchar(1000) DEFAULT NULL COMMENT 'Container image path',
  PCK_CNTR_LSG_PICT varchar(1000) DEFAULT NULL COMMENT 'Container lashing image path',
  UPD_DT datetime DEFAULT current_timestamp() COMMENT 'Updated Time',
  UPD_USR_NM varchar(255) DEFAULT NULL COMMENT 'Updated Username',
  CRE_DT datetime DEFAULT current_timestamp() COMMENT 'Created Time',
  CRE_USR_NM varchar(255) DEFAULT NULL COMMENT 'Created Username',
  PRIMARY KEY (ESTM_BX_SZ_NO)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='OOG Estm Boxing Size';