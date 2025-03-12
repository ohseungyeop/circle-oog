DROP TABLE IF EXISTS vos_oog_cntr_mst;


CREATE TABLE `vos_oog_cntr_mst` (
  `CRR_CD` varchar(4) NOT NULL COMMENT '(PK) Carrier Code',
  `CNTR_TPSZ_CD` varchar(4) NOT NULL COMMENT '(PK) Container Type Code ',
  `CNTR_LEN` decimal(7,2) DEFAULT NULL COMMENT 'Container Length',
  `CNTR_LEN_PCTG` decimal(5,2) DEFAULT NULL COMMENT 'Container Length Percentage',
  `CNTR_WDT` decimal(4,0) DEFAULT NULL COMMENT 'Container Width',
  `CNTR_WDT_PCTG` decimal(5,2) DEFAULT NULL COMMENT 'Container Width Percentage',
  `CNTR_HGT` decimal(4,0) DEFAULT NULL COMMENT 'Container Height',
  `CNTR_HGT_PCTG` decimal(5,2) DEFAULT NULL COMMENT 'Container Height  Percentage',
  `CNTR_WGT` decimal(12,2) DEFAULT NULL COMMENT 'Container Net Weight',
  `CNTR_WGT_PCTG` decimal(5,2) DEFAULT NULL COMMENT 'Container Net Weight Percentage',
  `CRE_DT` datetime DEFAULT current_timestamp() COMMENT 'Created Time',
  `UPD_DT` datetime DEFAULT current_timestamp() COMMENT 'Updated Time',
  PRIMARY KEY (`CRR_CD`,`CNTR_TPSZ_CD`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='OOG Container master';