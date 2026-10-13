package com.fms.security;

import java.security.Principal;
import java.util.List;
import lombok.Builder;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

@Getter
public final class FmsPrincipal implements Principal {
    private final String username;
    private final Long userId;
    private final Long tenantId;
    private final Long roleId;
    private final Integer priority;
    private final String roleCode;
    private final List<Long> bpIds;
    private final Long defaultBpId;
    private final List<GrantedAuthority> authorities;

    @Builder
    public FmsPrincipal(String username,Long userId,Long tenantId,Long roleId,Integer priority,
                        String roleCode,List<Long> bpIds,Long defaultBpId) {
        if(username==null||username.isBlank()||userId==null||userId<=0||tenantId==null||tenantId<=0
            ||roleId==null||roleId<=0||roleCode==null||!roleCode.matches("[A-Z][A-Z0-9_]{0,49}")
            ||(priority!=null&&priority<0))throw new IllegalArgumentException("Invalid authenticated account identity");
        if(bpIds!=null&&bpIds.stream().anyMatch(id->id==null||id<=0))
            throw new IllegalArgumentException("Invalid authenticated partner assignments");
        List<Long> partners=bpIds==null?List.of():List.copyOf(bpIds);
        if(partners.stream().anyMatch(id->id<=0)||defaultBpId!=null&&!partners.contains(defaultBpId))
            throw new IllegalArgumentException("Invalid authenticated partner assignments");
        this.username=username;this.userId=userId;this.tenantId=tenantId;this.roleId=roleId;
        this.priority=priority==null?999:priority;this.roleCode=roleCode;
        this.bpIds=partners.stream().distinct().sorted().toList();this.defaultBpId=defaultBpId;
        this.authorities=List.of(new SimpleGrantedAuthority("ROLE_"+roleCode));
    }
    @Override public String getName(){return username;}
    @Override public String toString(){return "FmsPrincipal";}
}
